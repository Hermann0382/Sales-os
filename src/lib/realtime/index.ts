/**
 * Real-time Communication Module
 *
 * This module provides real-time communication utilities for synchronizing
 * state between different parts of the application (control panel, presentation view).
 *
 * Communication Strategy:
 * 1. BroadcastChannel (primary): Used for same-device communication (<10ms latency)
 * 2. WebSocket (fallback): Used for cross-device communication (~100ms latency)
 */

export {
  PresentationBroadcastChannel,
  createPresentationChannel,
  createManagedChannel,
  type BroadcastChannelMessage,
  type PresentationBroadcastState,
  type UseBroadcastChannelOptions,
} from './broadcast-channel';
