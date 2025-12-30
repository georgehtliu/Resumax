import React, { useState, useEffect } from 'react';
import { supabase } from '../../config/supabase';
import { useWebSocket } from '../../hooks/useWebSocket';
import LoadingScreen from './LoadingScreen';
import './QueueMatching.css';

/**
 * QueueMatching Component
 * 
 * Handles queue joining and matching for reviewers and reviewees.
 * Shows loading state while waiting for a match.
 */
function QueueMatching({ role, resumeId, onMatch, onCancel }) {
  const [userId, setUserId] = useState(null);
  const [error, setError] = useState(null);
  
  console.log('🔍 QueueMatching component rendered', { role, resumeId, hasOnMatch: !!onMatch });

  // Get user ID from Supabase session
  useEffect(() => {
    const getUserId = async () => {
      console.log('🔍 QueueMatching: Getting user ID...');
      try {
        const { data: { session } } = await supabase.auth.getSession();
        console.log('🔍 QueueMatching: Session:', session ? 'exists' : 'null');
        if (session?.user?.id) {
          console.log('✅ QueueMatching: User ID:', session.user.id);
          setUserId(session.user.id);
        } else {
          console.error('❌ QueueMatching: No user session');
          setError('Please sign in to join the queue');
        }
      } catch (err) {
        console.error('❌ QueueMatching: Error getting user session:', err);
        setError('Failed to get user session');
      }
    };
    getUserId();
  }, []);

  // WebSocket connection
  console.log('🔍 QueueMatching: Setting up WebSocket, userId:', userId, 'role:', role);
  const {
    connectionState,
    isConnected,
    sendMessage,
    on,
    error: wsError,
  } = useWebSocket(userId, {
    autoConnect: !!userId,
    reconnect: false, // Disable auto-reconnect - we'll handle it manually if needed
    onError: (err) => {
      console.error('❌ QueueMatching: WebSocket error:', err);
      setError('Connection error. Please check if the server is running.');
    },
  });
  
  console.log('🔍 QueueMatching: WebSocket state - connectionState:', connectionState, 'isConnected:', isConnected);

  // Join queue when connected
  useEffect(() => {
    if (isConnected && role && sendMessage) {
      console.log('WebSocket connected, joining queue...', { role, resumeId });
      try {
        sendMessage({
          type: 'JOIN_QUEUE',
          role,
          resume_id: resumeId,
        });
        console.log('✅ JOIN_QUEUE message sent');
      } catch (err) {
        console.error('Error joining queue:', err);
        setError('Failed to join queue. Please try again.');
      }
    }
  }, [isConnected, role, resumeId, sendMessage]);

  // Handle match notification
  useEffect(() => {
    if (!isConnected || !userId) return;

    const unsubscribe = on('MATCHED', (message) => {
      console.log('🎉 MATCHED message received!', message);
      try {
        onMatch({
          roomId: message.room_id,
          partnerId: message.partner_id,
          partnerRole: message.partner_role,
          resumeId: message.resume_id,
        });
        console.log('✅ onMatch callback called successfully');
      } catch (err) {
        console.error('❌ Error in onMatch callback:', err);
        setError('Error processing match. Please try again.');
      }
    });

    // Also listen for queue joined
    const unsubscribeQueue = on('QUEUE_JOINED', (message) => {
      console.log('Joined queue:', message);
    });

    // Listen for errors
    const unsubscribeError = on('ERROR', (message) => {
      console.error('Queue error:', message);
      setError(message.message || 'An error occurred');
    });

    return () => {
      unsubscribe();
      unsubscribeQueue();
      unsubscribeError();
    };
  }, [isConnected, userId, on, onMatch]);

  // Update error state from WebSocket
  useEffect(() => {
    if (wsError) {
      setError(wsError);
    }
  }, [wsError]);

  if (error) {
    return (
      <div className="queue-matching-error">
        <div className="error-message">
          <p>{error}</p>
          {onCancel && (
            <button className="error-retry-button" onClick={onCancel}>
              Go Back
            </button>
          )}
        </div>
      </div>
    );
  }

  if (!userId) {
    return (
      <LoadingScreen
        title="Loading..."
        message="Preparing to connect..."
      />
    );
  }

  const getStatusMessage = () => {
    switch (connectionState) {
      case 'connecting':
        return 'Connecting to server...';
      case 'connected':
        return role === 'reviewer'
          ? 'Looking for a resume to review...'
          : 'Looking for a reviewer...';
      case 'reconnecting':
        return 'Reconnecting...';
      case 'error':
        return 'Connection error. Please try again.';
      default:
        return 'Waiting...';
    }
  };

  return (
    <div className="queue-matching-container">
      <LoadingScreen
        title={role === 'reviewer' ? 'Finding a Resume to Review' : 'Finding a Reviewer'}
        message={getStatusMessage()}
      />
      {onCancel && (
        <div className="queue-matching-actions">
          <button className="cancel-queue-button" onClick={onCancel}>
            Cancel
          </button>
        </div>
      )}
    </div>
  );
}

export default QueueMatching;

