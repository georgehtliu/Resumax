/**
 * WebSocket Configuration
 * 
 * Configuration for WebSocket connections to the collaboration server
 */

// Get WebSocket URL from environment or use default
const getWebSocketUrl = () => {
  // Check for environment variable (Vite)
  if (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.VITE_WS_URL) {
    return import.meta.env.VITE_WS_URL;
  }
  
  // Check localStorage for custom URL
  try {
    const stored = localStorage.getItem('resumax_ws_url');
    if (stored && typeof stored === 'string' && stored.trim().length > 0) {
      return stored.trim();
    }
  } catch (error) {
    console.warn('Unable to read stored WebSocket URL:', error);
  }
  
  // Default to localhost for development
  // Convert http://localhost:8000 to ws://localhost:8000/ws
  const apiUrl = localStorage.getItem('resumeMasterApiBaseUrl') || 'http://localhost:8000/api/v1';
  const baseUrl = apiUrl.replace('/api/v1', '').replace('http://', 'ws://').replace('https://', 'wss://');
  return `${baseUrl}/ws`;
};

export const WS_CONFIG = {
  URL: getWebSocketUrl(),
  RECONNECT_INTERVAL: 3000, // 3 seconds
  MAX_RECONNECT_ATTEMPTS: 5,
  RECONNECT_DELAY_BASE: 1000, // Base delay for exponential backoff
};

