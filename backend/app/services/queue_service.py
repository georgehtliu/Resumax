"""
Queue Service - Handles matching logic for reviewers and reviewees.

This service manages two queues:
- Reviewer queue: Users waiting to review resumes
- Reviewee queue: Users waiting to have their resumes reviewed (includes resume_id)

When both queues have users, they are matched and assigned to a room.
"""

import uuid
from typing import Optional, Dict, List, Tuple
from datetime import datetime, timedelta
from collections import deque
import asyncio


class QueueService:
    """
    Service for managing reviewer and reviewee queues and matching pairs.
    
    Uses in-memory queues for MVP. Can be extended with Redis for distributed systems.
    """
    
    def __init__(self, queue_timeout: int = 300):
        """
        Initialize the queue service.
        
        Args:
            queue_timeout: Seconds before removing a user from queue (default: 5 minutes)
        """
        # Queues store tuples of (user_id, joined_at, resume_id for reviewees)
        self.reviewer_queue: deque = deque()  # deque of (user_id, joined_at)
        self.reviewee_queue: deque = deque()  # deque of (user_id, joined_at, resume_id)
        
        # Track which queues each user is in (allow multiple queues for same-user matching)
        self.user_to_queue: Dict[str, set] = {}  # user_id -> set of 'reviewer' | 'reviewee'
        
        # Track matched pairs: room_id -> (reviewer_id, reviewee_id, resume_id)
        self.active_rooms: Dict[str, Tuple[str, str, str]] = {}
        
        # Track which room a user is in
        self.user_to_room: Dict[str, str] = {}  # user_id -> room_id
        
        self.queue_timeout = queue_timeout
        
    async def join_queue(self, user_id: str, role: str, resume_id: Optional[str] = None) -> Optional[str]:
        """
        Add user to the appropriate queue.
        
        Args:
            user_id: Unique identifier for the user
            role: 'reviewer' or 'reviewee'
            resume_id: Required for reviewees, the resume they want reviewed
            
        Returns:
            room_id if immediately matched, None if added to queue
            
        Raises:
            ValueError: If role is invalid or resume_id is missing for reviewees
        """
        if role not in ['reviewer', 'reviewee']:
            raise ValueError(f"Invalid role: {role}. Must be 'reviewer' or 'reviewee'")
        
        # Check if user is already in the same queue (allow being in both queues for same-user matching)
        if user_id in self.user_to_queue and role in self.user_to_queue[user_id]:
            raise ValueError(f"User {user_id} is already in the {role} queue")
        
        # Check if user is already in a room
        if user_id in self.user_to_room:
            raise ValueError(f"User {user_id} is already in room {self.user_to_room[user_id]}")
        
        # Validate resume_id for reviewees
        if role == 'reviewee' and not resume_id:
            raise ValueError("resume_id is required for reviewees")
        
        # Clean up stale queue entries
        await self._cleanup_stale_entries()
        
        # Add to appropriate queue
        joined_at = datetime.now()
        
        if role == 'reviewer':
            self.reviewer_queue.append((user_id, joined_at))
        else:
            self.reviewee_queue.append((user_id, joined_at, resume_id))
        
        # Track queue membership (allow multiple queues)
        if user_id not in self.user_to_queue:
            self.user_to_queue[user_id] = set()
        self.user_to_queue[user_id].add(role)
        
        print(f"✅ User {user_id} joined {role} queue (queue sizes: {len(self.reviewer_queue)} reviewers, {len(self.reviewee_queue)} reviewees)")
        
        # Try to match immediately
        match_result = await self._try_match()
        return match_result
    
    async def leave_queue(self, user_id: str, role: Optional[str] = None) -> bool:
        """
        Remove user from queue.
        
        Args:
            user_id: User to remove from queue
            role: Specific role to remove from (optional). If None, removes from all queues.
            
        Returns:
            True if user was in a queue and removed, False otherwise
        """
        if user_id not in self.user_to_queue:
            return False
        
        removed = False
        
        # If role specified, only remove from that queue
        if role:
            if role in self.user_to_queue[user_id]:
                if role == 'reviewer':
                    self.reviewer_queue = deque([item for item in self.reviewer_queue if item[0] != user_id])
                else:
                    self.reviewee_queue = deque([item for item in self.reviewee_queue if item[0] != user_id])
                self.user_to_queue[user_id].discard(role)
                removed = True
                
                # Clean up if no longer in any queue
                if not self.user_to_queue[user_id]:
                    del self.user_to_queue[user_id]
        else:
            # Remove from all queues
            roles_to_remove = list(self.user_to_queue[user_id])
            for r in roles_to_remove:
                if r == 'reviewer':
                    self.reviewer_queue = deque([item for item in self.reviewer_queue if item[0] != user_id])
                else:
                    self.reviewee_queue = deque([item for item in self.reviewee_queue if item[0] != user_id])
            del self.user_to_queue[user_id]
            removed = True
        
        if removed:
            role_str = role if role else 'all queues'
            print(f"✅ User {user_id} left {role_str} queue")
        
        return removed
    
    async def _try_match(self) -> Optional[str]:
        """
        Try to match a reviewer with a reviewee.
        
        Returns:
            room_id if match was made, None otherwise
        """
        if len(self.reviewer_queue) == 0 or len(self.reviewee_queue) == 0:
            return None
        
        # Get first reviewer and first reviewee (FIFO)
        reviewer_user_id, reviewer_joined_at = self.reviewer_queue.popleft()
        reviewee_user_id, reviewee_joined_at, resume_id = self.reviewee_queue.popleft()
        
        # Remove from queue tracking
        if reviewer_user_id in self.user_to_queue:
            self.user_to_queue[reviewer_user_id].discard('reviewer')
            if not self.user_to_queue[reviewer_user_id]:
                del self.user_to_queue[reviewer_user_id]
        
        if reviewee_user_id in self.user_to_queue:
            self.user_to_queue[reviewee_user_id].discard('reviewee')
            if not self.user_to_queue[reviewee_user_id]:
                del self.user_to_queue[reviewee_user_id]
        
        # Generate unique room ID
        room_id = str(uuid.uuid4())
        
        # Store room information
        self.active_rooms[room_id] = (reviewer_user_id, reviewee_user_id, resume_id)
        self.user_to_room[reviewer_user_id] = room_id
        self.user_to_room[reviewee_user_id] = room_id
        
        print(f"🎉 Matched reviewer {reviewer_user_id} with reviewee {reviewee_user_id} in room {room_id}")
        
        return room_id
    
    async def _cleanup_stale_entries(self):
        """Remove entries that have been in queue too long."""
        now = datetime.now()
        timeout_delta = timedelta(seconds=self.queue_timeout)
        
        # Clean reviewer queue
        original_size = len(self.reviewer_queue)
        self.reviewer_queue = deque([
            item for item in self.reviewer_queue 
            if now - item[1] < timeout_delta
        ])
        removed_reviewers = original_size - len(self.reviewer_queue)
        
        # Clean reviewee queue
        original_size = len(self.reviewee_queue)
        self.reviewee_queue = deque([
            item for item in self.reviewee_queue 
            if now - item[1] < timeout_delta
        ])
        removed_reviewees = original_size - len(self.reviewee_queue)
        
        # Clean up user_to_queue tracking for removed users
        # Get all user_ids currently in queues
        reviewer_user_ids = {item[0] for item in self.reviewer_queue}
        reviewee_user_ids = {item[0] for item in self.reviewee_queue}
        all_queue_user_ids = reviewer_user_ids | reviewee_user_ids
        
        # Update tracking: remove roles for users no longer in those queues
        for user_id, roles in list(self.user_to_queue.items()):
            updated_roles = set()
            if user_id in reviewer_user_ids:
                updated_roles.add('reviewer')
            if user_id in reviewee_user_ids:
                updated_roles.add('reviewee')
            
            if updated_roles:
                self.user_to_queue[user_id] = updated_roles
            else:
                # User not in any queue anymore
                del self.user_to_queue[user_id]
        
        if removed_reviewers > 0 or removed_reviewees > 0:
            print(f"🧹 Cleaned up {removed_reviewers} stale reviewers and {removed_reviewees} stale reviewees")
    
    def get_room_info(self, room_id: str) -> Optional[Tuple[str, str, str]]:
        """
        Get room information.
        
        Args:
            room_id: Room identifier
            
        Returns:
            Tuple of (reviewer_id, reviewee_id, resume_id) or None if room doesn't exist
        """
        return self.active_rooms.get(room_id)
    
    def get_user_room(self, user_id: str) -> Optional[str]:
        """
        Get room ID for a user.
        
        Args:
            user_id: User identifier
            
        Returns:
            room_id if user is in a room, None otherwise
        """
        return self.user_to_room.get(user_id)
    
    def leave_room(self, user_id: str) -> Optional[str]:
        """
        Remove user from room.
        
        Args:
            user_id: User to remove from room
            
        Returns:
            room_id if user was in a room, None otherwise
        """
        room_id = self.user_to_room.get(user_id)
        if room_id and room_id in self.active_rooms:
            del self.user_to_room[user_id]
            # Note: Room stays in active_rooms until both users leave
            # This is handled by room_service when connections close
            return room_id
        return None
    
    def get_queue_size(self, role: str) -> int:
        """
        Get current queue size.
        
        Args:
            role: 'reviewer' or 'reviewee'
            
        Returns:
            Number of users in the specified queue
        """
        if role == 'reviewer':
            return len(self.reviewer_queue)
        elif role == 'reviewee':
            return len(self.reviewee_queue)
        else:
            raise ValueError(f"Invalid role: {role}")


# Singleton instance
_queue_service_instance: Optional[QueueService] = None


def get_queue_service() -> QueueService:
    """Get the singleton queue service instance."""
    global _queue_service_instance
    if _queue_service_instance is None:
        _queue_service_instance = QueueService()
    return _queue_service_instance

