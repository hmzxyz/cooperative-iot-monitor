import { useEffect, useRef, useState } from 'react';

const MAX_RECONNECT_DELAY_MS = 30_000;

function buildWebSocketUrl(token) {
  const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
  const baseUrl = new URL('/ws/live', `${protocol}//${window.location.host}`);
  baseUrl.searchParams.set('token', token);
  return baseUrl.toString();
}

export function useLiveReadings({ token, onReadings }) {
  const [connectionState, setConnectionState] = useState(token ? 'connecting' : 'disconnected');
  const onReadingsRef = useRef(onReadings);

  useEffect(() => {
    onReadingsRef.current = onReadings;
  }, [onReadings]);

  useEffect(() => {
    if (!token) {
      setConnectionState('disconnected');
      return undefined;
    }

    let stopped = false;
    let socket = null;
    let reconnectTimer = null;
    let reconnectAttempt = 0;

    const clearReconnect = () => {
      if (reconnectTimer) {
        clearTimeout(reconnectTimer);
        reconnectTimer = null;
      }
    };

    const scheduleReconnect = () => {
      if (stopped) {
        return;
      }
      const delay = Math.min(MAX_RECONNECT_DELAY_MS, 1000 * 2 ** reconnectAttempt);
      reconnectAttempt += 1;
      clearReconnect();
      reconnectTimer = setTimeout(connect, delay);
    };

    const connect = () => {
      clearReconnect();
      setConnectionState('connecting');

      try {
        socket = new WebSocket(buildWebSocketUrl(token));
      } catch (error) {
        console.warn('Backend WebSocket setup failed', error);
        setConnectionState('error');
        scheduleReconnect();
        return;
      }

      socket.onopen = () => {
        reconnectAttempt = 0;
        setConnectionState('live');
      };

      socket.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data);
          if (message?.type === 'reading_batch' && Array.isArray(message.data)) {
            onReadingsRef.current?.(message.data);
          }
        } catch (error) {
          console.warn('Ignored malformed backend WebSocket message', error);
        }
      };

      socket.onerror = () => {
        setConnectionState('error');
      };

      socket.onclose = () => {
        if (stopped) {
          return;
        }
        setConnectionState((current) => (current === 'error' ? 'error' : 'disconnected'));
        scheduleReconnect();
      };
    };

    connect();

    return () => {
      stopped = true;
      clearReconnect();
      if (socket) {
        socket.close();
      }
    };
  }, [token]);

  return { connectionState };
}
