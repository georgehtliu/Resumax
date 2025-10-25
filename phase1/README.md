# AI Resume Optimizer - Phase 1: Embeddings & Similarity Search

A hands-on learning project focused on understanding text embeddings and vector similarity search. This phase teaches you the fundamentals before building a full application.

## 🎯 Learning Objectives

By completing this phase, you will understand:

- **Text Embeddings**: How to convert text into numerical vectors that capture semantic meaning
- **Vector Similarity**: How to measure similarity between different pieces of text
- **Vector Databases**: How to store and efficiently search through high-dimensional vectors
- **Semantic Search**: How to find relevant content based on meaning, not just keywords

## 🚀 Quick Start

### 1. Setup Environment

```bash
# Install dependencies
pip install -r requirements.txt

# Copy environment file and add your OpenAI API key
cp env.example .env
# Edit .env and add your OPENAI_API_KEY
```

### 2. Run the Script

```bash
python main.py
```

### 3. Expected Output

```
🚀 AI Resume Optimizer - Phase 1: Embeddings & Similarity Search
============================================================
📄 Loading data...
✅ Loaded 8 resume points
✅ Loaded job description (456 characters)

🔧 Initializing components...
✅ Embedding generator initialized
✅ Vector search initialized

📊 Adding resume points to vector store...
Generating embeddings for 8 resume points...
Added 8 resume points to vector store
📈 Collection stats: {'total_points': 8, 'collection_name': 'resume_points', 'embedding_model': 'text-embedding-3-small'}

🔍 Searching for similar resume points...
Job description: We're looking for a Senior Software Engineer to join our team. The ideal candidate will have experience with:...

🎯 Top 5 matching resume points:
--------------------------------------------------
1. Led development of microservices architecture reducing system latency by 40%
   Similarity: 0.847

2. Implemented automated testing pipeline increasing code coverage to 95%
   Similarity: 0.823

3. Designed RESTful APIs serving 10,000+ daily requests
   Similarity: 0.798
```

## 📚 What You'll Learn

### Core Concepts

1. **Embeddings**: High-dimensional vectors that represent text semantically
2. **Cosine Similarity**: Mathematical measure of similarity between vectors
3. **Vector Databases**: Specialized databases for storing and searching vectors
4. **Semantic Search**: Finding content based on meaning rather than exact text matches

### Implementation Details

- **OpenAI Embeddings**: Using state-of-the-art embedding models
- **ChromaDB**: Lightweight vector database for prototyping
- **Batch Processing**: Efficient handling of multiple texts
- **Error Handling**: Robust API interaction and fallback strategies

## 🛠 TODO: Complete These Tasks

### 1. Embeddings Module (`core/embeddings.py`)

- [ ] Implement `generate_embedding()` method with OpenAI API calls
- [ ] Add proper error handling for API failures
- [ ] Implement `compute_similarity()` with cosine similarity formula
- [ ] Optimize `generate_embeddings_batch()` for efficiency

### 2. Search Module (`core/search.py`)

- [ ] Complete ChromaDB collection setup
- [ ] Implement `add_resume_points()` with proper embedding storage
- [ ] Fix `search_similar()` to return formatted results
- [ ] Add collection statistics and management

### 3. Main Script (`main.py`)

- [ ] Add environment variable validation
- [ ] Implement better error handling and user feedback
- [ ] Add configuration options for different models
- [ ] Enhance result analysis and insights

## 🧠 Challenge Questions

### Beginner Level
1. **What happens if you change the embedding model from `text-embedding-3-small` to `text-embedding-3-large`?**
   - How does it affect similarity scores?
   - What are the trade-offs in cost vs. accuracy?

2. **How does the similarity threshold affect your results?**
   - Try filtering results with similarity > 0.8
   - What insights do you gain from low-similarity matches?

### Intermediate Level
3. **What happens if you change the embedding dimensionality?**
   - Research how different models affect vector dimensions
   - How does this impact storage and search performance?

4. **How can you improve the similarity search results?**
   - Try preprocessing the text (lowercase, remove punctuation)
   - Experiment with different chunking strategies for longer texts

### Advanced Level
5. **How would you scale this to handle thousands of resume points?**
   - Research FAISS for faster similarity search
   - Consider hybrid search (semantic + keyword matching)
   - Explore different vector database options

## 🔧 Experimentation Ideas

### Try Different Embedding Models
```python
# In embeddings.py, try different models:
generator = EmbeddingGenerator(model_name="text-embedding-3-large")
generator = EmbeddingGenerator(model_name="text-embedding-ada-002")
```

### Adjust Search Parameters
```python
# In main.py, experiment with:
similar_points = vector_search.search_similar(job_description, top_k=10)
```

### Add Custom Resume Points
Edit `data/resume_points.txt` with your own bullet points and see how they match!

## 🐛 Common Issues & Solutions

### "OpenAI API key not found"
- Make sure you've created a `.env` file with your API key
- Check that the key is valid and has sufficient credits

### "No embeddings generated"
- Verify your internet connection
- Check OpenAI API status
- Ensure your API key has embedding access

### "Low similarity scores"
- Try different embedding models
- Check if your resume points are relevant to the job description
- Consider preprocessing the text

## 🎓 Next Steps

After completing this phase, you'll be ready for:

- **Phase 2**: Building a FastAPI backend with these concepts
- **Phase 3**: Adding AI-powered resume optimization
- **Phase 4**: Creating a full-stack application

## 📖 Additional Resources

- [OpenAI Embeddings Documentation](https://platform.openai.com/docs/guides/embeddings)
- [ChromaDB Documentation](https://docs.trychroma.com/)
- [Vector Similarity Explained](https://platform.openai.com/docs/guides/embeddings/use-cases)
- [Cosine Similarity Formula](https://en.wikipedia.org/wiki/Cosine_similarity)

Happy learning! 🚀
