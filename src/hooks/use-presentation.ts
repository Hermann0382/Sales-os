/**
 * usePresentation Hook - Manages presentation mode synchronization
 * Handles WebSocket connection for real-time slide sync
 */

import { useCallback, useEffect, useRef, useState } from 'react';

import { useSlideStore, useCallStore } from '@/stores';
import { PresentationState, SlideTemplate, SlideSyncEvent } from '@/lib/types';

interface UsePresentationOptions {
  onSlideChange?: (slideIndex: number) => void;
  onPresentationStart?: () => void;
  onPresentationEnd?: () => void;
}

interface UsePresentationReturn {
  // State
  isActive: boolean;
  currentSlideIndex: number;
  totalSlides: number;
  currentSlide: SlideTemplate | null;
  presentation: PresentationState;
  isConnected: boolean;
  error: string | null;

  // Actions
  startPresentation: () => void;
  endPresentation: () => void;
  goToSlide: (index: number) => void;
  nextSlide: () => void;
  previousSlide: () => void;

  // WebSocket
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
  const { onSlideChange, onPresentationStart, onPresentationEnd } = options;

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
  const [error, setError] = useState<string | null>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const presentationWindowRef = useRef<Window | null>(null);

  // Current slide
  const currentSlide = templates[presentation.currentSlideIndex] || null;

  // Connect to WebSocket
  const connect = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) return;

    try {
      // WebSocket URL would come from environment
      const wsUrl = process.env.NEXT_PUBLIC_WS_URL || 'ws://localhost:3001';
      wsRef.current = new WebSocket(wsUrl);

      wsRef.current.onopen = () => {
        setIsConnected(true);
        setError(null);
        // Join room for this call session
        if (activeCall?.callSessionId) {
          wsRef.current?.send(
            JSON.stringify({
              type: 'join',
              callSessionId: activeCall.callSessionId,
            })
          );
        }
      };

      wsRef.current.onclose = () => {
        setIsConnected(false);
      };

      wsRef.current.onerror = () => {
        setError('WebSocket connection failed');
        setIsConnected(false);
      };

      wsRef.current.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data) as SlideSyncEvent;
          handleSyncEvent(data);
        } catch {
          console.error('Failed to parse WebSocket message');
        }
      };
    } catch (err) {
      setError('Failed to connect to presentation sync');
    }
  }, [activeCall?.callSessionId]);

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

  // Disconnect from WebSocket
  const disconnect = useCallback(() => {
    wsRef.current?.close();
    wsRef.current = null;
    setIsConnected(false);
  }, []);

  // Broadcast slide change to other clients
  const broadcastSlideChange = useCallback(
    (index: number) => {
      if (wsRef.current?.readyState === WebSocket.OPEN && activeCall) {
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

  // Start presentation with broadcast
  const startPresentation = useCallback(() => {
    storeStartPresentation();
    connect();
    if (wsRef.current?.readyState === WebSocket.OPEN && activeCall) {
      wsRef.current.send(
        JSON.stringify({
          type: 'presentation_start',
          callSessionId: activeCall.callSessionId,
          timestamp: Date.now(),
        })
      );
    }
    onPresentationStart?.();
  }, [storeStartPresentation, connect, activeCall, onPresentationStart]);

  // End presentation with broadcast
  const endPresentation = useCallback(() => {
    storeEndPresentation();
    if (wsRef.current?.readyState === WebSocket.OPEN && activeCall) {
      wsRef.current.send(
        JSON.stringify({
          type: 'presentation_end',
          callSessionId: activeCall.callSessionId,
          timestamp: Date.now(),
        })
      );
    }
    disconnect();
    presentationWindowRef.current?.close();
    onPresentationEnd?.();
  }, [storeEndPresentation, activeCall, disconnect, onPresentationEnd]);

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
    storeNextSlide();
    broadcastSlideChange(presentation.currentSlideIndex + 1);
    onSlideChange?.(presentation.currentSlideIndex + 1);
  }, [storeNextSlide, broadcastSlideChange, presentation.currentSlideIndex, onSlideChange]);

  const previousSlide = useCallback(() => {
    storePreviousSlide();
    broadcastSlideChange(presentation.currentSlideIndex - 1);
    onSlideChange?.(presentation.currentSlideIndex - 1);
  }, [storePreviousSlide, broadcastSlideChange, presentation.currentSlideIndex, onSlideChange]);

  // Get presentation URL for client view
  const getPresentationUrl = useCallback(() => {
    if (!activeCall) return '';
    const baseUrl = window.location.origin;
    return `${baseUrl}/call/${activeCall.callSessionId}/presentation`;
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
