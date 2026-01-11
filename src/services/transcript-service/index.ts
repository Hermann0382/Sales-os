/**
 * Transcript Service Module
 * Exports all transcript-related services and utilities
 */

// Main transcript service
export { transcriptService } from './transcript-service';

// Speaker detection
export { SpeakerDetector, createSpeakerDetector } from './speaker-detector';

// Marker injection
export {
  generateMilestoneMarkers,
  generateObjectionMarkers,
  injectMarkers,
  getMarkersInRange,
  createTimelineSummary,
} from './marker-injector';
export type {
  MilestoneResponseData,
  ObjectionResponseData,
  CallTimeline,
} from './marker-injector';

// Types
export type {
  SpeakerRole,
  TranscriptSegment,
  MilestoneMarker,
  ObjectionMarker,
  Transcript,
  GenerateTranscriptInput,
  GenerateTranscriptResult,
  RawTranscriptData,
  SpeakerHints,
  TranscriptSearchQuery,
  TranscriptSearchResult,
  TranscriptExportFormat,
  TranscriptExportOptions,
} from './types';
