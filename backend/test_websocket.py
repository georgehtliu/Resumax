"""
Simple WebSocket test script for testing the collaboration endpoint.

Usage:
    python test_websocket.py

This script tests:
1. Connection establishment
2. Queue joining (reviewer and reviewee)
3. Matching
4. Chat messaging
5. Highlights and comments
"""

import asyncio
import json
import websockets
from datetime import datetime


async def test_websocket():
    """Test WebSocket endpoint with various scenarios."""
    
    base_url = "ws://localhost:8000/ws"
    
    print("🧪 Testing WebSocket Endpoint")
    print("=" * 50)
    
    # Test 1: Connect as reviewer
    print("\n1️⃣ Testing Reviewer Connection...")
    try:
        async with websockets.connect(f"{base_url}?user_id=reviewer-1") as ws:
            # Wait for CONNECTED message
            response = await ws.recv()
            data = json.loads(response)
            print(f"   ✅ Connected: {data}")
            
            # Join queue as reviewer
            await ws.send(json.dumps({
                "type": "JOIN_QUEUE",
                "role": "reviewer"
            }))
            
            response = await ws.recv()
            data = json.loads(response)
            print(f"   ✅ Queue response: {data}")
            
            if data.get("type") == "QUEUE_JOINED":
                print("   ⏳ Reviewer waiting in queue...")
            elif data.get("type") == "MATCHED":
                print(f"   🎉 Reviewer matched! Room: {data.get('room_id')}")
                
                # Test sending a message
                await ws.send(json.dumps({
                    "type": "SEND_MESSAGE",
                    "message": "Hello from reviewer!",
                    "timestamp": datetime.now().isoformat()
                }))
                print("   💬 Sent test message")
            
            # Keep connection alive for a bit
            await asyncio.sleep(1)
            
    except Exception as e:
        print(f"   ❌ Error: {e}")
    
    # Test 2: Connect as reviewee (should match with reviewer)
    print("\n2️⃣ Testing Reviewee Connection (should match)...")
    try:
        async with websockets.connect(f"{base_url}?user_id=reviewee-1") as ws:
            # Wait for CONNECTED message
            response = await ws.recv()
            data = json.loads(response)
            print(f"   ✅ Connected: {data}")
            
            # Join queue as reviewee
            await ws.send(json.dumps({
                "type": "JOIN_QUEUE",
                "role": "reviewee",
                "resume_id": "resume-123"
            }))
            
            response = await ws.recv()
            data = json.loads(response)
            print(f"   ✅ Queue response: {data}")
            
            if data.get("type") == "MATCHED":
                print(f"   🎉 Reviewee matched! Room: {data.get('room_id')}")
                room_id = data.get("room_id")
                
                # Test sending a message
                await ws.send(json.dumps({
                    "type": "SEND_MESSAGE",
                    "message": "Hello from reviewee!",
                    "timestamp": datetime.now().isoformat()
                }))
                print("   💬 Sent test message")
                
                # Test creating a highlight
                await ws.send(json.dumps({
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
                        "position": {
                            "x": 100,
                            "y": 200,
                            "width": 150,
                            "height": 20
                        }
                    }
                }))
                print("   🖍️ Created test highlight")
                
                # Test creating a comment
                await ws.send(json.dumps({
                    "type": "CREATE_COMMENT",
                    "comment": {
                        "id": "comment-1",
                        "bullet_id": "bullet-123",
                        "content": "This is a test comment",
                        "highlight_id": "highlight-1"
                    }
                }))
                print("   💬 Created test comment")
                
                # Wait for any responses
                try:
                    response = await asyncio.wait_for(ws.recv(), timeout=2.0)
                    data = json.loads(response)
                    print(f"   📨 Received: {data.get('type')}")
                except asyncio.TimeoutError:
                    print("   ⏱️ No additional messages (timeout)")
            
            # Keep connection alive
            await asyncio.sleep(1)
            
    except Exception as e:
        print(f"   ❌ Error: {e}")
    
    # Test 3: Test error handling
    print("\n3️⃣ Testing Error Handling...")
    try:
        async with websockets.connect(f"{base_url}?user_id=test-user") as ws:
            response = await ws.recv()
            print(f"   ✅ Connected: {json.loads(response).get('type')}")
            
            # Test invalid message type
            await ws.send(json.dumps({
                "type": "INVALID_TYPE"
            }))
            response = await ws.recv()
            data = json.loads(response)
            print(f"   ✅ Error handled: {data.get('message')}")
            
            # Test missing resume_id for reviewee
            await ws.send(json.dumps({
                "type": "JOIN_QUEUE",
                "role": "reviewee"
            }))
            response = await ws.recv()
            data = json.loads(response)
            print(f"   ✅ Validation error: {data.get('message')}")
            
    except Exception as e:
        print(f"   ❌ Error: {e}")
    
    print("\n" + "=" * 50)
    print("✅ Testing complete!")
    print("\n💡 Tips:")
    print("   - Make sure the server is running: uvicorn app.main:app --reload")
    print("   - Open two terminals and run this script twice to test matching")
    print("   - Check server logs for detailed connection info")


if __name__ == "__main__":
    print("🚀 Starting WebSocket Tests...")
    print("⚠️  Make sure the server is running on http://localhost:8000")
    print()
    
    try:
        asyncio.run(test_websocket())
    except KeyboardInterrupt:
        print("\n⚠️  Test interrupted by user")
    except Exception as e:
        print(f"\n❌ Test failed: {e}")

