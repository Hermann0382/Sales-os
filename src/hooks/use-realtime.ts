/**
 * useRealtime Hook - WebSocket connection management for real-time features
 * Provides unified interface for real-time communication
 */

import { useCallback, useEffect, useRef, useState } from 'react';

type EventHandler<T = unknown> = (data: T) => void;

interface RealtimeEvent<T = unknown> {
  type: string;
  payload: T;
  timestamp: number;
}

interface UseRealtimeOptions {
  url?: string;
  autoConnect?: boolean;
  reconnect?: boolean;
  reconnectInterval?: number;
  maxReconnectAttempts?: number;
  onConnect?: () => void;
  onDisconnect?: () => void;
  onError?: (error: Event) => void;
}

interface UseRealtimeReturn {
  // Connection state
  isConnected: boolean;
  isConnecting: boolean;
  error: string | null;
  reconnectAttempts: number;

  // Actions
  connect: () => void;
  disconnect: () => void;
  send: <T>(type: string, payload: T) => void;
  joinRoom: (roomId: string) => void;
  leaveRoom: (roomId: string) => void;

  // Event handling
  on: <T>(event: string, handler: EventHandler<T>) => () => void;
  off: (event: string, handler: EventHandler) => void;
}

export function useRealtime(options: UseRealtimeOptions = {}): UseRealtimeReturn {
  const {
    url = process.env.NEXT_PUBLIC_WS_URL || 'ws://localhost:3001',
    autoConnect = false,
    reconnect = true,
    reconnectInterval = 3000,
    maxReconnectAttempts = 5,
    onConnect,
    onDisconnect,
    onError,
  } = options;

  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [reconnectAttempts, setReconnectAttempts] = useState(0);

  const wsRef = useRef<WebSocket | null>(null);
  const handlersRef = useRef<Map<string, Set<EventHandler>>>(new Map());
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Register event handler
  const on = useCallback(<T>(event: string, handler: EventHandler<T>) => {
    if (!handlersRef.current.has(event)) {
      handlersRef.current.set(event, new Set());
    }
    handlersRef.current.get(event)!.add(handler as EventHandler);

    // Return unsubscribe function
    return () => {
      handlersRef.current.get(event)?.delete(handler as EventHandler);
    };
  }, []);

  // Unregister event handler
  const off = useCallback((event: string, handler: EventHandler) => {
    handlersRef.current.get(event)?.delete(handler);
  }, []);

  // Emit event to handlers
  const emit = useCallback((event: string, data: unknown) => {
    const handlers = handlersRef.current.get(event);
    handlers?.forEach((handler) => handler(data));
  }, []);

  // Connect to WebSocket
  const connect = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN || isConnecting) return;

    setIsConnecting(true);
    setError(null);

    try {
      wsRef.current = new WebSocket(url);

      wsRef.current.onopen = () => {
        setIsConnected(true);
        setIsConnecting(false);
        setReconnectAttempts(0);
        setError(null);
        onConnect?.();
        emit('connected', null);
      };

      wsRef.current.onclose = () => {
        setIsConnected(false);
        setIsConnecting(false);
        onDisconnect?.();
        emit('disconnected', null);

        // Attempt reconnection
        if (reconnect && reconnectAttempts < maxReconnectAttempts) {
          reconnectTimeoutRef.current = setTimeout(() => {
            setReconnectAttempts((prev) => prev + 1);
            connect();
          }, reconnectInterval);
        }
      };

      wsRef.current.onerror = (event) => {
        setError('WebSocket connection error');
        setIsConnecting(false);
        onError?.(event);
        emit('error', event);
      };

      wsRef.current.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data) as RealtimeEvent;
          emit(data.type, data.payload);
          emit('message', data);
        } catch {
          console.error('Failed to parse WebSocket message');
        }
      };
    } catch (err) {
      setError('Failed to create WebSocket connection');
      setIsConnecting(false);
    }
  }, [url, isConnecting, reconnect, reconnectAttempts, maxReconnectAttempts, reconnectInterval, onConnect, onDisconnect, onError, emit]);

  // Disconnect from WebSocket
  const disconnect = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
    }
    wsRef.current?.close();
    wsRef.current = null;
    setIsConnected(false);
    setIsConnecting(false);
    setReconnectAttempts(0);
  }, []);

  // Send message
  const send = useCallback(<T>(type: string, payload: T) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      const event: RealtimeEvent<T> = {
        type,
        payload,
        timestamp: Date.now(),
      };
      wsRef.current.send(JSON.stringify(event));
    } else {
      console.warn('WebSocket not connected, cannot send message');
    }
  }, []);

  // Join room (for call-specific channels)
  const joinRoom = useCallback(
    (roomId: string) => {
      send('join_room', { roomId });
    },
    [send]
  );

  // Leave room
  const leaveRoom = useCallback(
    (roomId: string) => {
      send('leave_room', { roomId });
    },
    [send]
  );

  // Auto-connect on mount if enabled
  useEffect(() => {
    if (autoConnect) {
      connect();
    }

    return () => {
      disconnect();
    };
  }, [autoConnect, connect, disconnect]);

  return {
    isConnected,
    isConnecting,
    error,
    reconnectAttempts,
    connect,
    disconnect,
    send,
    joinRoom,
    leaveRoom,
    on,
    off,
  };
}
