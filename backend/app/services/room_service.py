"""
Room Service - Manages chat rooms and WebSocket connection tracking.

This service handles:
- Tracking active WebSocket connections per room
- Broadcasting messages to all room participants
- Connection cleanup on disconnect
"""

from typing import Dict, List, Set, Optional
from fastapi import WebSocket
import json
import logging
from datetime import datetime

logger = logging.getLogger(__name__)


class RoomService:
    """
    Service for managing chat rooms and WebSocket connections.
    
    Maintains in-memory state of active connections. Can be extended with
    Redis pub/sub for distributed systems.
    """
    
    def __init__(self):
        """Initialize the room service."""
        # Map room_id -> Set of WebSocket connections
        self.rooms: Dict[str, Set[WebSocket]] = {}
        
        # Map WebSocket -> (room_id, user_id, role)
        self.connection_info: Dict[WebSocket, tuple] = {}
        
        # Map user_id -> Set of WebSockets (for users with multiple connections)
        self.user_connections: Dict[str, Set[WebSocket]] = {}
    
    async def add_connection(
        self, 
        room_id: str, 
        websocket: WebSocket, 
        user_id: str,
        role: str
    ) -> bool:
        """
        Add a WebSocket connection to a room.
        
        Args:
            room_id: Room identifier
            websocket: WebSocket connection
            user_id: User identifier
            role: 'reviewer' or 'reviewee'
            
        Returns:
            True if connection was added, False if already exists
        """
        # Initialize room if it doesn't exist
        if room_id not in self.rooms:
            self.rooms[room_id] = set()
        
        # Add connection to room
        if websocket in self.rooms[room_id]:
            logger.warning(f"Connection already in room {room_id}")
            return False
        
        self.rooms[room_id].add(websocket)
        self.connection_info[websocket] = (room_id, user_id, role)
        
        # Track user connections
        if user_id not in self.user_connections:
            self.user_connections[user_id] = set()
        self.user_connections[user_id].add(websocket)
        
        logger.info(f"✅ Added connection for user {user_id} ({role}) to room {room_id} (room size: {len(self.rooms[room_id])})")
        return True
    
    async def remove_connection(self, websocket: WebSocket) -> Optional[str]:
        """
        Remove a WebSocket connection from its room.
        
        Args:
            websocket: WebSocket connection to remove
            
        Returns:
            room_id if connection was in a room, None otherwise
        """
        if websocket not in self.connection_info:
            return None
        
        room_id, user_id, role = self.connection_info[websocket]
        
        # Remove from room
        if room_id in self.rooms:
            self.rooms[room_id].discard(websocket)
            
            # Clean up empty rooms
            if len(self.rooms[room_id]) == 0:
                del self.rooms[room_id]
                logger.info(f"🧹 Room {room_id} is now empty and removed")
        
        # Remove connection info
        del self.connection_info[websocket]
        
        # Remove from user connections
        if user_id in self.user_connections:
            self.user_connections[user_id].discard(websocket)
            if len(self.user_connections[user_id]) == 0:
                del self.user_connections[user_id]
        
        logger.info(f"✅ Removed connection for user {user_id} ({role}) from room {room_id}")
        return room_id
    
    async def broadcast(
        self, 
        room_id: str, 
        message: dict, 
        exclude_websocket: Optional[WebSocket] = None
    ) -> int:
        """
        Broadcast a message to all connections in a room.
        
        Args:
            room_id: Room identifier
            message: Message dictionary to send (will be JSON serialized)
            exclude_websocket: Optional WebSocket to exclude from broadcast
            
        Returns:
            Number of connections the message was sent to
        """
        if room_id not in self.rooms:
            logger.warning(f"Attempted to broadcast to non-existent room {room_id}")
            return 0
        
        connections = self.rooms[room_id]
        if exclude_websocket:
            connections = {ws for ws in connections if ws != exclude_websocket}
        
        if len(connections) == 0:
            return 0
        
        # Serialize message
        message_json = json.dumps(message)
        sent_count = 0
        failed_connections = []
        
        # Send to all connections
        for websocket in list(connections):  # Copy to avoid modification during iteration
            try:
                await websocket.send_text(message_json)
                sent_count += 1
            except Exception as e:
                logger.error(f"Failed to send message to connection in room {room_id}: {e}")
                failed_connections.append(websocket)
        
        # Clean up failed connections
        for websocket in failed_connections:
            await self.remove_connection(websocket)
        
        logger.debug(f"📤 Broadcast message to {sent_count} connections in room {room_id}")
        return sent_count
    
    async def send_to_user(
        self,
        user_id: str,
        message: dict
    ) -> int:
        """
        Send a message to all connections for a specific user.
        
        Args:
            user_id: User identifier
            message: Message dictionary to send
            
        Returns:
            Number of connections the message was sent to
        """
        if user_id not in self.user_connections:
            return 0
        
        connections = self.user_connections[user_id]
        message_json = json.dumps(message)
        sent_count = 0
        failed_connections = []
        
        for websocket in list(connections):
            try:
                await websocket.send_text(message_json)
                sent_count += 1
            except Exception as e:
                logger.error(f"Failed to send message to user {user_id}: {e}")
                failed_connections.append(websocket)
        
        # Clean up failed connections
        for websocket in failed_connections:
            await self.remove_connection(websocket)
        
        return sent_count
    
    def get_room_participants(self, room_id: str) -> List[tuple]:
        """
        Get list of participants in a room.
        
        Args:
            room_id: Room identifier
            
        Returns:
            List of (user_id, role) tuples
        """
        if room_id not in self.rooms:
            return []
        
        participants = []
        seen_users = set()
        
        for websocket in self.rooms[room_id]:
            if websocket in self.connection_info:
                _, user_id, role = self.connection_info[websocket]
                # Avoid duplicates if user has multiple connections
                if user_id not in seen_users:
                    participants.append((user_id, role))
                    seen_users.add(user_id)
        
        return participants
    
    def get_room_size(self, room_id: str) -> int:
        """
        Get number of connections in a room.
        
        Args:
            room_id: Room identifier
            
        Returns:
            Number of active connections
        """
        return len(self.rooms.get(room_id, set()))
    
    def is_user_in_room(self, user_id: str, room_id: str) -> bool:
        """
        Check if a user is in a room.
        
        Args:
            user_id: User identifier
            room_id: Room identifier
            
        Returns:
            True if user has at least one connection in the room
        """
        if user_id not in self.user_connections:
            return False
        
        if room_id not in self.rooms:
            return False
        
        user_ws = self.user_connections[user_id]
        room_ws = self.rooms[room_id]
        
        return len(user_ws & room_ws) > 0
    
    def get_user_rooms(self, user_id: str) -> List[str]:
        """
        Get all rooms a user is in.
        
        Args:
            user_id: User identifier
            
        Returns:
            List of room_ids
        """
        if user_id not in self.user_connections:
            return []
        
        user_rooms = set()
        for websocket in self.user_connections[user_id]:
            if websocket in self.connection_info:
                room_id, _, _ = self.connection_info[websocket]
                user_rooms.add(room_id)
        
        return list(user_rooms)


# Singleton instance
_room_service_instance: Optional[RoomService] = None


def get_room_service() -> RoomService:
    """Get the singleton room service instance."""
    global _room_service_instance
    if _room_service_instance is None:
        _room_service_instance = RoomService()
    return _room_service_instance

