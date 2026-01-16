/**
 * usePresentation Hook - Manages presentation mode synchronization
 *
 * Communication Strategy:
 * 1. BroadcastChannel (primary): Used for same-device sync (<10ms latency)
 * 2. WebSocket (fallback): Used when BroadcastChannel unavailable (~100ms latency)
 *
 * This dual-layer approach ensures optimal performance in the most common case
 * (same device) while maintaining cross-device capability when needed.
 */

import { useCallback, useEffect, useRef, useState } from 'react';

import { useSlideStore, useCallStore } from '@/stores';
import type { PresentationState, SlideTemplate, SlideSyncEvent } from '@/lib/types';
import {
  PresentationBroadcastChannel,
  type BroadcastChannelMessage,
} from '@/lib/realtime';

export interface UsePresentationOptions {
  onSlideChange?: (slideIndex: number) => void;
  onPresentationStart?: () => void;
  onPresentationEnd?: () => void;
  /** Prefer WebSocket over BroadcastChannel (for cross-device scenarios) */
  preferWebSocket?: boolean;
}

export interface UsePresentationReturn {
  // State
  isActive: boolean;
  currentSlideIndex: number;
  totalSlides: number;
  currentSlide: SlideTemplate | null;
  presentation: PresentationState;
  isConnected: boolean;
  syncMethod: 'broadcast' | 'websocket' | 'none';
  error: string | null;

  // Actions
  startPresentation: () => void;
  endPresentation: () => void;
  goToSlide: (index: number) => void;
  nextSlide: () => void;
  previousSlide: () => void;

  // Connection Management
  connect: () => void;
  disconnect: () => void;
  broadcastSlideChange: (index: number) => void;

  // Presentation URL
  getPresentationUrl: () => string;
  openPresentationWindow: () => Window | null;
}

export function usePresentation(
  options: UsePresentationOptions = {}
): UsePresentationReturn {
  const {
    onSlideChange,
    onPresentationStart,
    onPresentationEnd,
    preferWebSocket = false,
  } = options;

  const {
    templates,
    presentation,
    startPresentation: storeStartPresentation,
    endPresentation: storeEndPresentation,
    goToSlide: storeGoToSlide,
    nextSlide: storeNextSlide,
    previousSlide: storePreviousSlide,
  } = useSlideStore();

  const { activeCall } = useCallStore();

  const [isConnected, setIsConnected] = useState(false);
  const [syncMethod, setSyncMethod] = useState<'broadcast' | 'websocket' | 'none'>('none');
  const [error, setError] = useState<string | null>(null);

  // Refs for connections
  const broadcastChannelRef = useRef<PresentationBroadcastChannel | null>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const presentationWindowRef = useRef<Window | null>(null);

  // Current slide
  const currentSlide = templates[presentation.currentSlideIndex] || null;

  // Handle sync events from other clients
  const handleSyncEvent = useCallback(
    (event: SlideSyncEvent) => {
      switch (event.type) {
        case 'slide_change':
          if (event.slideIndex !== undefined) {
            storeGoToSlide(event.slideIndex);
            onSlideChange?.(event.slideIndex);
          }
          break;
        case 'presentation_start':
          storeStartPresentation();
          onPresentationStart?.();
          break;
        case 'presentation_end':
          storeEndPresentation();
          onPresentationEnd?.();
          break;
      }
    },
    [storeGoToSlide, storeStartPresentation, storeEndPresentation, onSlideChange, onPresentationStart, onPresentationEnd]
  );

  // Connect via BroadcastChannel (primary method)
  const connectBroadcastChannel = useCallback(() => {
    if (!activeCall?.callSessionId) return false;

    // Check if BroadcastChannel is supported
    if (!PresentationBroadcastChannel.isSupported()) {
      return false;
    }

    try {
      broadcastChannelRef.current = new PresentationBroadcastChannel(activeCall.callSessionId);

      // Register event handlers
      broadcastChannelRef.current.on<SlideSyncEvent>('slide_change', (msg: BroadcastChannelMessage<SlideSyncEvent>) => {
        handleSyncEvent(msg.payload);
      });

      broadcastChannelRef.current.on('presentation_start', () => {
        handleSyncEvent({
          type: 'presentation_start',
          callSessionId: activeCall.callSessionId,
          timestamp: Date.now(),
        });
      });

      broadcastChannelRef.current.on('presentation_end', () => {
        handleSyncEvent({
          type: 'presentation_end',
          callSessionId: activeCall.callSessionId,
          timestamp: Date.now(),
        });
      });

      const connected = broadcastChannelRef.current.connect();
      if (connected) {
        setIsConnected(true);
        setSyncMethod('broadcast');
        setError(null);
        return true;
      }
    } catch (err) {
      console.error('[usePresentation] BroadcastChannel connection failed:', err);
    }

    return false;
  }, [activeCall?.callSessionId, handleSyncEvent]);

  // Connect via WebSocket (fallback method)
  const connectWebSocket = useCallback(() => {
    if (!activeCall?.callSessionId) return false;
    if (wsRef.current?.readyState === WebSocket.OPEN) return true;

    try {
      const wsUrl = process.env.NEXT_PUBLIC_WS_URL || 'ws://localhost:3001';
      wsRef.current = new WebSocket(wsUrl);

      wsRef.current.onopen = () => {
        setIsConnected(true);
        setSyncMethod('websocket');
        setError(null);
        // Join room for this call session
        wsRef.current?.send(
          JSON.stringify({
            type: 'join',
            callSessionId: activeCall.callSessionId,
          })
        );
      };

      wsRef.current.onclose = () => {
        if (syncMethod === 'websocket') {
          setIsConnected(false);
          setSyncMethod('none');
        }
      };

      wsRef.current.onerror = () => {
        setError('WebSocket connection failed');
        if (syncMethod === 'websocket') {
          setIsConnected(false);
          setSyncMethod('none');
        }
      };

      wsRef.current.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data) as SlideSyncEvent;
          handleSyncEvent(data);
        } catch {
          console.error('[usePresentation] Failed to parse WebSocket message');
        }
      };

      return true;
    } catch (err) {
      setError('Failed to connect to presentation sync');
      return false;
    }
  }, [activeCall?.callSessionId, handleSyncEvent, syncMethod]);

  // Main connect function - tries BroadcastChannel first, then WebSocket
  const connect = useCallback(() => {
    // If preferWebSocket is set, skip BroadcastChannel
    if (!preferWebSocket) {
      const bcConnected = connectBroadcastChannel();
      if (bcConnected) {
        return;
      }
    }

    // Fallback to WebSocket
    connectWebSocket();
  }, [preferWebSocket, connectBroadcastChannel, connectWebSocket]);

  // Disconnect from all channels
  const disconnect = useCallback(() => {
    // Disconnect BroadcastChannel
    if (broadcastChannelRef.current) {
      broadcastChannelRef.current.disconnect();
      broadcastChannelRef.current = null;
    }

    // Disconnect WebSocket
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }

    setIsConnected(false);
    setSyncMethod('none');
  }, []);

  // Broadcast slide change to other clients
  const broadcastSlideChange = useCallback(
    (index: number) => {
      if (!activeCall) return;

      // Try BroadcastChannel first
      if (broadcastChannelRef.current?.isConnected) {
        broadcastChannelRef.current.broadcastSlideChange(index);
        return;
      }

      // Fallback to WebSocket
      if (wsRef.current?.readyState === WebSocket.OPEN) {
        const event: SlideSyncEvent = {
          type: 'slide_change',
          callSessionId: activeCall.callSessionId,
          slideIndex: index,
          timestamp: Date.now(),
        };
        wsRef.current.send(JSON.stringify(event));
      }
    },
    [activeCall]
  );

  // Broadcast presentation start
  const broadcastPresentationStart = useCallback(() => {
    if (!activeCall) return;

    // Try BroadcastChannel first
    if (broadcastChannelRef.current?.isConnected) {
      broadcastChannelRef.current.broadcastPresentationStart();
      return;
    }

    // Fallback to WebSocket
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(
        JSON.stringify({
          type: 'presentation_start',
          callSessionId: activeCall.callSessionId,
          timestamp: Date.now(),
        })
      );
    }
  }, [activeCall]);

  // Broadcast presentation end
  const broadcastPresentationEnd = useCallback(() => {
    if (!activeCall) return;

    // Try BroadcastChannel first
    if (broadcastChannelRef.current?.isConnected) {
      broadcastChannelRef.current.broadcastPresentationEnd();
      return;
    }

    // Fallback to WebSocket
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(
        JSON.stringify({
          type: 'presentation_end',
          callSessionId: activeCall.callSessionId,
          timestamp: Date.now(),
        })
      );
    }
  }, [activeCall]);

  // Start presentation with broadcast
  const startPresentation = useCallback(() => {
    storeStartPresentation();
    connect();

    // Give connection a moment to establish, then broadcast
    setTimeout(() => {
      broadcastPresentationStart();
    }, 50);

    onPresentationStart?.();
  }, [storeStartPresentation, connect, broadcastPresentationStart, onPresentationStart]);

  // End presentation with broadcast
  const endPresentation = useCallback(() => {
    storeEndPresentation();
    broadcastPresentationEnd();
    disconnect();
    presentationWindowRef.current?.close();
    onPresentationEnd?.();
  }, [storeEndPresentation, broadcastPresentationEnd, disconnect, onPresentationEnd]);

  // Navigation with broadcast
  const goToSlide = useCallback(
    (index: number) => {
      storeGoToSlide(index);
      broadcastSlideChange(index);
      onSlideChange?.(index);
    },
    [storeGoToSlide, broadcastSlideChange, onSlideChange]
  );

  const nextSlide = useCallback(() => {
    const newIndex = Math.min(presentation.currentSlideIndex + 1, templates.length - 1);
    storeNextSlide();
    broadcastSlideChange(newIndex);
    onSlideChange?.(newIndex);
  }, [storeNextSlide, broadcastSlideChange, presentation.currentSlideIndex, templates.length, onSlideChange]);

  const previousSlide = useCallback(() => {
    const newIndex = Math.max(presentation.currentSlideIndex - 1, 0);
    storePreviousSlide();
    broadcastSlideChange(newIndex);
    onSlideChange?.(newIndex);
  }, [storePreviousSlide, broadcastSlideChange, presentation.currentSlideIndex, onSlideChange]);

  // Get presentation URL for client view
  const getPresentationUrl = useCallback(() => {
    if (!activeCall) return '';
    const baseUrl = typeof window !== 'undefined' ? window.location.origin : '';
    return `${baseUrl}/agent/call/${activeCall.callSessionId}/presentation`;
  }, [activeCall]);

  // Open presentation in new window
  const openPresentationWindow = useCallback(() => {
    const url = getPresentationUrl();
    if (!url) return null;

    presentationWindowRef.current = window.open(
      url,
      'CallOS Presentation',
      'width=1280,height=720,menubar=no,toolbar=no,location=no,status=no'
    );

    return presentationWindowRef.current;
  }, [getPresentationUrl]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      disconnect();
      presentationWindowRef.current?.close();
    };
  }, [disconnect]);

  return {
    isActive: presentation.isActive,
    currentSlideIndex: presentation.currentSlideIndex,
    totalSlides: presentation.totalSlides,
    currentSlide,
    presentation,
    isConnected,
    syncMethod,
    error,
    startPresentation,
    endPresentation,
    goToSlide,
    nextSlide,
    previousSlide,
    connect,
    disconnect,
    broadcastSlideChange,
    getPresentationUrl,
    openPresentationWindow,
  };
}
