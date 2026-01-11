/**
 * Marker Injector Service
 * Injects milestone and objection markers into transcript timeline
 */

import type {
  TranscriptSegment,
  MilestoneMarker,
  ObjectionMarker,
} from './types';

/**
 * Raw milestone response data from database
 */
export interface MilestoneResponseData {
  id: string;
  milestoneId: string;
  milestoneTitle: string;
  status: 'in_progress' | 'completed' | 'skipped';
  startedAt: Date;
  completedAt?: Date;
}

/**
 * Raw objection response data from database
 */
export interface ObjectionResponseData {
  id: string;
  objectionType: string;
  outcome: 'Resolved' | 'Deferred' | 'Disqualified';
  createdAt: Date;
}

/**
 * Call timeline for marker alignment
 */
export interface CallTimeline {
  /** Call start time */
  startedAt: Date;
  /** Call end time */
  endedAt?: Date;
  /** Milestone responses during call */
  milestoneResponses: MilestoneResponseData[];
  /** Objection responses during call */
  objectionResponses: ObjectionResponseData[];
}

/**
 * Convert a Date to seconds from call start
 */
function dateToSeconds(date: Date, callStartTime: Date): number {
  return (date.getTime() - callStartTime.getTime()) / 1000;
}

/**
 * Find the nearest segment for a given timestamp
 */
function findNearestSegment(
  timestamp: number,
  segments: TranscriptSegment[]
): TranscriptSegment | null {
  if (segments.length === 0) {
    return null;
  }

  let nearestSegment = segments[0];
  let minDistance = Math.abs(segments[0].startTime - timestamp);

  for (const segment of segments) {
    const distance = Math.abs(segment.startTime - timestamp);
    if (distance < minDistance) {
      minDistance = distance;
      nearestSegment = segment;
    }
  }

  return nearestSegment;
}

/**
 * Generate milestone markers from call data
 */
export function generateMilestoneMarkers(
  timeline: CallTimeline
): MilestoneMarker[] {
  const markers: MilestoneMarker[] = [];

  for (const response of timeline.milestoneResponses) {
    const timestamp = dateToSeconds(response.startedAt, timeline.startedAt);

    // Skip if timestamp is negative (before call started)
    if (timestamp < 0) {
      continue;
    }

    markers.push({
      milestoneId: response.milestoneId,
      title: response.milestoneTitle,
      timestamp,
      status: response.status,
    });
  }

  // Sort by timestamp
  return markers.sort((a, b) => a.timestamp - b.timestamp);
}

/**
 * Generate objection markers from call data
 */
export function generateObjectionMarkers(
  timeline: CallTimeline
): ObjectionMarker[] {
  const markers: ObjectionMarker[] = [];

  for (const response of timeline.objectionResponses) {
    const timestamp = dateToSeconds(response.createdAt, timeline.startedAt);

    // Skip if timestamp is negative
    if (timestamp < 0) {
      continue;
    }

    markers.push({
      objectionResponseId: response.id,
      objectionType: response.objectionType,
      timestamp,
      outcome: response.outcome,
    });
  }

  // Sort by timestamp
  return markers.sort((a, b) => a.timestamp - b.timestamp);
}

/**
 * Inject markers into transcript
 * Aligns markers with nearest segments for precise timeline placement
 */
export function injectMarkers(
  segments: TranscriptSegment[],
  timeline: CallTimeline
): {
  segments: TranscriptSegment[];
  milestoneMarkers: MilestoneMarker[];
  objectionMarkers: ObjectionMarker[];
} {
  const milestoneMarkers = generateMilestoneMarkers(timeline);
  const objectionMarkers = generateObjectionMarkers(timeline);

  // Align markers with nearest segments for better UX
  for (const marker of milestoneMarkers) {
    const nearestSegment = findNearestSegment(marker.timestamp, segments);
    if (nearestSegment) {
      // Snap to segment start time if within 5 seconds
      const distance = Math.abs(nearestSegment.startTime - marker.timestamp);
      if (distance <= 5) {
        marker.timestamp = nearestSegment.startTime;
      }
    }
  }

  for (const marker of objectionMarkers) {
    const nearestSegment = findNearestSegment(marker.timestamp, segments);
    if (nearestSegment) {
      const distance = Math.abs(nearestSegment.startTime - marker.timestamp);
      if (distance <= 5) {
        marker.timestamp = nearestSegment.startTime;
      }
    }
  }

  return {
    segments,
    milestoneMarkers,
    objectionMarkers,
  };
}

/**
 * Get markers in a time range
 */
export function getMarkersInRange(
  milestoneMarkers: MilestoneMarker[],
  objectionMarkers: ObjectionMarker[],
  startTime: number,
  endTime: number
): {
  milestones: MilestoneMarker[];
  objections: ObjectionMarker[];
} {
  return {
    milestones: milestoneMarkers.filter(
      (m) => m.timestamp >= startTime && m.timestamp <= endTime
    ),
    objections: objectionMarkers.filter(
      (o) => o.timestamp >= startTime && o.timestamp <= endTime
    ),
  };
}

/**
 * Create a timeline summary with marker counts
 */
export function createTimelineSummary(
  segments: TranscriptSegment[],
  milestoneMarkers: MilestoneMarker[],
  objectionMarkers: ObjectionMarker[]
): {
  duration: number;
  segmentCount: number;
  milestoneCount: number;
  objectionCount: number;
  completedMilestones: number;
  resolvedObjections: number;
} {
  const duration =
    segments.length > 0
      ? segments[segments.length - 1].endTime - segments[0].startTime
      : 0;

  return {
    duration,
    segmentCount: segments.length,
    milestoneCount: milestoneMarkers.length,
    objectionCount: objectionMarkers.length,
    completedMilestones: milestoneMarkers.filter((m) => m.status === 'completed')
      .length,
    resolvedObjections: objectionMarkers.filter((o) => o.outcome === 'Resolved')
      .length,
  };
}
