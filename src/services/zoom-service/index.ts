/**
 * Zoom Service Module
 * Exports all Zoom-related services and utilities
 */

// Legacy service (for backwards compatibility)
export { ZoomService, zoomService } from './zoom-service';

// Main recording service
export { zoomRecordingService } from './zoom-recording-service';

// API client (for advanced usage)
export { zoomApiClient } from './zoom-api-client';

// Link detection utilities
export {
  parseZoomLink,
  isZoomLink,
  extractMeetingId,
  normalizeMeetingId,
  formatMeetingId,
} from './link-detector';

// Configuration
export { getZoomConfig, isZoomConfigured, recordingConfig } from '@/lib/config/zoom';

// Types
export type {
  RecordingStatus,
  RecordingSession,
  RecordingDetails,
  StartRecordingInput,
  StartRecordingResult,
  StopRecordingResult,
  ZoomMeetingInfo,
  ParsedZoomLink,
  ZoomWebhookEventType,
  ZoomWebhookPayload,
} from './types';
