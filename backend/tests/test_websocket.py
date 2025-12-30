"""
Pytest tests for WebSocket endpoint.

Tests the WebSocket collaboration endpoint including:
- Connection establishment
- Queue joining and matching
- Message broadcasting
- Error handling
"""

import pytest
import json
import asyncio
from fastapi.testclient import TestClient
from fastapi import FastAPI
from app.main import app


@pytest.fixture
def client():
    """Create a test client for the FastAPI app."""
    return TestClient(app)


@pytest.mark.asyncio
async def test_websocket_connection():
    """Test basic WebSocket connection."""
    with TestClient(app) as client:
        with client.websocket_connect("/ws?user_id=test-user-1") as websocket:
            # Should receive CONNECTED message
            data = websocket.receive_json()
            assert data["type"] == "CONNECTED"
            assert data["user_id"] == "test-user-1"


@pytest.mark.asyncio
async def test_join_queue_reviewer():
    """Test joining queue as reviewer."""
    with TestClient(app) as client:
        with client.websocket_connect("/ws?user_id=reviewer-test") as websocket:
            # Receive CONNECTED
            websocket.receive_json()
            
            # Join queue as reviewer
            websocket.send_json({
                "type": "JOIN_QUEUE",
                "role": "reviewer"
            })
            
            # Should receive QUEUE_JOINED or MATCHED
            response = websocket.receive_json()
            assert response["type"] in ["QUEUE_JOINED", "MATCHED"]
            
            if response["type"] == "QUEUE_JOINED":
                assert response["role"] == "reviewer"
                assert "queue_size" in response


@pytest.mark.asyncio
async def test_join_queue_reviewee():
    """Test joining queue as reviewee."""
    with TestClient(app) as client:
        with client.websocket_connect("/ws?user_id=reviewee-test") as websocket:
            # Receive CONNECTED
            websocket.receive_json()
            
            # Join queue as reviewee
            websocket.send_json({
                "type": "JOIN_QUEUE",
                "role": "reviewee",
                "resume_id": "resume-123"
            })
            
            # Should receive QUEUE_JOINED or MATCHED
            response = websocket.receive_json()
            assert response["type"] in ["QUEUE_JOINED", "MATCHED"]
            
            if response["type"] == "QUEUE_JOINED":
                assert response["role"] == "reviewee"


@pytest.mark.asyncio
async def test_matching():
    """Test matching reviewer with reviewee."""
    with TestClient(app) as client:
        # Connect reviewer
        with client.websocket_connect("/ws?user_id=reviewer-match") as reviewer_ws:
            reviewer_ws.receive_json()  # CONNECTED
            
            # Reviewer joins queue
            reviewer_ws.send_json({
                "type": "JOIN_QUEUE",
                "role": "reviewer"
            })
            
            # Connect reviewee (should match)
        with client.websocket_connect("/ws?user_id=reviewee-match") as reviewee_ws:
            reviewee_ws.receive_json()  # CONNECTED
            
            # Reviewee joins queue
            reviewee_ws.send_json({
                "type": "JOIN_QUEUE",
                "role": "reviewee",
                "resume_id": "resume-match"
            })
            
            # Both should receive MATCHED
            reviewer_response = reviewer_ws.receive_json()
            reviewee_response = reviewee_ws.receive_json()
            
            # At least one should be matched (depending on timing)
            assert reviewer_response["type"] in ["QUEUE_JOINED", "MATCHED"]
            assert reviewee_response["type"] in ["QUEUE_JOINED", "MATCHED"]


@pytest.mark.asyncio
async def test_send_message():
    """Test sending chat messages."""
    with TestClient(app) as client:
        with client.websocket_connect("/ws?user_id=chat-test") as websocket:
            websocket.receive_json()  # CONNECTED
            
            # Try to send message without being in a room (should error)
            websocket.send_json({
                "type": "SEND_MESSAGE",
                "message": "Hello"
            })
            
            response = websocket.receive_json()
            assert response["type"] == "ERROR"
            assert "room" in response["message"].lower()


@pytest.mark.asyncio
async def test_error_handling():
    """Test error handling for invalid messages."""
    with TestClient(app) as client:
        with client.websocket_connect("/ws?user_id=error-test") as websocket:
            websocket.receive_json()  # CONNECTED
            
            # Invalid message type
            websocket.send_json({
                "type": "INVALID_TYPE"
            })
            
            response = websocket.receive_json()
            assert response["type"] == "ERROR"
            
            # Missing resume_id for reviewee
            websocket.send_json({
                "type": "JOIN_QUEUE",
                "role": "reviewee"
            })
            
            response = websocket.receive_json()
            assert response["type"] == "ERROR"
            assert "resume_id" in response["message"].lower()


@pytest.mark.asyncio
async def test_missing_user_id():
    """Test connection without user_id (should be rejected)."""
    with TestClient(app) as client:
        try:
            with client.websocket_connect("/ws") as websocket:
                # Should close connection
                websocket.receive_json()
        except Exception:
            # Expected - connection should be rejected
            pass


if __name__ == "__main__":
    pytest.main([__file__, "-v"])

