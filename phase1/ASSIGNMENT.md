# Assignment: AI Resume Optimizer - Phase 1
## Learning Embeddings & Similarity Search

**Course**: AI/ML Fundamentals  
**Duration**: 2-3 hours  
**Difficulty**: Intermediate  
**Prerequisites**: Basic Python, API concepts

---

## 📋 Assignment Overview

You will build a system that can find the most relevant resume bullet points for a given job description using semantic similarity. This teaches you the fundamentals of text embeddings, vector databases, and similarity search - core concepts in modern AI applications.

**Learning Goal**: Understand how AI systems can "understand" text meaning and find relevant content.

---

## 🎯 Learning Objectives

By completing this assignment, you will be able to:

1. **Generate text embeddings** using OpenAI's API
2. **Calculate similarity** between text vectors using cosine similarity
3. **Store and search** vectors in a database (ChromaDB)
4. **Implement semantic search** to find relevant content
5. **Analyze and optimize** similarity search results

---

## 📁 Project Structure

```
phase1/
├── data/
│   ├── resume_points.txt      # Your resume bullet points
│   └── job_description.txt   # Target job description
├── core/
│   ├── embeddings.py         # TODO: Complete embedding logic
│   └── search.py             # TODO: Complete search logic
├── main.py                   # Entry point (mostly complete)
├── requirements.txt          # Dependencies
└── env.example              # Environment template
```

---

## 🚀 Setup Instructions

### Step 1: Environment Setup
```bash
# Navigate to the project directory
cd phase1

# Install required packages
pip install -r requirements.txt

# Set up environment variables
cp env.example .env
```

### Step 2: Get OpenAI API Key
1. Go to [OpenAI Platform](https://platform.openai.com/api-keys)
2. Create a new API key
3. Add it to your `.env` file:
   ```
   OPENAI_API_KEY=your_actual_api_key_here
   ```

### Step 3: Test Your Setup
```bash
python main.py
```
*You should see an error about missing implementations - this is expected!*

---

## 📝 Assignment Tasks

### Task 1: Complete Embedding Generation (30 minutes)

**File**: `core/embeddings.py`  
**Objective**: Implement OpenAI API calls to generate text embeddings

#### 1.1 Fix the `generate_embedding()` method
```python
def generate_embedding(self, text: str) -> List[float]:
    # TODO: Replace this placeholder with actual API call
    response = self.client.embeddings.create(
        model=self.model_name,
        input=text
    )
    return response.data[0].embedding
```

**What to do**:
- Remove the placeholder code
- Implement the actual OpenAI API call
- Add proper error handling
- Test with a simple text string

#### 1.2 Implement `compute_similarity()` method
```python
def compute_similarity(self, embedding1: List[float], embedding2: List[float]) -> float:
    # TODO: Implement cosine similarity calculation
    # Formula: cos(θ) = (A · B) / (||A|| * ||B||)
```

**What to do**:
- Use numpy to compute dot product and magnitudes
- Implement the cosine similarity formula
- Handle edge cases (zero vectors)
- Test with known vectors

#### 1.3 Test Your Implementation
```python
# Add this test code to main.py temporarily
generator = EmbeddingGenerator()
test_embedding = generator.generate_embedding("Hello world")
print(f"Embedding dimension: {len(test_embedding)}")
print(f"First 5 values: {test_embedding[:5]}")
```

### Task 2: Complete Vector Search (45 minutes)

**File**: `core/search.py`  
**Objective**: Implement ChromaDB operations for storing and searching vectors

#### 2.1 Fix ChromaDB Collection Setup
```python
def __init__(self, collection_name: str = "resume_points"):
    # TODO: Initialize or get existing collection
    try:
        self.collection = self.client.get_collection(name=collection_name)
    except:
        self.collection = self.client.create_collection(name=collection_name)
```

**What to do**:
- Implement proper collection initialization
- Handle existing collections
- Add error handling for connection issues

#### 2.2 Complete `add_resume_points()` method
```python
def add_resume_points(self, resume_points: List[str]) -> None:
    # TODO: Generate embeddings for all resume points
    # TODO: Add to ChromaDB collection
```

**What to do**:
- Generate embeddings using your embedding generator
- Create unique IDs for each resume point
- Add documents and embeddings to ChromaDB
- Handle batch processing efficiently

#### 2.3 Implement `search_similar()` method
```python
def search_similar(self, job_description: str, top_k: int = 5) -> List[Tuple[str, float]]:
    # TODO: Generate embedding for job description
    # TODO: Query the vector store
    # TODO: Format and return results
```

**What to do**:
- Generate embedding for the job description
- Query ChromaDB for similar vectors
- Convert distances to similarity scores
- Return formatted results

### Task 3: Test and Debug (30 minutes)

#### 3.1 Run the Complete System
```bash
python main.py
```

**Expected Output**:
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

🔍 Searching for similar resume points...
🎯 Top 5 matching resume points:
--------------------------------------------------
1. Led development of microservices architecture reducing system latency by 40%
   Similarity: 0.847
```

#### 3.2 Debug Common Issues
- **"No embeddings generated"**: Check API key and internet connection
- **"Collection not found"**: Verify ChromaDB initialization
- **"Low similarity scores"**: Check if resume points are relevant to job description

### Task 4: Experiment and Analyze (30 minutes)

#### 4.1 Try Different Embedding Models
```python
# In main.py, experiment with different models
generator = EmbeddingGenerator(model_name="text-embedding-3-large")
```

**Compare Results**:
- Which model gives better similarity scores?
- How does cost vs. accuracy trade-off work?

#### 4.2 Analyze Similarity Scores
```python
# Add analysis to main.py
if similar_points:
    avg_similarity = sum(score for _, score in similar_points) / len(similar_points)
    print(f"📊 Average similarity: {avg_similarity:.3f}")
    
    # Categorize by similarity ranges
    high_sim = [p for p, s in similar_points if s > 0.8]
    medium_sim = [p for p, s in similar_points if 0.6 <= s <= 0.8]
    low_sim = [p for p, s in similar_points if s < 0.6]
    
    print(f"High similarity (>0.8): {len(high_sim)}")
    print(f"Medium similarity (0.6-0.8): {len(medium_sim)}")
    print(f"Low similarity (<0.6): {len(low_sim)}")
```

#### 4.3 Customize Your Data
- Edit `data/resume_points.txt` with your own bullet points
- Modify `data/job_description.txt` with different job requirements
- See how the similarity scores change!

---

## 🧪 Experimentation Tasks

### Experiment 1: Model Comparison
1. Run with `text-embedding-3-small`
2. Run with `text-embedding-3-large`
3. Compare similarity scores and processing time
4. Document your findings

### Experiment 2: Text Preprocessing
1. Try converting all text to lowercase
2. Remove punctuation and special characters
3. See how it affects similarity scores
4. Which approach works better?

### Experiment 3: Similarity Thresholds
1. Filter results with similarity > 0.8
2. Filter results with similarity > 0.6
3. How many relevant matches do you get?
4. What's the optimal threshold?

---

## 📊 Deliverables

### 1. Working Code
- [ ] `embeddings.py` with complete implementation
- [ ] `search.py` with complete implementation
- [ ] `main.py` runs without errors
- [ ] All TODOs completed

### 2. Test Results
- [ ] Screenshot of successful run with similarity scores
- [ ] Comparison of different embedding models
- [ ] Analysis of similarity score distribution

### 3. Reflection Questions
Answer these questions in a comment at the top of `main.py`:

1. **Which embedding model performed better and why?**
2. **What was the average similarity score for your resume points?**
3. **Which resume points had the highest/lowest similarity and why?**
4. **How would you improve the similarity search results?**
5. **What challenges did you face and how did you solve them?**

---

## 🎯 Success Criteria

### Minimum Requirements (Pass)
- [ ] Code runs without errors
- [ ] Generates embeddings successfully
- [ ] Performs similarity search
- [ ] Displays top matching resume points

### Good Performance (B+)
- [ ] All minimum requirements met
- [ ] Proper error handling implemented
- [ ] Experimented with different models
- [ ] Analyzed similarity score patterns

### Excellent Performance (A)
- [ ] All good performance criteria met
- [ ] Implemented additional features (preprocessing, analysis)
- [ ] Thorough experimentation and documentation
- [ ] Clear understanding of concepts demonstrated

---

## 🆘 Getting Help

### Common Issues & Solutions

**"OpenAI API key not found"**
- Check your `.env` file exists and has the correct key
- Verify the key is valid at https://platform.openai.com/api-keys

**"No embeddings generated"**
- Check your internet connection
- Verify your API key has sufficient credits
- Check OpenAI API status

**"ChromaDB collection error"**
- Try deleting the existing collection and recreating
- Check if ChromaDB is properly installed

**"Low similarity scores"**
- Check if your resume points are relevant to the job description
- Try different embedding models
- Consider preprocessing the text

### Resources
- [OpenAI Embeddings Docs](https://platform.openai.com/docs/guides/embeddings)
- [ChromaDB Documentation](https://docs.trychroma.com/)
- [Cosine Similarity Formula](https://en.wikipedia.org/wiki/Cosine_similarity)

---

## 🎓 Next Steps

After completing this assignment, you'll be ready for:
- **Phase 2**: Building a FastAPI backend
- **Phase 3**: Adding AI-powered resume optimization
- **Phase 4**: Creating a full-stack application

**Good luck and happy coding!** 🚀
