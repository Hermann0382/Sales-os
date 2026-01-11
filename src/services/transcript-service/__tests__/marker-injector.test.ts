/**
 * Marker Injector Tests
 * Tests for milestone and objection marker generation and timeline alignment
 */

import {
  generateMilestoneMarkers,
  generateObjectionMarkers,
  injectMarkers,
  getMarkersInRange,
  createTimelineSummary,
  type CallTimeline,
  type MilestoneResponseData,
  type ObjectionResponseData,
} from '../marker-injector';
import type { TranscriptSegment } from '../types';

describe('Marker Injector', () => {
  // Helper to create test data
  const createTimeline = (
    overrides: Partial<CallTimeline> = {}
  ): CallTimeline => ({
    startedAt: new Date('2024-01-15T10:00:00Z'),
    endedAt: new Date('2024-01-15T10:30:00Z'),
    milestoneResponses: [],
    objectionResponses: [],
    ...overrides,
  });

  const createSegment = (
    id: string,
    startTime: number,
    endTime: number
  ): TranscriptSegment => ({
    id,
    speaker: 'agent',
    text: `Segment ${id}`,
    startTime,
    endTime,
    confidence: 0.9,
  });

  describe('generateMilestoneMarkers', () => {
    it('generates empty array for no milestone responses', () => {
      const timeline = createTimeline();
      const markers = generateMilestoneMarkers(timeline);

      expect(markers).toEqual([]);
    });

    it('generates markers for milestone responses', () => {
      const timeline = createTimeline({
        milestoneResponses: [
          {
            id: 'mr1',
            milestoneId: 'm1',
            milestoneTitle: 'Introduction',
            status: 'completed',
            startedAt: new Date('2024-01-15T10:05:00Z'),
            completedAt: new Date('2024-01-15T10:10:00Z'),
          },
        ],
      });

      const markers = generateMilestoneMarkers(timeline);

      expect(markers).toHaveLength(1);
      expect(markers[0]).toEqual({
        milestoneId: 'm1',
        title: 'Introduction',
        timestamp: 300, // 5 minutes = 300 seconds
        status: 'completed',
      });
    });

    it('sorts markers by timestamp', () => {
      const timeline = createTimeline({
        milestoneResponses: [
          {
            id: 'mr2',
            milestoneId: 'm2',
            milestoneTitle: 'Second',
            status: 'completed',
            startedAt: new Date('2024-01-15T10:15:00Z'),
          },
          {
            id: 'mr1',
            milestoneId: 'm1',
            milestoneTitle: 'First',
            status: 'completed',
            startedAt: new Date('2024-01-15T10:05:00Z'),
          },
        ],
      });

      const markers = generateMilestoneMarkers(timeline);

      expect(markers).toHaveLength(2);
      expect(markers[0].title).toBe('First');
      expect(markers[1].title).toBe('Second');
    });

    it('skips milestones started before call', () => {
      const timeline = createTimeline({
        milestoneResponses: [
          {
            id: 'mr1',
            milestoneId: 'm1',
            milestoneTitle: 'Early',
            status: 'completed',
            startedAt: new Date('2024-01-15T09:55:00Z'), // Before call started
          },
        ],
      });

      const markers = generateMilestoneMarkers(timeline);

      expect(markers).toHaveLength(0);
    });

    it('handles different milestone statuses', () => {
      const timeline = createTimeline({
        milestoneResponses: [
          {
            id: 'mr1',
            milestoneId: 'm1',
            milestoneTitle: 'Completed',
            status: 'completed',
            startedAt: new Date('2024-01-15T10:05:00Z'),
          },
          {
            id: 'mr2',
            milestoneId: 'm2',
            milestoneTitle: 'In Progress',
            status: 'in_progress',
            startedAt: new Date('2024-01-15T10:10:00Z'),
          },
          {
            id: 'mr3',
            milestoneId: 'm3',
            milestoneTitle: 'Skipped',
            status: 'skipped',
            startedAt: new Date('2024-01-15T10:15:00Z'),
          },
        ],
      });

      const markers = generateMilestoneMarkers(timeline);

      expect(markers).toHaveLength(3);
      expect(markers[0].status).toBe('completed');
      expect(markers[1].status).toBe('in_progress');
      expect(markers[2].status).toBe('skipped');
    });
  });

  describe('generateObjectionMarkers', () => {
    it('generates empty array for no objection responses', () => {
      const timeline = createTimeline();
      const markers = generateObjectionMarkers(timeline);

      expect(markers).toEqual([]);
    });

    it('generates markers for objection responses', () => {
      const timeline = createTimeline({
        objectionResponses: [
          {
            id: 'or1',
            objectionType: 'Price',
            outcome: 'Resolved',
            createdAt: new Date('2024-01-15T10:10:00Z'),
          },
        ],
      });

      const markers = generateObjectionMarkers(timeline);

      expect(markers).toHaveLength(1);
      expect(markers[0]).toEqual({
        objectionResponseId: 'or1',
        objectionType: 'Price',
        timestamp: 600, // 10 minutes = 600 seconds
        outcome: 'Resolved',
      });
    });

    it('handles different objection outcomes', () => {
      const timeline = createTimeline({
        objectionResponses: [
          {
            id: 'or1',
            objectionType: 'Price',
            outcome: 'Resolved',
            createdAt: new Date('2024-01-15T10:10:00Z'),
          },
          {
            id: 'or2',
            objectionType: 'Timing',
            outcome: 'Deferred',
            createdAt: new Date('2024-01-15T10:15:00Z'),
          },
          {
            id: 'or3',
            objectionType: 'Partner_Team',
            outcome: 'Disqualified',
            createdAt: new Date('2024-01-15T10:20:00Z'),
          },
        ],
      });

      const markers = generateObjectionMarkers(timeline);

      expect(markers).toHaveLength(3);
      expect(markers[0].outcome).toBe('Resolved');
      expect(markers[1].outcome).toBe('Deferred');
      expect(markers[2].outcome).toBe('Disqualified');
    });

    it('skips objections before call started', () => {
      const timeline = createTimeline({
        objectionResponses: [
          {
            id: 'or1',
            objectionType: 'Price',
            outcome: 'Resolved',
            createdAt: new Date('2024-01-15T09:55:00Z'), // Before call
          },
        ],
      });

      const markers = generateObjectionMarkers(timeline);

      expect(markers).toHaveLength(0);
    });
  });

  describe('injectMarkers', () => {
    it('returns empty markers for empty timeline', () => {
      const segments: TranscriptSegment[] = [];
      const timeline = createTimeline();

      const result = injectMarkers(segments, timeline);

      expect(result.segments).toEqual([]);
      expect(result.milestoneMarkers).toEqual([]);
      expect(result.objectionMarkers).toEqual([]);
    });

    it('snaps markers to nearest segment within 5 seconds', () => {
      const segments = [
        createSegment('seg1', 0, 60),
        createSegment('seg2', 60, 120),
        createSegment('seg3', 120, 180),
      ];

      const timeline = createTimeline({
        milestoneResponses: [
          {
            id: 'mr1',
            milestoneId: 'm1',
            milestoneTitle: 'Test',
            status: 'completed',
            startedAt: new Date('2024-01-15T10:01:02Z'), // 62 seconds
          },
        ],
      });

      const result = injectMarkers(segments, timeline);

      // Should snap to segment 2 start time (60)
      expect(result.milestoneMarkers[0].timestamp).toBe(60);
    });

    it('does not snap markers more than 5 seconds away', () => {
      const segments = [
        createSegment('seg1', 0, 60),
        createSegment('seg2', 100, 160), // Gap from 60-100
      ];

      const timeline = createTimeline({
        milestoneResponses: [
          {
            id: 'mr1',
            milestoneId: 'm1',
            milestoneTitle: 'Test',
            status: 'completed',
            startedAt: new Date('2024-01-15T10:01:20Z'), // 80 seconds
          },
        ],
      });

      const result = injectMarkers(segments, timeline);

      // Should NOT snap (more than 5 seconds from any segment start)
      expect(result.milestoneMarkers[0].timestamp).toBe(80);
    });

    it('snaps objection markers to nearest segment', () => {
      const segments = [
        createSegment('seg1', 0, 30),
        createSegment('seg2', 30, 60),
      ];

      const timeline = createTimeline({
        objectionResponses: [
          {
            id: 'or1',
            objectionType: 'Price',
            outcome: 'Resolved',
            createdAt: new Date('2024-01-15T10:00:32Z'), // 32 seconds
          },
        ],
      });

      const result = injectMarkers(segments, timeline);

      // Should snap to segment 2 start time (30)
      expect(result.objectionMarkers[0].timestamp).toBe(30);
    });

    it('preserves original segments reference', () => {
      const segments = [createSegment('seg1', 0, 60)];
      const timeline = createTimeline();

      const result = injectMarkers(segments, timeline);

      expect(result.segments).toBe(segments);
    });
  });

  describe('getMarkersInRange', () => {
    const milestoneMarkers = [
      { milestoneId: 'm1', title: 'A', timestamp: 100, status: 'completed' as const },
      { milestoneId: 'm2', title: 'B', timestamp: 200, status: 'completed' as const },
      { milestoneId: 'm3', title: 'C', timestamp: 300, status: 'completed' as const },
    ];

    const objectionMarkers = [
      { objectionResponseId: 'o1', objectionType: 'Price', timestamp: 150, outcome: 'Resolved' as const },
      { objectionResponseId: 'o2', objectionType: 'Timing', timestamp: 250, outcome: 'Deferred' as const },
    ];

    it('returns all markers within range', () => {
      const result = getMarkersInRange(
        milestoneMarkers,
        objectionMarkers,
        100,
        300
      );

      expect(result.milestones).toHaveLength(3);
      expect(result.objections).toHaveLength(2);
    });

    it('filters markers outside range', () => {
      const result = getMarkersInRange(
        milestoneMarkers,
        objectionMarkers,
        150,
        250
      );

      expect(result.milestones).toHaveLength(1);
      expect(result.milestones[0].title).toBe('B');
      expect(result.objections).toHaveLength(2);
    });

    it('returns empty arrays for no matches', () => {
      const result = getMarkersInRange(
        milestoneMarkers,
        objectionMarkers,
        500,
        600
      );

      expect(result.milestones).toEqual([]);
      expect(result.objections).toEqual([]);
    });

    it('includes markers at boundary timestamps', () => {
      const result = getMarkersInRange(
        milestoneMarkers,
        objectionMarkers,
        100,
        100
      );

      expect(result.milestones).toHaveLength(1);
      expect(result.milestones[0].timestamp).toBe(100);
    });
  });

  describe('createTimelineSummary', () => {
    it('creates summary for empty data', () => {
      const summary = createTimelineSummary([], [], []);

      expect(summary).toEqual({
        duration: 0,
        segmentCount: 0,
        milestoneCount: 0,
        objectionCount: 0,
        completedMilestones: 0,
        resolvedObjections: 0,
      });
    });

    it('calculates duration from segments', () => {
      const segments = [
        createSegment('seg1', 0, 60),
        createSegment('seg2', 60, 120),
        createSegment('seg3', 120, 180),
      ];

      const summary = createTimelineSummary(segments, [], []);

      expect(summary.duration).toBe(180); // Last endTime - first startTime
      expect(summary.segmentCount).toBe(3);
    });

    it('counts completed milestones', () => {
      const milestoneMarkers = [
        { milestoneId: 'm1', title: 'A', timestamp: 100, status: 'completed' as const },
        { milestoneId: 'm2', title: 'B', timestamp: 200, status: 'skipped' as const },
        { milestoneId: 'm3', title: 'C', timestamp: 300, status: 'completed' as const },
      ];

      const summary = createTimelineSummary([], milestoneMarkers, []);

      expect(summary.milestoneCount).toBe(3);
      expect(summary.completedMilestones).toBe(2);
    });

    it('counts resolved objections', () => {
      const objectionMarkers = [
        { objectionResponseId: 'o1', objectionType: 'Price', timestamp: 100, outcome: 'Resolved' as const },
        { objectionResponseId: 'o2', objectionType: 'Timing', timestamp: 200, outcome: 'Deferred' as const },
        { objectionResponseId: 'o3', objectionType: 'Need', timestamp: 300, outcome: 'Resolved' as const },
      ];

      const summary = createTimelineSummary([], [], objectionMarkers);

      expect(summary.objectionCount).toBe(3);
      expect(summary.resolvedObjections).toBe(2);
    });

    it('creates complete summary', () => {
      const segments = [
        createSegment('seg1', 0, 300),
        createSegment('seg2', 300, 600),
      ];

      const milestoneMarkers = [
        { milestoneId: 'm1', title: 'Intro', timestamp: 60, status: 'completed' as const },
        { milestoneId: 'm2', title: 'Demo', timestamp: 180, status: 'completed' as const },
        { milestoneId: 'm3', title: 'Close', timestamp: 480, status: 'in_progress' as const },
      ];

      const objectionMarkers = [
        { objectionResponseId: 'o1', objectionType: 'Price', timestamp: 360, outcome: 'Resolved' as const },
      ];

      const summary = createTimelineSummary(
        segments,
        milestoneMarkers,
        objectionMarkers
      );

      expect(summary).toEqual({
        duration: 600,
        segmentCount: 2,
        milestoneCount: 3,
        objectionCount: 1,
        completedMilestones: 2,
        resolvedObjections: 1,
      });
    });
  });
});
