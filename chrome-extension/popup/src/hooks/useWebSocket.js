/**
 * useWebSocket Hook
 * 
 * React hook for managing WebSocket connections with automatic reconnection,
 * message handling, and state management.
 * 
 * @param {string} userId - User ID for the WebSocket connection
 * @param {Object} options - Configuration options
 * @returns {Object} WebSocket state and methods
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import { WS_CONFIG } from '../config/websocket';

const CONNECTION_STATES = {
  DISCONNECTED: 'disconnected',
  CONNECTING: 'connecting',
  CONNECTED: 'connected',
  RECONNECTING: 'reconnecting',
  ERROR: 'error',
};

export function useWebSocket(userId, options = {}) {
  const {
    autoConnect = true,
    onMessage = null,
    onConnect = null,
    onDisconnect = null,
    onError = null,
    reconnect = true,
  } = options;

  const [connectionState, setConnectionState] = useState(CONNECTION_STATES.DISCONNECTED);
  const [lastMessage, setLastMessage] = useState(null);
  const [error, setError] = useState(null);

  const wsRef = useRef(null);
  const reconnectAttemptsRef = useRef(0);
  const reconnectTimeoutRef = useRef(null);
  const messageHandlersRef = useRef(new Map());
  const shouldReconnectRef = useRef(reconnect);
  const isConnectingRef = useRef(false);
  const connectRef = useRef(null);

  // Build WebSocket URL with user_id
  const buildWebSocketUrl = useCallback((userId) => {
    if (!userId) {
      throw new Error('userId is required for WebSocket connection');
    }
    return `${WS_CONFIG.URL}?user_id=${encodeURIComponent(userId)}`;
  }, []);

  // Handle incoming messages
  const handleMessage = useCallback((event) => {
    try {
      const data = JSON.parse(event.data);
      console.log('📨 WebSocket message received:', data.type, data);
      setLastMessage(data);

      // Call custom message handler if provided
      if (onMessage) {
        onMessage(data);
      }

      // Call specific message type handlers
      const handler = messageHandlersRef.current.get(data.type);
      if (handler) {
        console.log(`✅ Calling handler for message type: ${data.type}`);
        handler(data);
      } else {
        console.log(`⚠️ No handler registered for message type: ${data.type}`);
        console.log('Registered handlers:', Array.from(messageHandlersRef.current.keys()));
      }
    } catch (err) {
      console.error('❌ Error parsing WebSocket message:', err);
      setError(err.message);
    }
  }, [onMessage]);

  // Handle connection open
  const handleOpen = useCallback(() => {
    console.log('✅ WebSocket connected');
    setConnectionState(CONNECTION_STATES.CONNECTED);
    setError(null);
    reconnectAttemptsRef.current = 0;

    if (onConnect) {
      onConnect();
    }
  }, [onConnect]);

  // Attempt reconnection with exponential backoff
  const attemptReconnect = useCallback(() => {
    // Double-check that we should reconnect
    if (!shouldReconnectRef.current) {
      console.log('Reconnection disabled, skipping...');
      return;
    }

    if (reconnectAttemptsRef.current >= WS_CONFIG.MAX_RECONNECT_ATTEMPTS) {
      console.error('Max reconnection attempts reached');
      setConnectionState(CONNECTION_STATES.ERROR);
      setError('Failed to reconnect after maximum attempts. Please refresh the page.');
      shouldReconnectRef.current = false; // Stop trying
      return;
    }

    // Clear any existing reconnect timeout
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }

    reconnectAttemptsRef.current += 1;
    const delay = Math.min(
      WS_CONFIG.RECONNECT_DELAY_BASE * Math.pow(2, reconnectAttemptsRef.current - 1),
      10000 // Max 10 seconds between attempts
    );
    
    console.log(`🔄 Attempting to reconnect (${reconnectAttemptsRef.current}/${WS_CONFIG.MAX_RECONNECT_ATTEMPTS}) in ${delay}ms...`);
    setConnectionState(CONNECTION_STATES.RECONNECTING);

    reconnectTimeoutRef.current = setTimeout(() => {
      reconnectTimeoutRef.current = null;
      if (connectRef.current && shouldReconnectRef.current) {
        connectRef.current();
      }
    }, delay);
  }, []);

  // Handle connection close
  const handleClose = useCallback((event) => {
    const closeCode = event.code || 1006; // Default to 1006 if code is missing
    console.log('🔌 WebSocket disconnected', closeCode, event.reason);
    setConnectionState(CONNECTION_STATES.DISCONNECTED);
    
    // Clean up the reference
    if (wsRef.current) {
      wsRef.current = null;
    }

    if (onDisconnect) {
      onDisconnect(event);
    }

    // Attempt reconnection if enabled and not a normal closure
    // Don't reconnect on:
    // - 1000: Normal closure
    // - 1001: Going away
    // - 1002: Protocol error
    // - 1006: Abnormal closure (connection failed - likely server issue)
    // - 1008: Policy violation
    // - 1011: Server error
    // - 0 or undefined: Usually means connection failed before handshake
    const nonRetryableCodes = [0, 1000, 1001, 1002, 1006, 1008, 1011];
    const shouldNotReconnect = nonRetryableCodes.includes(closeCode) || !shouldReconnectRef.current;

    if (!shouldNotReconnect) {
      // Only retry on transient errors
      attemptReconnect();
    } else {
      // Stop reconnecting for non-retryable errors
      shouldReconnectRef.current = false;
      
      // Set appropriate error message for non-retryable errors
      if (closeCode === 1006 || closeCode === 0) {
        setError('Connection failed. The server may not be running or accessible. Please check the server status.');
      } else if (closeCode === 1008 || closeCode === 1002) {
        setError('Connection rejected by server. Please check your connection settings.');
      } else if (closeCode === 1011) {
        setError('Server error. Please try again later.');
      }
    }
  }, [onDisconnect, attemptReconnect]);

  // Handle connection errors
  const handleError = useCallback((event) => {
    console.error('❌ WebSocket error:', event);
    
    // More detailed error message
    let errorMessage = 'WebSocket connection error';
    if (event && event.target) {
      const ws = event.target;
      if (ws.readyState === WebSocket.CLOSED || ws.readyState === WebSocket.CLOSING) {
        errorMessage = 'Connection failed. Please check if the server is running.';
        // Stop reconnecting on connection errors
        shouldReconnectRef.current = false;
      }
    }
    
    setConnectionState(CONNECTION_STATES.ERROR);
    setError(errorMessage);

    if (onError) {
      onError(event);
    }
  }, [onError]);

  // Connect to WebSocket
  const connect = useCallback(() => {
    if (!userId) {
      console.warn('⚠️ Cannot connect: userId is required');
      return;
    }

    // Check if already connected
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      console.log('ℹ️ WebSocket already connected, skipping');
      return;
    }

    // Prevent multiple simultaneous connection attempts
    if (isConnectingRef.current) {
      console.log('Connection attempt already in progress, skipping...');
      return;
    }

    // Clean up any existing connection first
    if (wsRef.current) {
      const currentState = wsRef.current.readyState;
      if (currentState === WebSocket.OPEN || currentState === WebSocket.CONNECTING) {
        console.log('Closing existing WebSocket connection before reconnecting...');
        try {
          wsRef.current.close(1000, 'Reconnecting');
        } catch (e) {
          console.warn('Error closing existing connection:', e);
        }
        wsRef.current = null;
      }
    }

    isConnectingRef.current = true;

    // Small delay to ensure cleanup completes
    setTimeout(() => {
      try {
        setConnectionState(CONNECTION_STATES.CONNECTING);
        const url = buildWebSocketUrl(userId);
        console.log('🔌 Connecting to WebSocket:', url);
        console.log('🔌 UserId:', userId);
        console.log('🔌 WS_CONFIG.URL:', WS_CONFIG.URL);

        const ws = new WebSocket(url);
        wsRef.current = ws;
        
        console.log('🔌 WebSocket object created, readyState:', ws.readyState);

        ws.onopen = () => {
          isConnectingRef.current = false;
          handleOpen();
        };
        ws.onmessage = handleMessage;
        ws.onclose = (event) => {
          isConnectingRef.current = false;
          // Check if we should stop reconnecting before handling close
          const closeCode = event.code || 1006;
          if (closeCode === 1006 || closeCode === 0) {
            console.log('🚫 Stopping reconnection due to close code:', closeCode);
            shouldReconnectRef.current = false;
          }
          handleClose(event);
        };
        ws.onerror = (event) => {
          isConnectingRef.current = false;
          // Stop reconnecting on error - connection failed
          console.log('🚫 Stopping reconnection due to error');
          shouldReconnectRef.current = false;
          handleError(event);
        };
      } catch (err) {
        isConnectingRef.current = false;
        console.error('Error creating WebSocket:', err);
        setConnectionState(CONNECTION_STATES.ERROR);
        setError(err.message);
      }
    }, 100);
  }, [userId, buildWebSocketUrl, handleOpen, handleMessage, handleClose, handleError]);

  // Store connect function in ref to break circular dependency
  useEffect(() => {
    connectRef.current = connect;
  }, [connect]);

  // Disconnect from WebSocket
  const disconnect = useCallback(() => {
    console.log('🔌 Disconnect called');
    shouldReconnectRef.current = false;

    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }

    if (wsRef.current) {
      const currentState = wsRef.current.readyState;
      if (currentState === WebSocket.OPEN || currentState === WebSocket.CONNECTING) {
        console.log('🔌 Closing WebSocket connection, current state:', currentState);
        wsRef.current.close(1000, 'User disconnected');
      }
      wsRef.current = null;
    }

    setConnectionState(CONNECTION_STATES.DISCONNECTED);
    // Reset connection attempt tracking so we can reconnect if needed
    hasAttemptedInitialConnection.current = false;
  }, []);

  // Send message through WebSocket
  const sendMessage = useCallback((message) => {
    if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) {
      const error = 'WebSocket is not connected';
      console.error(error);
      setError(error);
      throw new Error(error);
    }

    try {
      const messageStr = typeof message === 'string' ? message : JSON.stringify(message);
      wsRef.current.send(messageStr);
      return true;
    } catch (err) {
      console.error('Error sending WebSocket message:', err);
      setError(err.message);
      throw err;
    }
  }, []);

  // Register message type handler
  const on = useCallback((messageType, handler) => {
    messageHandlersRef.current.set(messageType, handler);
    
    // Return unsubscribe function
    return () => {
      messageHandlersRef.current.delete(messageType);
    };
  }, []);

  // Track if we've attempted initial connection for current userId
  const hasAttemptedInitialConnection = useRef(false);
  const lastUserIdRef = useRef(null);

  // Reset connection attempt tracking when userId changes
  useEffect(() => {
    if (lastUserIdRef.current !== userId) {
      hasAttemptedInitialConnection.current = false;
      lastUserIdRef.current = userId;
    }
  }, [userId]);

  // Auto-connect on mount if enabled
  useEffect(() => {
    // For initial connection, don't check shouldReconnectRef (that's for reconnection after disconnect)
    // Only check if we haven't already attempted and we're not currently connecting
    if (autoConnect && userId && !hasAttemptedInitialConnection.current && !isConnectingRef.current) {
      hasAttemptedInitialConnection.current = true;
      console.log('🔌 Auto-connect triggered, userId:', userId);
      // Small delay to prevent rapid connections
      const timeoutId = setTimeout(() => {
        // Double-check before connecting (but don't require shouldReconnectRef for initial connection)
        if (!isConnectingRef.current && wsRef.current?.readyState !== WebSocket.OPEN) {
          console.log('🔌 Calling connect() from auto-connect');
          connect();
        }
      }, 200);

      return () => {
        clearTimeout(timeoutId);
      };
    }
    // No cleanup here - we only want to disconnect on actual unmount
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoConnect, userId]); // Only depend on autoConnect and userId, not connect/disconnect

  // Update reconnect setting
  useEffect(() => {
    shouldReconnectRef.current = reconnect;
  }, [reconnect]);

  // Cleanup on unmount only
  useEffect(() => {
    return () => {
      console.log('🔌 Component unmounting, disconnecting WebSocket');
      disconnect();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Empty deps - only run on mount/unmount

  return {
    // State
    connectionState,
    lastMessage,
    error,
    isConnected: connectionState === CONNECTION_STATES.CONNECTED,
    isConnecting: connectionState === CONNECTION_STATES.CONNECTING,
    isReconnecting: connectionState === CONNECTION_STATES.RECONNECTING,

    // Methods
    connect,
    disconnect,
    sendMessage,
    on, // Register message handler

    // Constants
    CONNECTION_STATES,
  };
}

