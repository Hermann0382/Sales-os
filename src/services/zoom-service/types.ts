/**
 * Zoom Recording Service Types
 * Type definitions for Zoom API integration and recording management
 */

/**
 * Recording status lifecycle
 */
export type RecordingStatus =
  | 'pending'      // Recording requested, not yet started
  | 'connecting'   // Bot joining meeting
  | 'recording'    // Actively recording
  | 'processing'   // Recording complete, processing
  | 'completed'    // Recording available
  | 'failed';      // Recording failed

/**
 * Zoom meeting information
 */
export interface ZoomMeetingInfo {
  meetingId: string;
  meetingNumber: string;
  hostEmail?: string;
  topic?: string;
  startTime?: Date;
  duration?: number;
  joinUrl: string;
  password?: string;
}

/**
 * Recording session data
 */
export interface RecordingSession {
  id: string;
  callSessionId: string;
  organizationId: string;
  status: RecordingStatus;
  meetingId: string;
  meetingNumber?: string;
  startedAt?: Date;
  endedAt?: Date;
  duration?: number;
  recordingUrl?: string;
  transcriptUrl?: string;
  error?: string;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Input for starting a recording
 */
export interface StartRecordingInput {
  callSessionId: string;
  zoomLink: string;
}

/**
 * Result of starting a recording
 */
export interface StartRecordingResult {
  success: boolean;
  recordingId?: string;
  meetingId?: string;
  error?: string;
}

/**
 * Result of stopping a recording
 */
export interface StopRecordingResult {
  success: boolean;
  duration?: number;
  error?: string;
}

/**
 * Recording details with URLs
 */
export interface RecordingDetails {
  id: string;
  callSessionId: string;
  status: RecordingStatus;
  duration?: number;
  recordingUrl?: string;
  transcriptUrl?: string;
  startedAt?: Date;
  endedAt?: Date;
}

/**
 * Zoom API OAuth token response
 */
export interface ZoomTokenResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
  scope: string;
}

/**
 * Zoom meeting details from API
 */
export interface ZoomMeetingResponse {
  id: number;
  uuid: string;
  host_id: string;
  host_email: string;
  topic: string;
  type: number;
  status: string;
  start_time: string;
  duration: number;
  timezone: string;
  created_at: string;
  join_url: string;
  password?: string;
}

/**
 * Zoom recording file info
 */
export interface ZoomRecordingFile {
  id: string;
  meeting_id: string;
  recording_start: string;
  recording_end: string;
  file_type: 'MP4' | 'M4A' | 'TRANSCRIPT' | 'CHAT' | 'CC';
  file_extension: string;
  file_size: number;
  play_url?: string;
  download_url?: string;
  status: string;
  recording_type: string;
}

/**
 * Zoom recordings response
 */
export interface ZoomRecordingsResponse {
  uuid: string;
  id: number;
  account_id: string;
  host_id: string;
  topic: string;
  type: number;
  start_time: string;
  timezone: string;
  duration: number;
  total_size: number;
  recording_count: number;
  recording_files: ZoomRecordingFile[];
}

/**
 * Zoom link parsing result
 */
export interface ParsedZoomLink {
  isValid: boolean;
  meetingId?: string;
  password?: string;
  domain?: string;
  originalUrl: string;
}

/**
 * Zoom webhook event types
 */
export type ZoomWebhookEventType =
  | 'meeting.started'
  | 'meeting.ended'
  | 'recording.started'
  | 'recording.stopped'
  | 'recording.completed'
  | 'recording.transcript_completed';

/**
 * Zoom webhook payload
 */
export interface ZoomWebhookPayload {
  event: ZoomWebhookEventType;
  event_ts: number;
  payload: {
    account_id: string;
    object: {
      id: number;
      uuid: string;
      host_id: string;
      topic: string;
      type: number;
      start_time: string;
      duration?: number;
      recording_files?: ZoomRecordingFile[];
    };
  };
}
