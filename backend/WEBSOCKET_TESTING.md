# WebSocket Endpoint Testing Guide

This guide shows multiple ways to test the WebSocket collaboration endpoint.

## Prerequisites

1. **Start the server:**
   ```bash
   cd backend
   uvicorn app.main:app --reload
   ```

2. **Install websockets library** (if using Python test script):
   ```bash
   pip install websockets
   ```

## Testing Methods

### Method 1: Python Test Script (Recommended)

The simplest way to test is using the provided test script:

```bash
cd backend
python test_websocket.py
```

This script tests:
- ✅ Connection establishment
- ✅ Queue joining (reviewer and reviewee)
- ✅ Matching logic
- ✅ Chat messaging
- ✅ Highlights and comments
- ✅ Error handling

**To test matching:**
1. Open two terminal windows
2. Run `python test_websocket.py` in both
3. One should connect as reviewer, one as reviewee
4. They should match and exchange messages

### Method 2: Browser DevTools (Quick Test)

1. **Open browser console** (F12)
2. **Run this JavaScript:**

```javascript
// Connect as reviewer
const ws1 = new WebSocket('ws://localhost:8000/ws?user_id=reviewer-1');

ws1.onopen = () => console.log('✅ Reviewer connected');
ws1.onmessage = (event) => {
  const data = JSON.parse(event.data);
  console.log('📨 Reviewer received:', data);
};

// Join queue
ws1.send(JSON.stringify({
  type: 'JOIN_QUEUE',
  role: 'reviewer'
}));

// Connect as reviewee (in another console or tab)
const ws2 = new WebSocket('ws://localhost:8000/ws?user_id=reviewee-1');

ws2.onopen = () => console.log('✅ Reviewee connected');
ws2.onmessage = (event) => {
  const data = JSON.parse(event.data);
  console.log('📨 Reviewee received:', data);
};

// Join queue
ws2.send(JSON.stringify({
  type: 'JOIN_QUEUE',
  role: 'reviewee',
  resume_id: 'resume-123'
}));

// Send a message (after matched)
ws1.send(JSON.stringify({
  type: 'SEND_MESSAGE',
  message: 'Hello from reviewer!',
  timestamp: new Date().toISOString()
}));
```

### Method 3: websocat (Command Line)

Install websocat:
```bash
# macOS
brew install websocat

# Or download from: https://github.com/vi/websocat
```

Test connection:
```bash
# Connect as reviewer
websocat ws://localhost:8000/ws?user_id=reviewer-1

# Then type messages:
{"type":"JOIN_QUEUE","role":"reviewer"}
{"type":"SEND_MESSAGE","message":"Hello","timestamp":"2024-01-01T12:00:00Z"}
```

### Method 4: Postman (GUI)

1. **Create new WebSocket request:**
   - URL: `ws://localhost:8000/ws?user_id=test-user`
   - Click "Connect"

2. **Send messages:**
   ```json
   {"type":"JOIN_QUEUE","role":"reviewer"}
   {"type":"SEND_MESSAGE","message":"Hello","timestamp":"2024-01-01T12:00:00Z"}
   ```

### Method 5: Pytest (Automated Tests)

Run the automated test suite:

```bash
cd backend
pytest tests/test_websocket.py -v
```

Or run all tests:
```bash
pytest tests/ -v
```

## Test Scenarios

### Scenario 1: Basic Matching

1. **Terminal 1** - Connect as reviewer:
   ```bash
   python test_websocket.py
   # Or use websocat:
   websocat ws://localhost:8000/ws?user_id=reviewer-1
   ```

2. **Terminal 2** - Connect as reviewee:
   ```bash
   websocat ws://localhost:8000/ws?user_id=reviewee-1
   ```

3. **Send JOIN_QUEUE messages:**
   - Reviewer: `{"type":"JOIN_QUEUE","role":"reviewer"}`
   - Reviewee: `{"type":"JOIN_QUEUE","role":"reviewee","resume_id":"resume-123"}`

4. **Both should receive MATCHED message** with room_id

### Scenario 2: Chat Messaging

After matching:
```json
{"type":"SEND_MESSAGE","message":"Hello!","timestamp":"2024-01-01T12:00:00Z"}
```

Both users should receive:
```json
{"type":"NEW_MESSAGE","sender_id":"...","sender_role":"...","message":"Hello!","timestamp":"..."}
```

### Scenario 3: Highlights

```json
{
  "type": "CREATE_HIGHLIGHT",
  "highlight": {
    "id": "highlight-1",
    "range": {
      "startContainer": "text",
      "startOffset": 0,
      "endContainer": "text",
      "endOffset": 10
    },
    "color": "#fef08a",
    "position": {"x": 100, "y": 200, "width": 150, "height": 20}
  }
}
```

### Scenario 4: Comments

```json
{
  "type": "CREATE_COMMENT",
  "comment": {
    "id": "comment-1",
    "bullet_id": "bullet-123",
    "content": "Consider adding metrics here"
  }
}
```

## Expected Responses

### Connection
```json
{"type": "CONNECTED", "user_id": "...", "timestamp": "..."}
```

### Queue Joined
```json
{"type": "QUEUE_JOINED", "role": "reviewer", "queue_size": 1, "timestamp": "..."}
```

### Matched
```json
{
  "type": "MATCHED",
  "room_id": "uuid-here",
  "partner_id": "partner-user-id",
  "partner_role": "reviewee",
  "resume_id": "resume-123",
  "timestamp": "..."
}
```

### Error
```json
{"type": "ERROR", "message": "Error description"}
```

## Troubleshooting

### Connection Refused
- ✅ Make sure server is running: `uvicorn app.main:app --reload`
- ✅ Check port 8000 is not in use
- ✅ Verify CORS is configured (should allow all for dev)

### No Match Notification
- ✅ Check both users are in different roles (one reviewer, one reviewee)
- ✅ Check server logs for matching logic
- ✅ Verify queue_service is working

### Messages Not Broadcasting
- ✅ Verify both users are in the same room
- ✅ Check room_service connection tracking
- ✅ Look for errors in server logs

## Debugging Tips

1. **Check server logs** - FastAPI will log all WebSocket connections
2. **Use browser Network tab** - See WebSocket frames
3. **Add print statements** - In websocket.py handlers for debugging
4. **Test one feature at a time** - Start with connection, then queue, then messages

## Next Steps

After testing the endpoint:
1. ✅ Create frontend WebSocket hook (`useWebSocket.js`)
2. ✅ Update ReviewerView and RevieweeView components
3. ✅ Test end-to-end flow with real UI

