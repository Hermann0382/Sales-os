/**
 * Transcript Service Types
 * Type definitions for call transcript generation and processing
 */

/**
 * Speaker identification
 */
export type SpeakerRole = 'agent' | 'prospect' | 'unknown';

/**
 * Individual transcript segment with timing
 */
export interface TranscriptSegment {
  /** Unique ID for this segment */
  id: string;
  /** Speaker role (agent, prospect, or unknown) */
  speaker: SpeakerRole;
  /** Speaker display name if available */
  speakerName?: string;
  /** Transcribed text content */
  text: string;
  /** Start time in seconds from recording start */
  startTime: number;
  /** End time in seconds from recording start */
  endTime: number;
  /** Transcription confidence score (0-1) */
  confidence: number;
}

/**
 * Milestone marker in transcript timeline
 */
export interface MilestoneMarker {
  /** Milestone ID from database */
  milestoneId: string;
  /** Milestone title for display */
  title: string;
  /** Timestamp when milestone was started/marked */
  timestamp: number;
  /** Status of the milestone response */
  status: 'in_progress' | 'completed' | 'skipped';
}

/**
 * Objection marker in transcript timeline
 */
export interface ObjectionMarker {
  /** Objection response ID from database */
  objectionResponseId: string;
  /** Objection type */
  objectionType: string;
  /** Timestamp when objection was logged */
  timestamp: number;
  /** Outcome of the objection */
  outcome: 'Resolved' | 'Deferred' | 'Disqualified';
}

/**
 * Complete transcript with segments and markers
 */
export interface Transcript {
  /** Recording session ID */
  recordingId: string;
  /** Call session ID */
  callSessionId: string;
  /** Total duration in seconds */
  duration: number;
  /** Language of the transcript */
  language: 'EN' | 'DE';
  /** Transcript segments in chronological order */
  segments: TranscriptSegment[];
  /** Milestone markers on timeline */
  milestoneMarkers: MilestoneMarker[];
  /** Objection markers on timeline */
  objectionMarkers: ObjectionMarker[];
  /** Generation timestamp */
  generatedAt: Date;
  /** Transcript processing status */
  status: 'processing' | 'completed' | 'failed';
  /** Error message if failed */
  error?: string;
}

/**
 * Input for transcript generation
 */
export interface GenerateTranscriptInput {
  /** Recording session ID */
  recordingId: string;
  /** Call session ID */
  callSessionId: string;
  /** URL to the recording file */
  recordingUrl: string;
  /** URL to existing transcript if available (from Zoom) */
  transcriptUrl?: string;
  /** Preferred language */
  language?: 'EN' | 'DE';
}

/**
 * Result of transcript generation
 */
export interface GenerateTranscriptResult {
  success: boolean;
  transcript?: Transcript;
  error?: string;
}

/**
 * Raw transcript from external service (Zoom, AssemblyAI, etc.)
 */
export interface RawTranscriptData {
  /** Array of raw segments from transcription service */
  segments: Array<{
    speaker?: string;
    text: string;
    start: number;
    end: number;
    confidence?: number;
  }>;
  /** Total duration */
  duration: number;
  /** Language detected or specified */
  language?: string;
}

/**
 * Speaker detection hints
 */
export interface SpeakerHints {
  /** Agent name for matching */
  agentName?: string;
  /** Agent email for matching */
  agentEmail?: string;
  /** Prospect name for matching */
  prospectName?: string;
  /** Known speaker labels from Zoom */
  knownSpeakers?: Array<{
    label: string;
    role: SpeakerRole;
  }>;
}

/**
 * Transcript search query
 */
export interface TranscriptSearchQuery {
  /** Keyword to search for */
  keyword: string;
  /** Filter by speaker role */
  speaker?: SpeakerRole;
  /** Time range filter (start) */
  fromTime?: number;
  /** Time range filter (end) */
  toTime?: number;
}

/**
 * Transcript search result
 */
export interface TranscriptSearchResult {
  /** Matching segments */
  matches: Array<{
    segment: TranscriptSegment;
    /** Highlighted text with match markers */
    highlightedText: string;
    /** Match score for ranking */
    score: number;
  }>;
  /** Total number of matches */
  totalMatches: number;
}

/**
 * Transcript export format
 */
export type TranscriptExportFormat = 'txt' | 'vtt' | 'srt' | 'json';

/**
 * Transcript export options
 */
export interface TranscriptExportOptions {
  /** Export format */
  format: TranscriptExportFormat;
  /** Include timestamps */
  includeTimestamps?: boolean;
  /** Include speaker labels */
  includeSpeakers?: boolean;
  /** Include milestone markers */
  includeMarkers?: boolean;
}
