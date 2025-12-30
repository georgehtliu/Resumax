"""
WebSocket API endpoint for real-time collaboration.

This module handles WebSocket connections for the resume review collaboration feature.
Supports queue matching, chat messaging, highlights, and comments.
"""

from fastapi import APIRouter, WebSocket, WebSocketDisconnect, Query, HTTPException
from typing import Optional
import json
import logging
from datetime import datetime
import uuid

from app.services.queue_service import get_queue_service
from app.services.room_service import get_room_service

router = APIRouter()
logger = logging.getLogger(__name__)


@router.websocket("/ws")
async def websocket_endpoint(
    websocket: WebSocket,
    user_id: Optional[str] = Query(None),
    token: Optional[str] = Query(None)
):
    """
    WebSocket endpoint for real-time collaboration.
    
    Query Parameters:
        user_id: User identifier (required for MVP, should use token auth in production)
        token: Authentication token (optional for MVP)
    
    Message Types:
        - JOIN_QUEUE: Join matching queue
        - SEND_MESSAGE: Send chat message
        - CREATE_HIGHLIGHT: Create highlight
        - UPDATE_HIGHLIGHT: Update highlight
        - DELETE_HIGHLIGHT: Delete highlight
        - CREATE_COMMENT: Create comment
        - UPDATE_COMMENT: Update comment
        - DELETE_COMMENT: Delete comment
        - RESOLVE_COMMENT: Resolve comment
    """
    print(f"🔌 WebSocket connection attempt - user_id: {user_id}")
    logger.info(f"🔌 WebSocket connection attempt - user_id: {user_id}")
    
    # Validate user_id
    if not user_id:
        print("❌ WebSocket connection rejected: user_id is required")
        logger.error("WebSocket connection rejected: user_id is required")
        await websocket.close(code=1008, reason="user_id is required")
        return
    
    # TODO: Validate authentication token in production
    # For MVP, we'll just use user_id
    
    queue_service = get_queue_service()
    room_service = get_room_service()
    
    current_user_id = user_id
    current_room_id: Optional[str] = None
    current_role: Optional[str] = None
    
    try:
        # Accept WebSocket connection
        print(f"📡 Accepting WebSocket connection for user {current_user_id}")
        await websocket.accept()
        print(f"✅ WebSocket connection accepted for user {current_user_id}")
        logger.info(f"✅ WebSocket connection accepted for user {current_user_id}")
        
        # Track connection in room_service (even if not in a room yet)
        # This allows us to find and notify waiting connections when matches occur
        if current_user_id not in room_service.user_connections:
            room_service.user_connections[current_user_id] = set()
        room_service.user_connections[current_user_id].add(websocket)
        
        # Check if user is already in a room (e.g., reconnecting or new connection after match)
        # If so, automatically add this connection to the room
        print(f"🔍 Checking if user {current_user_id} is already in a room...")
        user_room = queue_service.get_user_room(current_user_id)
        print(f"🔍 User room from queue_service: {user_room}")
        
        if user_room:
            room_info = queue_service.get_room_info(user_room)
            print(f"🔍 Room info: {room_info}")
            if room_info:
                reviewer_id, reviewee_id, _ = room_info
                user_role = "reviewer" if current_user_id == reviewer_id else "reviewee"
                print(f"🔍 User role: {user_role}")
                try:
                    # Add connection to room
                    await room_service.add_connection(user_room, websocket, current_user_id, user_role)
                    current_room_id = user_room
                    current_role = user_role
                    print(f"✅ Auto-added connection to existing room {user_room} as {user_role}")
                    logger.info(f"✅ Auto-added connection to existing room {user_room} as {user_role}")
                except Exception as e:
                    print(f"❌ Error auto-adding connection to room: {e}")
                    logger.error(f"Error auto-adding connection to room: {e}", exc_info=True)
        else:
            print(f"ℹ️ User {current_user_id} is not in a room yet")
        
        # Send connection confirmation
        try:
            await websocket.send_json({
                "type": "CONNECTED",
                "user_id": current_user_id,
                "timestamp": datetime.now().isoformat()
            })
        except Exception as e:
            logger.error(f"Error sending CONNECTED message: {e}")
            await websocket.close(code=1011, reason="Error sending initial message")
            return
        
        # Main message loop
        while True:
            # Receive message
            try:
                data = await websocket.receive_text()
                message = json.loads(data)
            except json.JSONDecodeError:
                await websocket.send_json({
                    "type": "ERROR",
                    "message": "Invalid JSON format"
                })
                continue
            except Exception as e:
                logger.error(f"Error receiving message: {e}")
                break
            
            message_type = message.get("type")
            
            if not message_type:
                await websocket.send_json({
                    "type": "ERROR",
                    "message": "Message type is required"
                })
                continue
            
            # ALWAYS sync current_room_id and current_role from connection info before handling messages
            # This ensures we have the latest state, especially for partner connections added via MATCHED
            if websocket in room_service.connection_info:
                conn_room_id, conn_user_id, conn_role = room_service.connection_info[websocket]
                if conn_room_id:
                    # Always update from connection_info as it's the source of truth
                    current_room_id = conn_room_id
                    current_role = conn_role
                    print(f"📝 Synced connection state from room_service: room_id={current_room_id}, role={current_role}")
                    logger.info(f"📝 Synced connection state from room_service: room_id={current_room_id}, role={current_role}")
            
            # Fallback: try to get room_id from queue_service if not in connection_info
            if not current_room_id:
                user_room = queue_service.get_user_room(current_user_id)
                if user_room:
                    current_room_id = user_room
                    room_info = queue_service.get_room_info(user_room)
                    if room_info:
                        reviewer_id, reviewee_id, _ = room_info
                        current_role = "reviewer" if current_user_id == reviewer_id else "reviewee"
                    print(f"📝 Synced connection state from queue_service: room_id={current_room_id}, role={current_role}")
                    logger.info(f"📝 Synced connection state from queue_service: room_id={current_room_id}, role={current_role}")
            
            # Debug: log current state before handling message
            if message_type in ["SEND_MESSAGE", "CREATE_HIGHLIGHT", "CREATE_COMMENT"]:
                print(f"🔍 Before handling {message_type}: room_id={current_room_id}, role={current_role}, user_id={current_user_id}")
                if websocket in room_service.connection_info:
                    conn_room_id, conn_user_id, conn_role = room_service.connection_info[websocket]
                    print(f"🔍 Connection info: room_id={conn_room_id}, role={conn_role}, user_id={conn_user_id}")
                else:
                    print(f"⚠️ WebSocket not in connection_info!")
            
            # Route message based on type
            try:
                if message_type == "JOIN_QUEUE":
                    await handle_join_queue(
                        websocket, message, current_user_id, 
                        queue_service, room_service
                    )
                    # Update current state if matched
                    current_room_id = queue_service.get_user_room(current_user_id)
                    if current_room_id:
                        room_info = queue_service.get_room_info(current_room_id)
                        if room_info:
                            reviewer_id, reviewee_id, _ = room_info
                            current_role = "reviewer" if current_user_id == reviewer_id else "reviewee"
                
                elif message_type == "JOIN_ROOM":
                    # Handle explicit room join (e.g., when ReviewerView/RevieweeView mounts with roomId)
                    room_id_to_join = message.get("room_id")
                    if not room_id_to_join:
                        await websocket.send_json({
                            "type": "ERROR",
                            "message": "room_id is required for JOIN_ROOM"
                        })
                        continue
                    
                    # Verify room exists and user is part of it
                    room_info = queue_service.get_room_info(room_id_to_join)
                    if not room_info:
                        await websocket.send_json({
                            "type": "ERROR",
                            "message": f"Room {room_id_to_join} does not exist"
                        })
                        continue
                    
                    reviewer_id, reviewee_id, _ = room_info
                    if current_user_id not in [reviewer_id, reviewee_id]:
                        await websocket.send_json({
                            "type": "ERROR",
                            "message": "You are not authorized to join this room"
                        })
                        continue
                    
                    # Determine role
                    user_role = "reviewer" if current_user_id == reviewer_id else "reviewee"
                    
                    # Add connection to room
                    await room_service.add_connection(room_id_to_join, websocket, current_user_id, user_role)
                    current_room_id = room_id_to_join
                    current_role = user_role
                    
                    print(f"✅ User {current_user_id} joined room {room_id_to_join} as {user_role}")
                    logger.info(f"✅ User {current_user_id} joined room {room_id_to_join} as {user_role}")
                    
                    await websocket.send_json({
                        "type": "ROOM_JOINED",
                        "room_id": room_id_to_join,
                        "role": user_role,
                        "timestamp": datetime.now().isoformat()
                    })
                
                elif message_type == "SEND_MESSAGE":
                    await handle_send_message(
                        websocket, message, current_user_id, current_room_id,
                        current_role, room_service
                    )
                
                elif message_type == "CREATE_HIGHLIGHT":
                    await handle_create_highlight(
                        websocket, message, current_user_id, current_room_id,
                        current_role, room_service
                    )
                
                elif message_type == "UPDATE_HIGHLIGHT":
                    await handle_update_highlight(
                        websocket, message, current_user_id, current_room_id,
                        current_role, room_service
                    )
                
                elif message_type == "DELETE_HIGHLIGHT":
                    await handle_delete_highlight(
                        websocket, message, current_user_id, current_room_id,
                        room_service
                    )
                
                elif message_type == "CREATE_COMMENT":
                    await handle_create_comment(
                        websocket, message, current_user_id, current_room_id,
                        current_role, room_service
                    )
                
                elif message_type == "UPDATE_COMMENT":
                    await handle_update_comment(
                        websocket, message, current_user_id, current_room_id,
                        current_role, room_service
                    )
                
                elif message_type == "DELETE_COMMENT":
                    await handle_delete_comment(
                        websocket, message, current_user_id, current_room_id,
                        current_role, room_service
                    )
                
                elif message_type == "RESOLVE_COMMENT":
                    await handle_resolve_comment(
                        websocket, message, current_user_id, current_room_id,
                        current_role, room_service
                    )
                
                else:
                    await websocket.send_json({
                        "type": "ERROR",
                        "message": f"Unknown message type: {message_type}"
                    })
            
            except Exception as e:
                logger.error(f"Error handling message {message_type}: {e}")
                await websocket.send_json({
                    "type": "ERROR",
                    "message": f"Error processing {message_type}: {str(e)}"
                })
    
    except WebSocketDisconnect:
        logger.info(f"🔌 WebSocket disconnected for user {current_user_id}")
    except Exception as e:
        logger.error(f"❌ WebSocket error for user {current_user_id}: {e}", exc_info=True)
        try:
            await websocket.close(code=1011, reason=f"Server error: {str(e)}")
        except:
            pass
    finally:
        # Cleanup
        try:
            await cleanup_connection(
                websocket, current_user_id, current_room_id,
                queue_service, room_service
            )
        except Exception as e:
            logger.error(f"Error during cleanup: {e}")


async def handle_join_queue(
    websocket: WebSocket,
    message: dict,
    user_id: str,
    queue_service,
    room_service
):
    """Handle JOIN_QUEUE message."""
    role = message.get("role")
    resume_id = message.get("resume_id")
    
    if not role or role not in ["reviewer", "reviewee"]:
        await websocket.send_json({
            "type": "ERROR",
            "message": "Invalid role. Must be 'reviewer' or 'reviewee'"
        })
        return
    
    if role == "reviewee" and not resume_id:
        await websocket.send_json({
            "type": "ERROR",
            "message": "resume_id is required for reviewees"
        })
        return
    
    try:
        # Join queue
        room_id = await queue_service.join_queue(user_id, role, resume_id)
        
        if room_id:
            # Immediately matched!
            room_info = queue_service.get_room_info(room_id)
            if room_info:
                reviewer_id, reviewee_id, matched_resume_id = room_info
                partner_id = reviewee_id if role == "reviewer" else reviewer_id
                partner_role = "reviewee" if role == "reviewer" else "reviewer"
                
                # Add connection to room
                await room_service.add_connection(room_id, websocket, user_id, role)
                
                # Send match notification to current user
                await websocket.send_json({
                    "type": "MATCHED",
                    "room_id": room_id,
                    "partner_id": partner_id,
                    "partner_role": partner_role,
                    "resume_id": matched_resume_id if role == "reviewer" else resume_id,
                    "timestamp": datetime.now().isoformat()
                })
                
                # Notify partner if they have an active WebSocket connection
                # Check if partner has any connections and notify them
                partner_connections = room_service.get_user_connections(partner_id)
                logger.info(f"🔍 Looking for partner {partner_id} connections. Found {len(partner_connections)} connection(s)")
                
                if len(partner_connections) == 0:
                    logger.warning(f"⚠️ No connections found for partner {partner_id}")
                else:
                    notified_count = 0
                    for partner_ws in partner_connections:
                        # Skip if this is the same WebSocket (same connection)
                        if partner_ws == websocket:
                            logger.info(f"⏭️ Skipping same WebSocket connection for partner {partner_id}")
                            continue
                        
                        # Check if this connection is not already in a room
                        partner_room = room_service.get_connection_room(partner_ws)
                        logger.info(f"🔍 Partner connection room status: {partner_room}")
                        
                        if not partner_room:
                            # This connection is waiting, add it to the room and notify
                            try:
                                logger.info(f"➕ Adding partner {partner_id} connection to room {room_id} as {partner_role}")
                                await room_service.add_connection(room_id, partner_ws, partner_id, partner_role)
                                await partner_ws.send_json({
                                    "type": "MATCHED",
                                    "room_id": room_id,
                                    "partner_id": user_id,
                                    "partner_role": role,
                                    "resume_id": matched_resume_id if partner_role == "reviewer" else resume_id,
                                    "timestamp": datetime.now().isoformat()
                                })
                                notified_count += 1
                                logger.info(f"✅ Notified partner {partner_id} connection about match in room {room_id}")
                            except Exception as e:
                                logger.error(f"❌ Error notifying partner connection: {e}")
                        else:
                            logger.info(f"ℹ️ Partner {partner_id} connection already in room {partner_room}")
                    
                    if notified_count == 0 and len(partner_connections) > 1:
                        logger.warning(f"⚠️ Found {len(partner_connections)} partner connections but notified none (all may be in rooms or same connection)")
                
                logger.info(f"🎉 User {user_id} matched immediately in room {room_id}")
        else:
            # Added to queue, waiting for match
            await websocket.send_json({
                "type": "QUEUE_JOINED",
                "role": role,
                "queue_size": queue_service.get_queue_size(role),
                "timestamp": datetime.now().isoformat()
            })
            logger.info(f"⏳ User {user_id} added to {role} queue")
    
    except ValueError as e:
        await websocket.send_json({
            "type": "ERROR",
            "message": str(e)
        })


async def handle_send_message(
    websocket: WebSocket,
    message: dict,
    user_id: str,
    room_id: Optional[str],
    role: Optional[str],
    room_service
):
    """Handle SEND_MESSAGE."""
    print(f"💬 handle_send_message called: user_id={user_id}, room_id={room_id}, role={role}")
    
    if not room_id:
        error_msg = f"Not in a room. Join queue first. user_id={user_id}"
        print(f"❌ {error_msg}")
        logger.error(error_msg)
        await websocket.send_json({
            "type": "ERROR",
            "message": error_msg
        })
        return
    
    # Check if connection is in the room
    if websocket not in room_service.connection_info:
        error_msg = f"Connection not in room_service.connection_info. user_id={user_id}, room_id={room_id}"
        print(f"❌ {error_msg}")
        logger.error(error_msg)
        await websocket.send_json({
            "type": "ERROR",
            "message": "Connection not properly registered in room"
        })
        return
    
    conn_room_id, conn_user_id, conn_role = room_service.connection_info[websocket]
    if conn_room_id != room_id:
        error_msg = f"Connection room mismatch. Expected {room_id}, got {conn_room_id}. user_id={user_id}"
        print(f"❌ {error_msg}")
        logger.error(error_msg)
        await websocket.send_json({
            "type": "ERROR",
            "message": f"Room mismatch: connection in {conn_room_id}, expected {room_id}"
        })
        return
    
    if not room_service.is_user_in_room(user_id, room_id):
        error_msg = f"User not in room. user_id={user_id}, room_id={room_id}"
        print(f"❌ {error_msg}")
        logger.error(error_msg)
        await websocket.send_json({
            "type": "ERROR",
            "message": "Not connected to this room"
        })
        return
    
    chat_message = message.get("message", "").strip()
    if not chat_message:
        await websocket.send_json({
            "type": "ERROR",
            "message": "Message cannot be empty"
        })
        return
    
    # Broadcast to room
    print(f"📢 Broadcasting message from {user_id} ({role}) to room {room_id}")
    logger.info(f"📢 Broadcasting message from {user_id} ({role}) to room {room_id}")
    
    sent_count = await room_service.broadcast(
        room_id,
        {
            "type": "NEW_MESSAGE",
            "sender_id": user_id,
            "sender_role": role,
            "message": chat_message,
            "timestamp": message.get("timestamp", datetime.now().isoformat())
        },
        exclude_websocket=websocket
    )
    
    print(f"✅ Message broadcasted to {sent_count} connection(s) in room {room_id}")
    logger.info(f"💬 Message sent by {user_id} in room {room_id}, delivered to {sent_count} connection(s)")


async def handle_create_highlight(
    websocket: WebSocket,
    message: dict,
    user_id: str,
    room_id: Optional[str],
    role: Optional[str],
    room_service
):
    """Handle CREATE_HIGHLIGHT."""
    if not room_id:
        await websocket.send_json({
            "type": "ERROR",
            "message": "Not in a room"
        })
        return
    
    highlight = message.get("highlight")
    if not highlight:
        await websocket.send_json({
            "type": "ERROR",
            "message": "highlight object is required"
        })
        return
    
    # Add user_id to highlight
    highlight["user_id"] = user_id
    
    # Broadcast to room
    await room_service.broadcast(
        room_id,
        {
            "type": "HIGHLIGHT_CREATED",
            "highlight": highlight,
            "timestamp": datetime.now().isoformat()
        },
        exclude_websocket=websocket
    )
    
    logger.debug(f"🖍️ Highlight created by {user_id} in room {room_id}")


async def handle_update_highlight(
    websocket: WebSocket,
    message: dict,
    user_id: str,
    room_id: Optional[str],
    role: Optional[str],
    room_service
):
    """Handle UPDATE_HIGHLIGHT."""
    if not room_id:
        await websocket.send_json({
            "type": "ERROR",
            "message": "Not in a room"
        })
        return
    
    highlight = message.get("highlight")
    if not highlight:
        await websocket.send_json({
            "type": "ERROR",
            "message": "highlight object is required"
        })
        return
    
    # Broadcast update
    await room_service.broadcast(
        room_id,
        {
            "type": "HIGHLIGHT_UPDATED",
            "highlight": highlight,
            "timestamp": datetime.now().isoformat()
        },
        exclude_websocket=websocket
    )


async def handle_delete_highlight(
    websocket: WebSocket,
    message: dict,
    user_id: str,
    room_id: Optional[str],
    room_service
):
    """Handle DELETE_HIGHLIGHT."""
    if not room_id:
        await websocket.send_json({
            "type": "ERROR",
            "message": "Not in a room"
        })
        return
    
    highlight_id = message.get("highlight_id")
    if not highlight_id:
        await websocket.send_json({
            "type": "ERROR",
            "message": "highlight_id is required"
        })
        return
    
    # Broadcast deletion
    await room_service.broadcast(
        room_id,
        {
            "type": "HIGHLIGHT_DELETED",
            "highlight_id": highlight_id,
            "user_id": user_id,
            "timestamp": datetime.now().isoformat()
        },
        exclude_websocket=websocket
    )


async def handle_create_comment(
    websocket: WebSocket,
    message: dict,
    user_id: str,
    room_id: Optional[str],
    role: Optional[str],
    room_service
):
    """Handle CREATE_COMMENT."""
    if not room_id:
        await websocket.send_json({
            "type": "ERROR",
            "message": "Not in a room"
        })
        return
    
    comment = message.get("comment")
    if not comment:
        await websocket.send_json({
            "type": "ERROR",
            "message": "comment object is required"
        })
        return
    
    # Add author info
    comment["author_id"] = user_id
    comment["author_role"] = role
    comment["created_at"] = datetime.now().isoformat()
    
    # Broadcast to room
    await room_service.broadcast(
        room_id,
        {
            "type": "COMMENT_CREATED",
            "comment": comment,
            "timestamp": datetime.now().isoformat()
        },
        exclude_websocket=websocket
    )
    
    logger.debug(f"💬 Comment created by {user_id} in room {room_id}")


async def handle_update_comment(
    websocket: WebSocket,
    message: dict,
    user_id: str,
    room_id: Optional[str],
    role: Optional[str],
    room_service
):
    """Handle UPDATE_COMMENT."""
    if not room_id:
        await websocket.send_json({
            "type": "ERROR",
            "message": "Not in a room"
        })
        return
    
    comment = message.get("comment")
    if not comment:
        await websocket.send_json({
            "type": "ERROR",
            "message": "comment object is required"
        })
        return
    
    # Broadcast update
    await room_service.broadcast(
        room_id,
        {
            "type": "COMMENT_UPDATED",
            "comment": comment,
            "timestamp": datetime.now().isoformat()
        },
        exclude_websocket=websocket
    )


async def handle_delete_comment(
    websocket: WebSocket,
    message: dict,
    user_id: str,
    room_id: Optional[str],
    role: Optional[str],
    room_service
):
    """Handle DELETE_COMMENT."""
    if not room_id:
        await websocket.send_json({
            "type": "ERROR",
            "message": "Not in a room"
        })
        return
    
    comment_id = message.get("comment_id")
    if not comment_id:
        await websocket.send_json({
            "type": "ERROR",
            "message": "comment_id is required"
        })
        return
    
    # Broadcast deletion
    await room_service.broadcast(
        room_id,
        {
            "type": "COMMENT_DELETED",
            "comment_id": comment_id,
            "user_id": user_id,
            "timestamp": datetime.now().isoformat()
        },
        exclude_websocket=websocket
    )


async def handle_resolve_comment(
    websocket: WebSocket,
    message: dict,
    user_id: str,
    room_id: Optional[str],
    role: Optional[str],
    room_service
):
    """Handle RESOLVE_COMMENT (reviewee only)."""
    if not room_id:
        await websocket.send_json({
            "type": "ERROR",
            "message": "Not in a room"
        })
        return
    
    if role != "reviewee":
        await websocket.send_json({
            "type": "ERROR",
            "message": "Only reviewees can resolve comments"
        })
        return
    
    comment_id = message.get("comment_id")
    if not comment_id:
        await websocket.send_json({
            "type": "ERROR",
            "message": "comment_id is required"
        })
        return
    
    # Broadcast resolution
    await room_service.broadcast(
        room_id,
        {
            "type": "COMMENT_RESOLVED",
            "comment_id": comment_id,
            "user_id": user_id,
            "resolved_at": datetime.now().isoformat(),
            "timestamp": datetime.now().isoformat()
        },
        exclude_websocket=websocket
    )


async def cleanup_connection(
    websocket: WebSocket,
    user_id: str,
    room_id: Optional[str],
    queue_service,
    room_service
):
    """Clean up connection on disconnect."""
    # Remove from room service (handles both in-room and waiting connections)
    removed_room_id = await room_service.remove_connection(websocket)
    
    # Also manually clean up from user_connections if not already removed
    if user_id in room_service.user_connections:
        room_service.user_connections[user_id].discard(websocket)
        if not room_service.user_connections[user_id]:
            del room_service.user_connections[user_id]
    
    # Remove from queue if still in queue (async function)
    await queue_service.leave_queue(user_id)
    
    # Remove from room tracking
    if room_id:
        queue_service.leave_room(user_id)
    
    logger.info(f"🧹 Cleaned up connection for user {user_id}")

