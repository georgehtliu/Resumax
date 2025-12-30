/**
 * useWebSocket Hook - Usage Examples
 * 
 * This file demonstrates how to use the useWebSocket hook in your components.
 */

import { useWebSocket } from './useWebSocket';
import { supabase } from '../config/supabase';
import { useState, useEffect } from 'react';

// Example 1: Basic usage with user ID
function BasicWebSocketExample() {
  const userId = 'user-123'; // Get from Supabase session
  
  const {
    connectionState,
    lastMessage,
    isConnected,
    sendMessage,
    connect,
    disconnect,
  } = useWebSocket(userId, {
    autoConnect: true,
  });

  // Handle incoming messages
  useEffect(() => {
    if (lastMessage) {
      console.log('Received message:', lastMessage);
      
      if (lastMessage.type === 'MATCHED') {
        console.log('Matched with partner!', lastMessage.partner_id);
      }
    }
  }, [lastMessage]);

  const handleJoinQueue = () => {
    sendMessage({
      type: 'JOIN_QUEUE',
      role: 'reviewer',
    });
  };

  return (
    <div>
      <p>Status: {connectionState}</p>
      {isConnected && <button onClick={handleJoinQueue}>Join Queue</button>}
    </div>
  );
}

// Example 2: With Supabase user session
function WebSocketWithSupabase() {
  const [userId, setUserId] = useState(null);
  const [roomId, setRoomId] = useState(null);

  // Get user ID from Supabase session
  useEffect(() => {
    const getUserId = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user?.id) {
        setUserId(session.user.id);
      }
    };
    getUserId();
  }, []);

  const {
    connectionState,
    lastMessage,
    isConnected,
    sendMessage,
    on,
  } = useWebSocket(userId, {
    autoConnect: !!userId,
    onConnect: () => {
      console.log('Connected to WebSocket');
    },
    onDisconnect: () => {
      console.log('Disconnected from WebSocket');
    },
  });

  // Register message handlers
  useEffect(() => {
    if (!isConnected) return;

    // Handle MATCHED message
    const unsubscribeMatched = on('MATCHED', (message) => {
      setRoomId(message.room_id);
      console.log('Matched! Room:', message.room_id);
    });

    // Handle NEW_MESSAGE
    const unsubscribeMessage = on('NEW_MESSAGE', (message) => {
      console.log('New chat message:', message.message);
    });

    // Handle HIGHLIGHT_CREATED
    const unsubscribeHighlight = on('HIGHLIGHT_CREATED', (message) => {
      console.log('Highlight created:', message.highlight);
    });

    return () => {
      unsubscribeMatched();
      unsubscribeMessage();
      unsubscribeHighlight();
    };
  }, [isConnected, on]);

  const handleSendMessage = () => {
    sendMessage({
      type: 'SEND_MESSAGE',
      message: 'Hello!',
      timestamp: new Date().toISOString(),
    });
  };

  if (!userId) {
    return <div>Loading user session...</div>;
  }

  return (
    <div>
      <p>Connection: {connectionState}</p>
      {roomId && <p>Room: {roomId}</p>}
      {isConnected && (
        <button onClick={handleSendMessage}>Send Message</button>
      )}
    </div>
  );
}

// Example 3: Queue matching component
function QueueMatchingExample({ role, resumeId, onMatch }) {
  const [userId, setUserId] = useState(null);

  useEffect(() => {
    const getUserId = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user?.id) {
        setUserId(session.user.id);
      }
    };
    getUserId();
  }, []);

  const {
    connectionState,
    isConnected,
    sendMessage,
    on,
  } = useWebSocket(userId, {
    autoConnect: !!userId,
  });

  // Join queue when connected
  useEffect(() => {
    if (isConnected && role) {
      sendMessage({
        type: 'JOIN_QUEUE',
        role,
        resume_id: resumeId,
      });
    }
  }, [isConnected, role, resumeId, sendMessage]);

  // Handle match
  useEffect(() => {
    if (!isConnected) return;

    const unsubscribe = on('MATCHED', (message) => {
      onMatch({
        roomId: message.room_id,
        partnerId: message.partner_id,
        partnerRole: message.partner_role,
        resumeId: message.resume_id,
      });
    });

    return unsubscribe;
  }, [isConnected, on, onMatch]);

  if (!userId) {
    return <div>Loading...</div>;
  }

  return (
    <div>
      {connectionState === 'connecting' && <p>Connecting...</p>}
      {connectionState === 'reconnecting' && <p>Reconnecting...</p>}
      {connectionState === 'connected' && <p>Waiting for match...</p>}
      {connectionState === 'error' && <p>Connection error</p>}
    </div>
  );
}

export { BasicWebSocketExample, WebSocketWithSupabase, QueueMatchingExample };

