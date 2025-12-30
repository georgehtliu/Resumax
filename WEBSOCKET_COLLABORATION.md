# WebSocket Real-Time Collaboration Feature

## Overview

This document outlines the implementation plan for connecting Reviewer Mode and Reviewee Mode through WebSocket connections. The system will match users through a queue system and enable real-time collaboration in shared chat rooms with live highlighting, commenting, and messaging capabilities.

## Architecture Overview

### Technology Stack

**Backend:**
- FastAPI WebSocket support (native)
- Redis (or in-memory dict for MVP) for queue management
- Room/connection management service

**Frontend:**
- Native WebSocket API (or `socket.io-client` if Socket.IO is preferred)
- React hooks for WebSocket state management
- Shared context for real-time updates

### System Flow

```
User (Reviewer/Reviewee) 
  → Joins Queue 
  → Matched with Partner 
  → Assigned to Chat Room 
  → Real-time Collaboration (Chat, Highlights, Comments)
```

## Component Architecture

### Backend Components

#### 1. Queue Service (`backend/app/services/queue_service.py`)
Handles matching logic for reviewers and reviewees.

**Responsibilities:**
- Maintain reviewer queue
- Maintain reviewee queue (with resume IDs)
- Match pairs when both queues have users
- Generate unique room IDs for matched pairs
- Handle queue cleanup on disconnect

**Key Methods:**
- `join_queue(user_id, role, resume_id=None)` - Add user to appropriate queue
- `leave_queue(user_id)` - Remove user from queues
- `_try_match()` - Match reviewer with reviewee when possible

#### 2. Room Service (`backend/app/services/room_service.py`)
Manages chat rooms and participant tracking.

**Responsibilities:**
- Track active WebSocket connections per room
- Maintain room state (messages, highlights, comments)
- Broadcast messages to all room participants
- Handle connection cleanup on disconnect

**Key Methods:**
- `add_connection(room_id, websocket)` - Add connection to room
- `remove_connection(room_id, websocket)` - Remove connection from room
- `broadcast(room_id, message)` - Send message to all room participants

#### 3. WebSocket Endpoint (`backend/app/api/websocket.py`)
FastAPI WebSocket route handler.

**Message Types Handled:**
- `JOIN_QUEUE` - User wants to join matching queue
- `SEND_MESSAGE` - Send chat message to room
- `CREATE_HIGHLIGHT` - Create new highlight on resume
- `UPDATE_HIGHLIGHT` - Update existing highlight
- `DELETE_HIGHLIGHT` - Remove highlight
- `CREATE_COMMENT` - Add comment to bullet point
- `UPDATE_COMMENT` - Update existing comment
- `DELETE_COMMENT` - Remove comment
- `RESOLVE_COMMENT` - Mark comment as resolved (reviewee only)

### Frontend Components

#### 1. WebSocket Hook (`chrome-extension/popup/src/hooks/useWebSocket.js`)
Reusable React hook for WebSocket connection management.

**Features:**
- Connection state management
- Message sending helper
- Automatic reconnection on disconnect
- Last message state tracking

#### 2. Queue Matching Component (`chrome-extension/popup/src/components/coaching/QueueMatching.jsx`)
UI component for queue status and matching.

**Features:**
- Display connection status
- Show queue position/waiting state
- Handle match notifications
- Transition to review session on match

#### 3. Updated Review Views
- `ReviewerView.jsx` - Replace mock data with WebSocket integration
- `RevieweeView.jsx` - Replace mock data with WebSocket integration

## Message Protocol

### Client → Server Messages

#### Join Queue
```json
{
  "type": "JOIN_QUEUE",
  "role": "reviewer" | "reviewee",
  "resume_id": "resume-uuid"  // Required for reviewee
}
```

#### Send Chat Message
```json
{
  "type": "SEND_MESSAGE",
  "message": "Hello!",
  "timestamp": "2024-01-01T12:00:00Z"
}
```

#### Create Highlight
```json
{
  "type": "CREATE_HIGHLIGHT",
  "highlight": {
    "id": "highlight-uuid",
    "range": {
      "startContainer": "...",
      "startOffset": 0,
      "endContainer": "...",
      "endOffset": 10
    },
    "color": "#fef08a",
    "position": {
      "x": 100,
      "y": 200,
      "width": 150,
      "height": 20
    }
  }
}
```

#### Create Comment
```json
{
  "type": "CREATE_COMMENT",
  "comment": {
    "id": "comment-uuid",
    "bullet_id": "bullet-123",
    "content": "Consider adding metrics here",
    "highlight_id": "highlight-uuid"  // Optional, if linked to highlight
  }
}
```

### Server → Client Messages

#### Match Notification
```json
{
  "type": "MATCHED",
  "room_id": "room-uuid",
  "partner_id": "user-uuid",
  "partner_role": "reviewer" | "reviewee",
  "resume_id": "resume-uuid"  // For reviewer
}
```

#### New Chat Message
```json
{
  "type": "NEW_MESSAGE",
  "sender_id": "user-uuid",
  "sender_role": "reviewer" | "reviewee",
  "message": "Hello!",
  "timestamp": "2024-01-01T12:00:00Z"
}
```

#### Highlight Created
```json
{
  "type": "HIGHLIGHT_CREATED",
  "highlight": {
    "id": "highlight-uuid",
    "user_id": "user-uuid",
    "range": {...},
    "color": "#fef08a",
    "position": {...}
  }
}
```

#### Comment Created
```json
{
  "type": "COMMENT_CREATED",
  "comment": {
    "id": "comment-uuid",
    "bullet_id": "bullet-123",
    "content": "Consider adding metrics",
    "author_id": "user-uuid",
    "author_role": "reviewer",
    "created_at": "2024-01-01T12:00:00Z"
  }
}
```

## Implementation Phases

### Phase 1: Backend Infrastructure ⬜ (Not Started)
**Priority: High**

1. Add WebSocket dependencies to `requirements.txt`
   ```
   websockets==12.0
   redis==5.0.1  # Optional, for distributed queue
   ```

2. Create `backend/app/services/queue_service.py`
   - Implement queue management
   - Implement matching logic
   - Handle queue cleanup

3. Create `backend/app/services/room_service.py`
   - Implement room management
   - Implement broadcast functionality
   - Handle connection tracking

4. Create `backend/app/api/websocket.py`
   - WebSocket endpoint handler
   - Message routing
   - Error handling

5. Update `backend/app/main.py`
   - Include WebSocket router
   - Configure CORS for WebSocket connections

### Phase 2: Frontend WebSocket Integration ⬜ (Not Started)
**Priority: High**

**Note:** `ReviewerView.jsx` and `RevieweeView.jsx` already exist with mock data - these need to be updated to use WebSocket.

1. Create `chrome-extension/popup/src/hooks/useWebSocket.js`
   - WebSocket connection management
   - Message sending/receiving
   - Reconnection logic

2. Create `chrome-extension/popup/src/components/coaching/QueueMatching.jsx`
   - Queue joining UI
   - Match notification handling
   - Transition to review session

3. Update `ReviewerView.jsx`
   - Replace mock chat with WebSocket
   - Replace mock comments with WebSocket
   - Replace mock highlights with WebSocket
   - Sync state with server

4. Update `RevieweeView.jsx`
   - Replace mock chat with WebSocket
   - Replace mock comments with WebSocket
   - Replace mock highlights with WebSocket
   - Add comment resolution sync

### Phase 3: Real-Time Features ⬜ (Not Started)
**Priority: Medium**

1. Chat Messaging
   - Real-time message delivery
   - Message history on room join
   - Typing indicators (optional)

2. Highlight Synchronization
   - Real-time highlight creation/updates
   - Highlight removal
   - Color synchronization

3. Comment Synchronization
   - Real-time comment creation
   - Comment updates
   - Comment resolution (reviewee)
   - Comment deletion

### Phase 4: State Persistence ⬜ (Not Started)
**Priority: Medium**

1. Database Integration
   - Store room state in Supabase/PostgreSQL
   - Sync WebSocket events to database
   - Load previous state on reconnection
   - **Database Tables Needed:**
     - `collaboration_rooms` - Track active review sessions
     - `collaboration_messages` - Store chat messages
     - `collaboration_highlights` - Store highlights on resumes
     - `collaboration_comments` - Store comments linked to bullets/highlights
     - See Database Schema section below for details

2. Session Management
   - Handle disconnections gracefully
   - Reconnection with state sync
   - Session timeout handling

### Phase 5: Enhanced Features ⚠️
**Priority: Low**

1. Advanced Collaboration
   - Cursor/selection tracking
   - Real-time typing indicators
   - Read receipts

2. Queue Management
   - Queue position estimation
   - Estimated wait time
   - Cancel queue option

3. Session Features
   - Session duration tracking
   - End session option
   - Rate reviewer/reviewee

## File Structure

```
backend/
├── app/
│   ├── api/
│   │   └── websocket.py          # WebSocket endpoint
│   └── services/
│       ├── queue_service.py      # Queue management
│       └── room_service.py       # Room management

chrome-extension/
└── popup/
    └── src/
        ├── hooks/
        │   └── useWebSocket.js   # WebSocket hook
        └── components/
            └── coaching/
                ├── QueueMatching.jsx
                ├── ReviewerView.jsx     # Updated
                └── RevieweeView.jsx     # Updated
```

## Dependencies

### Backend
```python
# Add to backend/requirements.txt
websockets==12.0
redis==5.0.1  # Optional, for production scalability
```

### Frontend
No additional dependencies needed (using native WebSocket API).

If Socket.IO is preferred:
```json
// Add to chrome-extension/popup/package.json
"socket.io-client": "^4.6.0"
```

## Configuration

### Environment Variables

**Backend (`backend/.env`):**
```env
WEBSOCKET_HOST=0.0.0.0
WEBSOCKET_PORT=8000
REDIS_URL=redis://localhost:6379  # Optional
QUEUE_TIMEOUT=300  # Seconds before removing from queue
ROOM_TIMEOUT=3600  # Seconds before cleaning empty room
```

**Frontend:**
```javascript
// chrome-extension/popup/src/config/websocket.js
export const WS_CONFIG = {
  URL: process.env.VITE_WS_URL || 'ws://localhost:8000',
  RECONNECT_INTERVAL: 3000,
  MAX_RECONNECT_ATTEMPTS: 5,
};
```

## Security Considerations

1. **Authentication**
   - Validate auth tokens on WebSocket connection
   - Verify user identity before queue join
   - Authorize room access

2. **Rate Limiting**
   - Limit messages per second per user
   - Prevent highlight/comment spam
   - Queue join throttling

3. **Input Validation**
   - Sanitize all user inputs
   - Validate message structure
   - Check message size limits

4. **Authorization**
   - Verify user owns resume (for reviewee)
   - Verify user is in room before actions
   - Prevent unauthorized room access

## Error Handling

### Connection Errors
- Automatic reconnection with exponential backoff
- Connection state indicators in UI
- Graceful degradation when disconnected

### Message Errors
- Validate message structure before processing
- Return error messages to client
- Log errors for debugging

### Queue Errors
- Handle duplicate queue joins
- Clean up stale queue entries
- Handle queue timeout

## Testing Strategy

### Backend Tests
1. Queue Service Tests
   - Test queue joining
   - Test matching logic
   - Test queue cleanup

2. Room Service Tests
   - Test connection management
   - Test broadcast functionality
   - Test room cleanup

3. WebSocket Endpoint Tests
   - Test message handling
   - Test error scenarios
   - Test disconnection handling

### Frontend Tests
1. WebSocket Hook Tests
   - Test connection management
   - Test message sending/receiving
   - Test reconnection logic

2. Component Tests
   - Test queue matching flow
   - Test chat functionality
   - Test highlight/comment sync

### Integration Tests
1. End-to-End Flow
   - Complete queue → match → collaboration flow
   - Multiple concurrent sessions
   - Reconnection scenarios

## Performance Considerations

1. **Scalability**
   - Use Redis pub/sub for multi-server deployment
   - Load balance WebSocket connections
   - Implement connection pooling

2. **Optimization**
   - Batch highlight/comment updates when possible
   - Compress large messages
   - Limit message history in memory

3. **Monitoring**
   - Track active connections
   - Monitor queue sizes
   - Alert on high latency

## Future Enhancements

1. **Multi-user Rooms**
   - Support multiple reviewers per reviewee
   - Group review sessions

2. **Video/Audio Integration**
   - WebRTC for voice/video calls
   - Screen sharing for resume review

3. **AI-Assisted Matching**
   - Match based on reviewer expertise
   - Match based on resume type/industry

4. **Analytics**
   - Track review quality
   - Reviewer reputation system
   - Session feedback collection

## Migration Notes

### From Mock to Real-time

1. **ReviewerView.jsx**
   - Remove mock chat messages
   - Remove mock comment data
   - Remove mock highlight data
   - Replace with WebSocket hooks

2. **RevieweeView.jsx**
   - Remove mock chat messages
   - Remove mock comment data
   - Remove mock highlight data
   - Replace with WebSocket hooks

3. **State Management**
   - Move from local state to WebSocket-synced state
   - Handle optimistic updates
   - Sync on reconnection

## Database Schema (Phase 4)

The following tables should be added to Supabase/PostgreSQL for persistent collaboration state:

### `collaboration_rooms`
Stores active review sessions.

```sql
CREATE TABLE collaboration_rooms (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    room_id VARCHAR(255) UNIQUE NOT NULL,
    reviewer_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    reviewee_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    resume_id UUID REFERENCES saved_resumes(id) ON DELETE CASCADE,
    status VARCHAR(50) DEFAULT 'active',  -- 'active', 'completed', 'cancelled'
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    ended_at TIMESTAMP WITH TIME ZONE,
    UNIQUE(room_id)
);

CREATE INDEX idx_rooms_reviewer ON collaboration_rooms(reviewer_id);
CREATE INDEX idx_rooms_reviewee ON collaboration_rooms(reviewee_id);
CREATE INDEX idx_rooms_resume ON collaboration_rooms(resume_id);
```

### `collaboration_messages`
Stores chat messages in review sessions.

```sql
CREATE TABLE collaboration_messages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    room_id UUID REFERENCES collaboration_rooms(id) ON DELETE CASCADE,
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    sender_role VARCHAR(50) NOT NULL,  -- 'reviewer' | 'reviewee'
    message TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_messages_room ON collaboration_messages(room_id);
CREATE INDEX idx_messages_user ON collaboration_messages(user_id);
```

### `collaboration_highlights`
Stores highlights on resumes.

```sql
CREATE TABLE collaboration_highlights (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    room_id UUID REFERENCES collaboration_rooms(id) ON DELETE CASCADE,
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    highlight_data JSONB NOT NULL,  -- Stores range, color, position data
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    deleted_at TIMESTAMP WITH TIME ZONE
);

CREATE INDEX idx_highlights_room ON collaboration_highlights(room_id);
CREATE INDEX idx_highlights_user ON collaboration_highlights(user_id);
```

### `collaboration_comments`
Stores comments on bullet points.

```sql
CREATE TABLE collaboration_comments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    room_id UUID REFERENCES collaboration_rooms(id) ON DELETE CASCADE,
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    sender_role VARCHAR(50) NOT NULL,  -- 'reviewer' | 'reviewee'
    bullet_id VARCHAR(255),
    content TEXT NOT NULL,
    highlight_id UUID REFERENCES collaboration_highlights(id) ON DELETE SET NULL,
    is_resolved BOOLEAN DEFAULT false,
    resolved_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    deleted_at TIMESTAMP WITH TIME ZONE
);

CREATE INDEX idx_comments_room ON collaboration_comments(room_id);
CREATE INDEX idx_comments_user ON collaboration_comments(user_id);
CREATE INDEX idx_comments_bullet ON collaboration_comments(bullet_id);
CREATE INDEX idx_comments_highlight ON collaboration_comments(highlight_id);
```

**Note:** These schemas should be added to `DATABASE_SCHEMA.md` when implementing Phase 4.

## Resources

- [FastAPI WebSockets Documentation](https://fastapi.tiangolo.com/advanced/websockets/)
- [MDN WebSocket API](https://developer.mozilla.org/en-US/docs/Web/API/WebSockets_API)
- [React WebSocket Best Practices](https://blog.logrocket.com/websockets-tutorial-how-to-go-real-time-with-node-and-react/)

