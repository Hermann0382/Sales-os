/**
 * BroadcastChannel Utility for Same-Device Tab Communication
 *
 * This module provides a communication layer for synchronizing presentation
 * state between the agent's control panel and the client-facing presentation
 * window when they're on the same device (most common use case).
 *
 * Advantages over WebSocket for same-device:
 * - Zero network latency (<10ms vs ~100ms)
 * - No server dependency
 * - Works offline
 * - Simpler architecture
 */

import type { SlideSyncEvent } from '@/lib/types';

// Channel name for presentation sync
const PRESENTATION_CHANNEL_NAME = 'callos-presentation-sync';

export interface BroadcastChannelMessage<T = unknown> {
  type: string;
  callSessionId: string;
  payload: T;
  timestamp: number;
  senderId: string;
}

export interface PresentationBroadcastState {
  isConnected: boolean;
  lastEvent: SlideSyncEvent | null;
  error: string | null;
}

type MessageHandler<T = unknown> = (message: BroadcastChannelMessage<T>) => void;

/**
 * PresentationBroadcastChannel
 *
 * Manages BroadcastChannel communication for presentation synchronization.
 * Use this for same-device communication between control panel and presentation view.
 */
export class PresentationBroadcastChannel {
  private channel: BroadcastChannel | null = null;
  private callSessionId: string;
  private senderId: string;
  private handlers: Map<string, Set<MessageHandler>> = new Map();
  private isSupported: boolean;
  private _isConnected: boolean = false;

  constructor(callSessionId: string) {
    this.callSessionId = callSessionId;
    this.senderId = `${callSessionId}-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
    this.isSupported = typeof BroadcastChannel !== 'undefined';
  }

  /**
   * Check if BroadcastChannel API is supported in this environment
   */
  static isSupported(): boolean {
    return typeof BroadcastChannel !== 'undefined';
  }

  /**
   * Connect to the broadcast channel
   */
  connect(): boolean {
    if (!this.isSupported) {
      console.warn('[BroadcastChannel] API not supported in this environment');
      return false;
    }

    if (this.channel) {
      return true; // Already connected
    }

    try {
      const channelName = `${PRESENTATION_CHANNEL_NAME}-${this.callSessionId}`;
      this.channel = new BroadcastChannel(channelName);

      this.channel.onmessage = (event: MessageEvent<BroadcastChannelMessage>) => {
        // Ignore messages from self
        if (event.data.senderId === this.senderId) {
          return;
        }

        // Only process messages for this call session
        if (event.data.callSessionId !== this.callSessionId) {
          return;
        }

        this.handleMessage(event.data);
      };

      this.channel.onmessageerror = (event) => {
        console.error('[BroadcastChannel] Message error:', event);
      };

      this._isConnected = true;

      // Announce presence
      this.send('channel_join', { joinedAt: Date.now() });

      return true;
    } catch (error) {
      console.error('[BroadcastChannel] Failed to connect:', error);
      return false;
    }
  }

  /**
   * Disconnect from the broadcast channel
   */
  disconnect(): void {
    if (this.channel) {
      // Announce departure
      this.send('channel_leave', { leftAt: Date.now() });

      this.channel.close();
      this.channel = null;
      this._isConnected = false;
    }
    this.handlers.clear();
  }

  /**
   * Check if connected to the channel
   */
  get isConnected(): boolean {
    return this._isConnected && this.channel !== null;
  }

  /**
   * Send a message to all other tabs in this channel
   */
  send<T>(type: string, payload: T): boolean {
    if (!this.channel) {
      console.warn('[BroadcastChannel] Not connected, cannot send message');
      return false;
    }

    const message: BroadcastChannelMessage<T> = {
      type,
      callSessionId: this.callSessionId,
      payload,
      timestamp: Date.now(),
      senderId: this.senderId,
    };

    try {
      this.channel.postMessage(message);
      return true;
    } catch (error) {
      console.error('[BroadcastChannel] Failed to send message:', error);
      return false;
    }
  }

  /**
   * Broadcast a slide navigation event
   */
  broadcastSlideChange(slideIndex: number, slideInstanceId?: string): boolean {
    const event: SlideSyncEvent = {
      type: 'slide_change',
      callSessionId: this.callSessionId,
      slideIndex,
      slideInstanceId,
      timestamp: Date.now(),
    };

    return this.send('slide_change', event);
  }

  /**
   * Broadcast presentation start event
   */
  broadcastPresentationStart(): boolean {
    const event: SlideSyncEvent = {
      type: 'presentation_start',
      callSessionId: this.callSessionId,
      timestamp: Date.now(),
    };

    return this.send('presentation_start', event);
  }

  /**
   * Broadcast presentation end event
   */
  broadcastPresentationEnd(): boolean {
    const event: SlideSyncEvent = {
      type: 'presentation_end',
      callSessionId: this.callSessionId,
      timestamp: Date.now(),
    };

    return this.send('presentation_end', event);
  }

  /**
   * Subscribe to a specific event type
   * @returns Unsubscribe function
   */
  on<T>(eventType: string, handler: MessageHandler<T>): () => void {
    if (!this.handlers.has(eventType)) {
      this.handlers.set(eventType, new Set());
    }

    const handlerSet = this.handlers.get(eventType)!;
    handlerSet.add(handler as MessageHandler);

    // Return unsubscribe function
    return () => {
      handlerSet.delete(handler as MessageHandler);
      if (handlerSet.size === 0) {
        this.handlers.delete(eventType);
      }
    };
  }

  /**
   * Unsubscribe from a specific event type
   */
  off<T>(eventType: string, handler: MessageHandler<T>): void {
    const handlerSet = this.handlers.get(eventType);
    if (handlerSet) {
      handlerSet.delete(handler as MessageHandler);
      if (handlerSet.size === 0) {
        this.handlers.delete(eventType);
      }
    }
  }

  /**
   * Handle incoming messages and dispatch to registered handlers
   */
  private handleMessage(message: BroadcastChannelMessage): void {
    // Dispatch to type-specific handlers
    const typeHandlers = this.handlers.get(message.type);
    if (typeHandlers) {
      typeHandlers.forEach((handler) => {
        try {
          handler(message);
        } catch (error) {
          console.error(`[BroadcastChannel] Handler error for ${message.type}:`, error);
        }
      });
    }

    // Dispatch to wildcard handlers
    const wildcardHandlers = this.handlers.get('*');
    if (wildcardHandlers) {
      wildcardHandlers.forEach((handler) => {
        try {
          handler(message);
        } catch (error) {
          console.error('[BroadcastChannel] Wildcard handler error:', error);
        }
      });
    }
  }
}

/**
 * Create a presentation broadcast channel instance
 * Returns null if BroadcastChannel is not supported
 */
export function createPresentationChannel(callSessionId: string): PresentationBroadcastChannel | null {
  if (!PresentationBroadcastChannel.isSupported()) {
    return null;
  }
  return new PresentationBroadcastChannel(callSessionId);
}

/**
 * Hook-friendly interface for using BroadcastChannel
 * Provides automatic cleanup and state management
 */
export interface UseBroadcastChannelOptions {
  callSessionId: string;
  autoConnect?: boolean;
  onSlideChange?: (event: SlideSyncEvent) => void;
  onPresentationStart?: () => void;
  onPresentationEnd?: () => void;
}

/**
 * Create a managed broadcast channel with automatic cleanup
 * Suitable for use within React hooks
 */
export function createManagedChannel(
  options: UseBroadcastChannelOptions
): {
  channel: PresentationBroadcastChannel | null;
  connect: () => boolean;
  disconnect: () => void;
  isSupported: boolean;
} {
  const channel = createPresentationChannel(options.callSessionId);

  if (!channel) {
    return {
      channel: null,
      connect: () => false,
      disconnect: () => { /* noop */ },
      isSupported: false,
    };
  }

  // Register event handlers if provided
  if (options.onSlideChange) {
    channel.on<SlideSyncEvent>('slide_change', (msg) => {
      options.onSlideChange?.(msg.payload as SlideSyncEvent);
    });
  }

  if (options.onPresentationStart) {
    channel.on('presentation_start', () => {
      options.onPresentationStart?.();
    });
  }

  if (options.onPresentationEnd) {
    channel.on('presentation_end', () => {
      options.onPresentationEnd?.();
    });
  }

  // Auto-connect if requested
  if (options.autoConnect) {
    channel.connect();
  }

  return {
    channel,
    connect: () => channel.connect(),
    disconnect: () => channel.disconnect(),
    isSupported: true,
  };
}
