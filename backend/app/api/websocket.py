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
    # Validate user_id
    if not user_id:
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
        await websocket.accept()
        logger.info(f"✅ WebSocket connection accepted for user {current_user_id}")
        
        # Send connection confirmation
        await websocket.send_json({
            "type": "CONNECTED",
            "user_id": current_user_id,
            "timestamp": datetime.now().isoformat()
        })
        
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
        logger.error(f"❌ WebSocket error for user {current_user_id}: {e}")
    finally:
        # Cleanup
        await cleanup_connection(
            websocket, current_user_id, current_room_id,
            queue_service, room_service
        )


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
                
                # TODO: Notify partner if they have an active WebSocket connection
                # For MVP, the partner will be notified when they check queue status
                # or when they reconnect. In production, we should track waiting
                # WebSocket connections in queue_service to notify immediately.
                
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
    if not room_id:
        await websocket.send_json({
            "type": "ERROR",
            "message": "Not in a room. Join queue first."
        })
        return
    
    if not room_service.is_user_in_room(user_id, room_id):
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
    await room_service.broadcast(
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
    
    logger.debug(f"💬 Message sent by {user_id} in room {room_id}")


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
    # Remove from room service
    removed_room_id = await room_service.remove_connection(websocket)
    
    # Remove from queue if still in queue (async function)
    await queue_service.leave_queue(user_id)
    
    # Remove from room tracking
    if room_id:
        queue_service.leave_room(user_id)
    
    logger.info(f"🧹 Cleaned up connection for user {user_id}")

