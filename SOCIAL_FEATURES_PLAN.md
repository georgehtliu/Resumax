# 🤝 Social & Collaborative Features Implementation Plan

## Overview
Three powerful social features that transform Resumax from a solo tool into a community-driven platform:
1. **Public Resume Links** - Share resumes with comments
2. **Community Success Stories** - Public sharing of interview outcomes
3. **Live Resume Critique** - Real-time peer-to-peer matching and critique

---

## Feature 1: Public Resume Links with Comments 🎯

### What It Does
- Generate shareable public link for any resume
- Anonymous or authenticated users can view and comment
- Comments are threaded and can be replied to
- Resume owner gets notifications
- Privacy controls (public/private/unlisted)

### Why It's Valuable
- **Feedback loop**: Get real feedback from peers/recruiters
- **Viral growth**: Sharing resumes = sharing the platform
- **Network effects**: More users = more valuable feedback
- **Differentiation**: Most resume tools don't have this

### Database Schema

```sql
-- Public resume shares
CREATE TABLE public_resumes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    resume_id UUID NOT NULL REFERENCES saved_resumes(id),
    user_id UUID NOT NULL REFERENCES users(id),
    share_token VARCHAR(64) UNIQUE NOT NULL, -- Random token for URL
    title VARCHAR(255),
    description TEXT,
    privacy_level VARCHAR(20) DEFAULT 'public', -- public, unlisted, private
    allow_anonymous BOOLEAN DEFAULT true,
    allow_comments BOOLEAN DEFAULT true,
    view_count INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    expires_at TIMESTAMP, -- Optional expiration
    UNIQUE(resume_id, user_id)
);

-- Comments on public resumes
CREATE TABLE resume_comments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    public_resume_id UUID NOT NULL REFERENCES public_resumes(id) ON DELETE CASCADE,
    parent_comment_id UUID REFERENCES resume_comments(id), -- For threading
    user_id UUID REFERENCES users(id), -- NULL if anonymous
    anonymous_name VARCHAR(100), -- For anonymous comments
    comment_text TEXT NOT NULL,
    bullet_id VARCHAR(255), -- Which bullet point is commented on (optional)
    section_type VARCHAR(50), -- 'experience', 'education', 'project', etc.
    section_index INTEGER, -- Which section
    bullet_index INTEGER, -- Which bullet in section
    is_resolved BOOLEAN DEFAULT false, -- Owner can mark as resolved
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Comment reactions (likes, helpful, etc.)
CREATE TABLE comment_reactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    comment_id UUID NOT NULL REFERENCES resume_comments(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id), -- NULL if anonymous
    reaction_type VARCHAR(20) DEFAULT 'like', -- like, helpful, disagree
    created_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(comment_id, user_id, reaction_type)
);

-- Comment notifications
CREATE TABLE comment_notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id),
    comment_id UUID NOT NULL REFERENCES resume_comments(id),
    public_resume_id UUID NOT NULL REFERENCES public_resumes(id),
    notification_type VARCHAR(50), -- 'new_comment', 'reply', 'reaction'
    is_read BOOLEAN DEFAULT false,
    created_at TIMESTAMP DEFAULT NOW()
);
```

### API Endpoints

```python
# Backend endpoints

POST   /api/v1/resumes/{resume_id}/share
# Create public link
# Body: { title, description, privacy_level, allow_anonymous, allow_comments }
# Returns: { share_token, public_url, expires_at }

GET    /api/v1/public/{share_token}
# Get public resume (no auth required if public)
# Returns: { resume_data, comments_count, view_count }

POST   /api/v1/public/{share_token}/comments
# Add comment (auth optional if allow_anonymous)
# Body: { comment_text, bullet_id?, parent_comment_id?, anonymous_name? }
# Returns: { comment_id, created_at }

GET    /api/v1/public/{share_token}/comments
# Get all comments (threaded)
# Query: ?bullet_id=... (filter by bullet)
# Returns: { comments: [{ id, text, user, replies, reactions }] }

PUT    /api/v1/comments/{comment_id}
# Update comment (owner only)
# Body: { comment_text }

DELETE /api/v1/comments/{comment_id}
# Delete comment (owner or resume owner)

POST   /api/v1/comments/{comment_id}/reactions
# Add reaction
# Body: { reaction_type: 'like' | 'helpful' | 'disagree' }

GET    /api/v1/resumes/{resume_id}/shares
# Get all shares for a resume (owner only)
# Returns: { shares: [{ share_token, view_count, comments_count, created_at }] }

DELETE /api/v1/public/{share_token}
# Delete/unpublish resume (owner only)
```

### Frontend Components

```javascript
// chrome-extension/popup/src/components/PublicResumeShare.jsx
// - Share button in Saved Resumes
// - Generate link modal
// - Privacy settings
// - Copy link button

// chrome-extension/popup/src/components/PublicResumeView.jsx
// - Public resume display (read-only)
// - Comment section
// - Add comment form
// - Threaded comments display

// chrome-extension/popup/src/components/CommentThread.jsx
// - Individual comment with replies
// - Reply button
// - Reactions (like, helpful)
// - Resolve button (for owner)
```

### Implementation Steps (8-10 hours)

**Hour 1-2: Database Schema**
- Create migrations for tables
- Set up relationships and indexes
- Add seed data for testing

**Hour 3-4: Backend API**
- Create share endpoint (generate token)
- Create public view endpoint
- Create comment endpoints
- Add authentication middleware (optional for public)

**Hour 5-6: Frontend Share UI**
- Share button component
- Generate link modal
- Copy to clipboard
- Privacy settings

**Hour 7-8: Frontend Public View**
- Public resume display page
- Comment form
- Comments list (threaded)
- Real-time updates (polling or WebSocket)

**Hour 9-10: Polish & Testing**
- Error handling
- Loading states
- Mobile responsive
- Test with real data

---

## Feature 2: Community Success Stories 📊

### What It Does
- Users can publicly share resume + job outcome
- Shows: Resume version → Job → Outcome (interview/offer/rejected)
- Anonymous or named sharing
- Community can see what works
- Search/filter by role, company, outcome
- Aggregate statistics (e.g., "Python resumes got 40% interview rate")

### Why It's Valuable
- **Data-driven insights**: See what actually works
- **Social proof**: "This resume got me 5 interviews"
- **Network effects**: More data = better insights
- **Viral**: Success stories are shareable content
- **Monetization**: Premium analytics

### Database Schema

```sql
-- Success story submissions
CREATE TABLE success_stories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id),
    resume_id UUID NOT NULL REFERENCES saved_resumes(id),
    job_description_id UUID REFERENCES job_descriptions(id),
    
    -- Job details
    job_title VARCHAR(255) NOT NULL,
    company_name VARCHAR(255),
    job_location VARCHAR(255),
    job_type VARCHAR(50), -- 'full-time', 'contract', 'internship'
    industry VARCHAR(100), -- 'tech', 'finance', etc.
    
    -- Outcome
    outcome VARCHAR(50) NOT NULL, -- 'interview', 'offer', 'rejected', 'no_response'
    application_date DATE,
    interview_date DATE,
    offer_date DATE,
    offer_amount DECIMAL(10, 2), -- Optional salary
    offer_currency VARCHAR(10), -- 'USD', 'EUR', etc.
    
    -- Sharing settings
    is_public BOOLEAN DEFAULT false,
    is_anonymous BOOLEAN DEFAULT false,
    share_resume BOOLEAN DEFAULT false, -- Share actual resume or just stats
    share_job_description BOOLEAN DEFAULT false,
    
    -- Stats (computed)
    view_count INTEGER DEFAULT 0,
    like_count INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Success story likes
CREATE TABLE success_story_likes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    story_id UUID NOT NULL REFERENCES success_stories(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id),
    created_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(story_id, user_id)
);

-- Aggregate statistics (materialized view or computed)
CREATE TABLE success_statistics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    metric_type VARCHAR(50), -- 'skill', 'keyword', 'template', 'industry'
    metric_value VARCHAR(255), -- e.g., 'Python', 'Jake Template', 'tech'
    total_applications INTEGER DEFAULT 0,
    total_interviews INTEGER DEFAULT 0,
    total_offers INTEGER DEFAULT 0,
    interview_rate DECIMAL(5, 2), -- percentage
    offer_rate DECIMAL(5, 2),
    last_updated TIMESTAMP DEFAULT NOW(),
    UNIQUE(metric_type, metric_value)
);
```

### API Endpoints

```python
POST   /api/v1/success-stories
# Submit success story
# Body: { resume_id, job_title, company, outcome, dates, ... }
# Returns: { story_id, public_url }

GET    /api/v1/success-stories
# List public success stories
# Query: ?outcome=interview&industry=tech&limit=20&offset=0
# Returns: { stories: [{ id, job_title, outcome, stats, resume_preview }] }

GET    /api/v1/success-stories/{story_id}
# Get full success story
# Returns: { full_story, resume_data?, job_description? }

POST   /api/v1/success-stories/{story_id}/like
# Like a success story

GET    /api/v1/success-stories/statistics
# Get aggregate statistics
# Query: ?metric=skill&value=Python
# Returns: { interview_rate, offer_rate, sample_size, trends }

GET    /api/v1/success-stories/my-stories
# Get user's own success stories (auth required)
```

### Frontend Components

```javascript
// chrome-extension/popup/src/components/SuccessStorySubmission.jsx
// - Form to submit success story
// - Link to resume + job description
// - Outcome selection
// - Privacy settings

// chrome-extension/popup/src/components/SuccessStoriesFeed.jsx
// - List of public success stories
// - Filter by outcome, industry, role
// - Like button
// - View resume button

// chrome-extension/popup/src/components/SuccessStatistics.jsx
// - Aggregate stats dashboard
// - "Resumes with Python got 40% interview rate"
// - Charts/graphs
```

### Implementation Steps (6-8 hours)

**Hour 1-2: Database Schema**
- Create success_stories table
- Create statistics aggregation logic
- Add indexes for queries

**Hour 3-4: Backend API**
- Submit endpoint
- List endpoint with filtering
- Statistics endpoint
- Like endpoint

**Hour 5-6: Frontend Submission**
- Success story form
- Link to resume/job
- Privacy settings
- Submit button

**Hour 7-8: Frontend Feed**
- Stories list component
- Filter UI
- Statistics display
- Like functionality

---

## Feature 3: Live Resume Critique Matching 🎤

### What It Does
- Users join a queue for resume critique
- System matches two users (peer-to-peer)
- Real-time WebSocket connection
- Both users see each other's resumes
- Live commenting/annotation system
- Optional voice call (WebRTC)
- Session ends after time limit (e.g., 15 minutes)
- Rate each other after session

### Why It's Valuable
- **Real-time feedback**: Immediate, interactive critique
- **Engagement**: High-value feature users return for
- **Community building**: Creates connections between users
- **Premium feature**: Natural monetization opportunity
- **Differentiation**: Unique feature in resume space

### Database Schema

```sql
-- Critique queue
CREATE TABLE critique_queue (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id),
    resume_id UUID NOT NULL REFERENCES saved_resumes(id),
    status VARCHAR(20) DEFAULT 'waiting', -- 'waiting', 'matched', 'in_session', 'completed', 'cancelled'
    matched_user_id UUID REFERENCES users(id),
    matched_resume_id UUID REFERENCES saved_resumes(id),
    session_id UUID, -- Unique session identifier
    joined_at TIMESTAMP DEFAULT NOW(),
    matched_at TIMESTAMP,
    session_started_at TIMESTAMP,
    session_ended_at TIMESTAMP,
    user_rating INTEGER, -- 1-5 stars
    matched_user_rating INTEGER,
    user_feedback TEXT,
    matched_user_feedback TEXT
);

-- Critique sessions
CREATE TABLE critique_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_token VARCHAR(64) UNIQUE NOT NULL,
    user1_id UUID NOT NULL REFERENCES users(id),
    user1_resume_id UUID NOT NULL REFERENCES saved_resumes(id),
    user2_id UUID NOT NULL REFERENCES users(id),
    user2_resume_id UUID NOT NULL REFERENCES saved_resumes(id),
    status VARCHAR(20) DEFAULT 'active', -- 'active', 'ended', 'abandoned'
    started_at TIMESTAMP DEFAULT NOW(),
    ended_at TIMESTAMP,
    duration_minutes INTEGER
);

-- Live annotations/comments during session
CREATE TABLE session_annotations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id UUID NOT NULL REFERENCES critique_sessions(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id),
    target_resume_id UUID NOT NULL REFERENCES saved_resumes(id),
    bullet_id VARCHAR(255), -- Which bullet
    annotation_text TEXT,
    annotation_type VARCHAR(50), -- 'comment', 'suggestion', 'question', 'praise'
    x_position DECIMAL(5, 2), -- For positioning on resume
    y_position DECIMAL(5, 2),
    created_at TIMESTAMP DEFAULT NOW()
);

-- Session messages (chat)
CREATE TABLE session_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id UUID NOT NULL REFERENCES critique_sessions(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id),
    message_text TEXT NOT NULL,
    message_type VARCHAR(20) DEFAULT 'text', -- 'text', 'system'
    created_at TIMESTAMP DEFAULT NOW()
);
```

### WebSocket Events

```javascript
// Client → Server Events
{
  'join_queue': { resume_id, user_id },
  'leave_queue': { user_id },
  'send_message': { session_id, message_text },
  'add_annotation': { session_id, bullet_id, text, position },
  'end_session': { session_id },
  'rate_session': { session_id, rating, feedback }
}

// Server → Client Events
{
  'queue_position': { position, estimated_wait },
  'matched': { session_id, matched_user, matched_resume },
  'session_started': { session_id, partner_resume },
  'message_received': { message, sender },
  'annotation_added': { annotation, sender },
  'session_ended': { session_id, reason },
  'partner_left': { session_id }
}
```

### API Endpoints

```python
POST   /api/v1/critique/join-queue
# Join critique queue
# Body: { resume_id }
# Returns: { queue_position, estimated_wait_minutes }

GET    /api/v1/critique/queue-status
# Get current queue status
# Returns: { position, estimated_wait, total_in_queue }

DELETE /api/v1/critique/leave-queue
# Leave queue

GET    /api/v1/critique/session/{session_id}
# Get session details
# Returns: { session, partner_resume, annotations, messages }

POST   /api/v1/critique/session/{session_id}/rate
# Rate session after completion
# Body: { rating, feedback }
```

### Frontend Components

```javascript
// chrome-extension/popup/src/components/CritiqueQueue.jsx
// - Join queue button
// - Queue position display
// - Estimated wait time
// - Leave queue button

// chrome-extension/popup/src/components/CritiqueSession.jsx
// - Split view: Your resume | Partner's resume
// - Live annotation system
// - Chat panel
// - Voice call button (WebRTC)
// - End session button

// chrome-extension/popup/src/components/ResumeAnnotation.jsx
// - Click on bullet to add annotation
// - Display annotations from partner
// - Real-time updates via WebSocket

// chrome-extension/popup/src/components/SessionRating.jsx
// - Rate partner after session
// - Feedback form
```

### Implementation Steps (12-15 hours)

**Hour 1-2: Database Schema**
- Create queue and session tables
- Create annotation and message tables
- Add indexes

**Hour 3-5: WebSocket Server**
- Set up WebSocket endpoint (FastAPI WebSocket)
- Queue matching logic (match users)
- Session management
- Event handlers

**Hour 6-8: Backend API**
- Join/leave queue endpoints
- Session endpoints
- Rating endpoints

**Hour 9-11: Frontend Queue**
- Join queue UI
- Queue status display
- WebSocket client connection

**Hour 12-14: Frontend Session**
- Session UI (split view)
- Annotation system
- Chat panel
- WebSocket real-time updates

**Hour 15: Polish & Testing**
- Error handling
- Reconnection logic
- Session timeout
- Rating flow

### WebSocket Implementation (FastAPI)

```python
# backend/app/api/websocket.py
from fastapi import WebSocket, WebSocketDisconnect
from collections import deque
import asyncio
import uuid

class CritiqueQueueManager:
    def __init__(self):
        self.queue = deque()  # [(user_id, resume_id, websocket), ...]
        self.active_sessions = {}  # {session_id: Session}
        self.websocket_connections = {}  # {user_id: websocket}
    
    async def join_queue(self, user_id: str, resume_id: str, websocket: WebSocket):
        """Add user to queue and try to match"""
        self.queue.append((user_id, resume_id, websocket))
        self.websocket_connections[user_id] = websocket
        
        # Try to match
        if len(self.queue) >= 2:
            await self.match_users()
        else:
            # Send queue position
            await websocket.send_json({
                'type': 'queue_position',
                'position': len(self.queue),
                'estimated_wait': len(self.queue) * 2  # minutes
            })
    
    async def match_users(self):
        """Match two users from queue"""
        if len(self.queue) < 2:
            return
        
        user1_id, resume1_id, ws1 = self.queue.popleft()
        user2_id, resume2_id, ws2 = self.queue.popleft()
        
        session_id = str(uuid.uuid4())
        session = {
            'id': session_id,
            'user1_id': user1_id,
            'user1_resume_id': resume1_id,
            'user2_id': user2_id,
            'user2_resume_id': resume2_id,
            'started_at': datetime.now()
        }
        
        self.active_sessions[session_id] = session
        
        # Notify both users
        await ws1.send_json({
            'type': 'matched',
            'session_id': session_id,
            'partner_resume_id': resume2_id
        })
        
        await ws2.send_json({
            'type': 'matched',
            'session_id': session_id,
            'partner_resume_id': resume1_id
        })

@app.websocket("/ws/critique")
async def critique_websocket(websocket: WebSocket):
    await websocket.accept()
    user_id = None
    
    try:
        while True:
            data = await websocket.receive_json()
            event_type = data.get('type')
            
            if event_type == 'join_queue':
                user_id = data['user_id']
                resume_id = data['resume_id']
                await queue_manager.join_queue(user_id, resume_id, websocket)
            
            elif event_type == 'send_message':
                session_id = data['session_id']
                await queue_manager.broadcast_message(session_id, user_id, data['message'])
            
            elif event_type == 'add_annotation':
                session_id = data['session_id']
                await queue_manager.broadcast_annotation(session_id, user_id, data['annotation'])
                
    except WebSocketDisconnect:
        if user_id:
            queue_manager.leave_queue(user_id)
```

---

## 🎯 Implementation Priority & Timeline

### Phase 1: Foundation (Week 1-2)
**Prerequisites:**
- ✅ User authentication system
- ✅ Database setup (PostgreSQL)
- ✅ Resume storage in database

**Build:**
1. Public Resume Links (8-10 hours)
   - Start here: simplest feature, immediate value
   - Foundation for other features

### Phase 2: Community (Week 3)
**Build:**
2. Success Stories (6-8 hours)
   - Builds on public resumes
   - Adds community value

### Phase 3: Real-time (Week 4-5)
**Build:**
3. Live Critique Matching (12-15 hours)
   - Most complex, requires WebSocket infrastructure
   - High-value premium feature

---

## 🛠️ Technical Stack Additions

### Backend
```python
# requirements.txt additions
websockets==12.0  # WebSocket support
python-socketio==5.11.0  # Alternative WebSocket library
aioredis==2.0.1  # For queue management (optional, can use in-memory)
psycopg2-binary==2.9.9  # PostgreSQL (if not already)
sqlalchemy==2.0.23  # ORM (if not already)
alembic==1.13.0  # Migrations (if not already)
```

### Frontend
```javascript
// package.json additions
"socket.io-client": "^4.7.2"  // WebSocket client
// or native WebSocket API
```

### Infrastructure
- WebSocket server (FastAPI WebSocket or Socket.IO)
- Redis (optional, for distributed queue)
- PostgreSQL database
- WebRTC server (for voice calls, optional)

---

## 💰 Monetization Strategy

### Free Tier
- Public resume links (limited)
- View success stories
- Join critique queue (limited sessions/month)

### Pro Tier ($9.99/month)
- Unlimited public links
- Submit success stories
- Unlimited critique sessions
- Priority queue position

### Premium Tier ($19.99/month)
- Everything in Pro
- Advanced analytics on success stories
- Voice calls in critique sessions
- Private critique sessions (1-on-1 with experts)

---

## 🚀 Quick Start: Feature 1 (Public Links)

Want to start building? Here's the fastest path:

1. **Set up database** (1 hour)
   - Create `public_resumes` and `resume_comments` tables
   - Add indexes

2. **Backend API** (2 hours)
   - `POST /api/v1/resumes/{id}/share` - Generate link
   - `GET /api/v1/public/{token}` - View public resume
   - `POST /api/v1/public/{token}/comments` - Add comment

3. **Frontend** (2 hours)
   - Share button in Saved Resumes
   - Public view page
   - Comment form

4. **Test** (1 hour)
   - Test sharing flow
   - Test commenting
   - Test privacy settings

**Total: ~6 hours for MVP of Feature 1**

---

## 📊 Success Metrics

### Feature 1: Public Links
- % of users who share resumes
- Average comments per shared resume
- Return rate (users coming back to check comments)

### Feature 2: Success Stories
- Number of stories submitted
- Stories viewed per day
- Conversion: story viewers → new users

### Feature 3: Live Critique
- Average queue wait time
- Session completion rate
- User ratings (satisfaction)
- Sessions per user per month

---

## 🔒 Privacy & Security Considerations

1. **Public Links**
   - Token-based URLs (unguessable)
   - Optional expiration
   - Privacy levels (public/unlisted/private)
   - Content moderation for comments

2. **Success Stories**
   - Anonymous option
   - Opt-in sharing (not automatic)
   - Ability to delete/edit stories
   - Data anonymization for statistics

3. **Live Critique**
   - Optional identity sharing
   - Session data retention policy
   - Abuse reporting system
   - Rate limiting

---

## 🎓 Learning Opportunities

These features teach:
- **WebSockets**: Real-time bidirectional communication
- **WebRTC**: Peer-to-peer voice/video (optional)
- **Queue systems**: Matching algorithms
- **Real-time databases**: Handling concurrent updates
- **Social features**: Comments, reactions, sharing
- **Privacy**: Public/private content management

---

Ready to build? Start with Feature 1 (Public Links) - it's the foundation for everything else! 🚀

