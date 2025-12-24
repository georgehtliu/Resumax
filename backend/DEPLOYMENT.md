# Deployment Guide

## ChromaDB Deployment Options

ChromaDB is used for storing vector embeddings of resume bullets. Here are deployment strategies:

### Option 1: Persistent Volume (Recommended for Docker/Kubernetes)

**Best for:** Docker, Kubernetes, cloud platforms with volume support

1. **Mount a persistent volume** to store ChromaDB data:
   ```bash
   # Set environment variable
   export CHROMA_DB_PATH=/app/data/chroma_db
   ```

2. **Docker Compose example:**
   ```yaml
   services:
     backend:
       image: your-backend-image
       volumes:
         - chroma_data:/app/data/chroma_db
       environment:
         - CHROMA_DB_PATH=/app/data/chroma_db
         - OPENAI_API_KEY=${OPENAI_API_KEY}
   
   volumes:
     chroma_data:
   ```

3. **Kubernetes example:**
   ```yaml
   apiVersion: v1
   kind: PersistentVolumeClaim
   metadata:
     name: chroma-db-pvc
   spec:
     accessModes:
       - ReadWriteOnce
     resources:
       requests:
         storage: 10Gi
   ---
   apiVersion: apps/v1
   kind: Deployment
   metadata:
     name: resumax-backend
   spec:
     template:
       spec:
         containers:
         - name: backend
           image: your-backend-image
           env:
           - name: CHROMA_DB_PATH
             value: /app/data/chroma_db
           volumeMounts:
           - name: chroma-storage
             mountPath: /app/data/chroma_db
         volumes:
         - name: chroma-storage
           persistentVolumeClaim:
             claimName: chroma-db-pvc
   ```

**Pros:**
- Data persists across container restarts
- Simple setup
- No additional services needed

**Cons:**
- Single instance only (no horizontal scaling)
- Need to manage volume backups

---

### Option 2: ChromaDB Server (Recommended for Multi-Instance)

**Best for:** Multiple backend instances, horizontal scaling

1. **Deploy ChromaDB as a separate service:**

   ```yaml
   # docker-compose.yml
   services:
     chromadb:
       image: chromadb/chroma:latest
       ports:
         - "8000:8000"
       volumes:
         - chroma_data:/chroma/chroma
       environment:
         - IS_PERSISTENT=TRUE
         - PERSIST_DIRECTORY=/chroma/chroma
   
     backend:
       image: your-backend-image
       environment:
         - CHROMA_SERVER_HOST=chromadb
         - CHROMA_SERVER_PORT=8000
         - OPENAI_API_KEY=${OPENAI_API_KEY}
       depends_on:
         - chromadb
   ```

2. **Update `app/core/search.py` to use HTTP client:**
   ```python
   # Use ChromaDB HTTP client instead of embedded client
   from chromadb import HttpClient
   
   self.client = HttpClient(
       host=os.getenv("CHROMA_SERVER_HOST", "localhost"),
       port=int(os.getenv("CHROMA_SERVER_PORT", "8000"))
   )
   ```

**Pros:**
- Supports multiple backend instances
- Can scale independently
- Centralized vector storage

**Cons:**
- Additional service to manage
- Network latency for queries
- More complex setup

---

### Option 3: Cloud-Hosted Vector DB (Recommended for Production)

**Best for:** Production, managed infrastructure

Consider migrating to managed vector databases:

- **Pinecone** - Fully managed, auto-scaling
- **Weaviate Cloud** - Managed Weaviate
- **Qdrant Cloud** - Managed Qdrant
- **Chroma Cloud** - Managed ChromaDB (when available)

**Migration example (Pinecone):**
```python
import pinecone

pinecone.init(api_key=os.getenv("PINECONE_API_KEY"))
index = pinecone.Index("resume-points")

# Query
results = index.query(
    vector=embedding,
    top_k=top_k
)
```

**Pros:**
- Fully managed (no ops)
- Auto-scaling
- High availability
- Better performance at scale

**Cons:**
- Additional cost
- Vendor lock-in
- Requires code changes

---

### Option 4: Embedded with Ephemeral Storage (Development Only)

**Best for:** Development, testing, single-instance deployments

If you don't need persistence (e.g., embeddings regenerated on startup):

```python
# Use in-memory client
self.client = chromadb.Client()
```

**Pros:**
- Simplest setup
- No storage management

**Cons:**
- Data lost on restart
- Must regenerate embeddings on startup
- Not suitable for production

---

## Initial Data Loading

After deployment, you need to populate ChromaDB with resume points:

### Option A: Startup Script (Current Implementation)

The app currently loads resume points from `data/resume_points.txt` on startup (see `app/main.py`).

**For production:**
1. Mount `data/resume_points.txt` as a config file
2. Or load from database/S3 on first startup

### Option B: Management Endpoint

Create an admin endpoint to reload embeddings:

```python
@app.post("/admin/reload-embeddings")
async def reload_embeddings():
    # Load from file/database
    # Regenerate embeddings
    # Add to ChromaDB
    pass
```

### Option C: Pre-populated Volume

1. Generate ChromaDB data locally
2. Copy `chroma_db/` directory to persistent volume
3. Mount volume in production

---

## Environment Variables

Add to your `.env` or deployment config:

```bash
# Required
OPENAI_API_KEY=your_key_here

# ChromaDB Configuration
CHROMA_DB_PATH=/app/data/chroma_db  # For persistent volume
# OR
CHROMA_SERVER_HOST=chromadb         # For ChromaDB server
CHROMA_SERVER_PORT=8000             # For ChromaDB server
```

---

## Backup Strategy

For persistent volumes:

1. **Regular backups:**
   ```bash
   # Backup ChromaDB directory
   tar -czf chroma_backup_$(date +%Y%m%d).tar.gz /app/data/chroma_db
   ```

2. **Restore:**
   ```bash
   # Stop service
   # Extract backup
   tar -xzf chroma_backup_YYYYMMDD.tar.gz -C /app/data/
   # Restart service
   ```

---

## Recommended Approach by Deployment Platform

| Platform | Recommended Option | Notes |
|----------|-------------------|-------|
| **Docker Compose** | Option 1 (Persistent Volume) | Simple, single instance |
| **Kubernetes** | Option 2 (ChromaDB Server) | Supports scaling |
| **AWS ECS/Fargate** | Option 3 (Pinecone/Weaviate) | Managed, scalable |
| **Heroku** | Option 3 (Cloud Vector DB) | No persistent storage |
| **Railway/Render** | Option 1 (Persistent Volume) | Built-in volume support |
| **Fly.io** | Option 1 (Persistent Volume) | Volume support available |

---

## Migration Path

If starting with Option 1 and need to scale:

1. **Phase 1:** Single instance with persistent volume
2. **Phase 2:** Add ChromaDB server when scaling
3. **Phase 3:** Migrate to managed vector DB for production

The code supports all three approaches via environment variables.
