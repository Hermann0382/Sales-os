/**
 * Speaker Detector Tests
 * Tests for speaker identification and pattern matching
 */

import { SpeakerDetector, createSpeakerDetector } from '../speaker-detector';

describe('Speaker Detector', () => {
  describe('createSpeakerDetector', () => {
    it('creates a detector without hints', () => {
      const detector = createSpeakerDetector();
      expect(detector).toBeInstanceOf(SpeakerDetector);
    });

    it('creates a detector with hints', () => {
      const detector = createSpeakerDetector({
        agentName: 'John Smith',
        prospectName: 'Jane Doe',
      });
      expect(detector).toBeInstanceOf(SpeakerDetector);
    });
  });

  describe('detectSpeaker', () => {
    describe('name matching', () => {
      it('detects agent by name match', () => {
        const detector = createSpeakerDetector({
          agentName: 'John Smith',
        });

        const result = detector.detectSpeaker('John Smith', 'Hello there');
        expect(result).toBe('agent');
      });

      it('detects prospect by name match', () => {
        const detector = createSpeakerDetector({
          prospectName: 'Jane Doe',
        });

        const result = detector.detectSpeaker('Jane Doe', 'Hi, how are you?');
        expect(result).toBe('prospect');
      });

      it('detects agent when label contains agent name', () => {
        const detector = createSpeakerDetector({
          agentName: 'John',
        });

        const result = detector.detectSpeaker('John Smith', "I'll help you today");
        expect(result).toBe('agent');
      });

      it('detects agent by email prefix match', () => {
        const detector = createSpeakerDetector({
          agentEmail: 'jsmith@company.com',
        });

        const result = detector.detectSpeaker('jsmith', 'Let me explain');
        expect(result).toBe('agent');
      });
    });

    describe('pattern-based detection', () => {
      it('detects agent from sales language patterns', () => {
        const detector = createSpeakerDetector();

        expect(
          detector.detectSpeaker(undefined, "Let me explain our solution to you")
        ).toBe('agent');

        expect(
          detector.detectSpeaker(
            undefined,
            "I'll send you the proposal after this call"
          )
        ).toBe('agent');

        expect(
          detector.detectSpeaker(undefined, "Based on what you've told me")
        ).toBe('agent');
      });

      it('detects prospect from question patterns', () => {
        const detector = createSpeakerDetector();

        expect(
          detector.detectSpeaker(undefined, "How much does this cost?")
        ).toBe('prospect');

        expect(
          detector.detectSpeaker(undefined, "My team has been struggling with this")
        ).toBe('prospect');

        expect(
          detector.detectSpeaker(
            undefined,
            "We currently use a different system"
          )
        ).toBe('prospect');
      });

      it('detects prospect from concern patterns', () => {
        const detector = createSpeakerDetector();

        expect(
          detector.detectSpeaker(undefined, "I'm concerned about the timeline")
        ).toBe('prospect');

        expect(
          detector.detectSpeaker(
            undefined,
            "What if it doesn't work for our use case?"
          )
        ).toBe('prospect');
      });
    });

    describe('conversation flow heuristics', () => {
      it('alternates speakers when no patterns match', () => {
        const detector = createSpeakerDetector();

        // When previous speaker was agent, expect prospect
        expect(detector.detectSpeaker(undefined, 'Yes.', 'agent')).toBe(
          'prospect'
        );

        // When previous speaker was prospect, expect agent
        expect(detector.detectSpeaker(undefined, 'Okay.', 'prospect')).toBe(
          'agent'
        );
      });

      it('returns unknown when no clues available', () => {
        const detector = createSpeakerDetector();

        const result = detector.detectSpeaker(undefined, 'Yes.');
        expect(result).toBe('unknown');
      });
    });

    describe('known speakers from hints', () => {
      it('uses known speakers mapping', () => {
        const detector = createSpeakerDetector({
          knownSpeakers: [
            { label: 'Speaker 1', role: 'agent' },
            { label: 'Speaker 2', role: 'prospect' },
          ],
        });

        expect(detector.detectSpeaker('Speaker 1', 'Hello')).toBe('agent');
        expect(detector.detectSpeaker('Speaker 2', 'Hello')).toBe('prospect');
      });

      it('is case-insensitive for known speakers', () => {
        const detector = createSpeakerDetector({
          knownSpeakers: [{ label: 'SPEAKER 1', role: 'agent' }],
        });

        expect(detector.detectSpeaker('speaker 1', 'Hello')).toBe('agent');
      });
    });

    describe('speaker caching', () => {
      it('caches speaker label after pattern detection', () => {
        const detector = createSpeakerDetector();

        // First detection uses pattern
        detector.detectSpeaker('Unknown Person', 'Our company can help you');

        // Second detection uses cache
        const result = detector.detectSpeaker('Unknown Person', 'Yes.');
        expect(result).toBe('agent');
      });
    });
  });

  describe('processSegments', () => {
    it('processes empty segments array', () => {
      const detector = createSpeakerDetector();
      const result = detector.processSegments([]);

      expect(result).toEqual([]);
    });

    it('processes segments and adds speaker detection', () => {
      const detector = createSpeakerDetector({
        agentName: 'John',
        prospectName: 'Jane',
      });

      const rawSegments = [
        { speaker: 'John', text: 'Hello', start: 0, end: 2 },
        { speaker: 'Jane', text: 'Hi there', start: 2, end: 4 },
      ];

      const result = detector.processSegments(rawSegments);

      expect(result).toHaveLength(2);
      expect(result[0].speaker).toBe('agent');
      expect(result[0].speakerName).toBe('John');
      expect(result[0].text).toBe('Hello');
      expect(result[0].startTime).toBe(0);
      expect(result[0].endTime).toBe(2);
      expect(result[0].id).toBe('seg_1');

      expect(result[1].speaker).toBe('prospect');
      expect(result[1].id).toBe('seg_2');
    });

    it('uses default confidence when not provided', () => {
      const detector = createSpeakerDetector();
      const result = detector.processSegments([
        { text: 'Test', start: 0, end: 1 },
      ]);

      expect(result[0].confidence).toBe(0.9);
    });

    it('preserves confidence when provided', () => {
      const detector = createSpeakerDetector();
      const result = detector.processSegments([
        { text: 'Test', start: 0, end: 1, confidence: 0.75 },
      ]);

      expect(result[0].confidence).toBe(0.75);
    });

    it('trims text whitespace', () => {
      const detector = createSpeakerDetector();
      const result = detector.processSegments([
        { text: '  Hello world  ', start: 0, end: 1 },
      ]);

      expect(result[0].text).toBe('Hello world');
    });
  });

  describe('getSpeakerStats', () => {
    it('calculates stats for empty segments', () => {
      const detector = createSpeakerDetector();
      const stats = detector.getSpeakerStats([]);

      expect(stats).toEqual({
        agentTalkTime: 0,
        prospectTalkTime: 0,
        unknownTalkTime: 0,
        agentWordCount: 0,
        prospectWordCount: 0,
        turnCount: 0,
      });
    });

    it('calculates talk time correctly', () => {
      const detector = createSpeakerDetector();
      const segments = [
        { id: '1', speaker: 'agent' as const, text: 'Hello', startTime: 0, endTime: 5, confidence: 0.9 },
        { id: '2', speaker: 'prospect' as const, text: 'Hi there', startTime: 5, endTime: 10, confidence: 0.9 },
        { id: '3', speaker: 'agent' as const, text: 'How are you', startTime: 10, endTime: 15, confidence: 0.9 },
      ];

      const stats = detector.getSpeakerStats(segments);

      expect(stats.agentTalkTime).toBe(10);
      expect(stats.prospectTalkTime).toBe(5);
      expect(stats.turnCount).toBe(3);
    });

    it('calculates word counts correctly', () => {
      const detector = createSpeakerDetector();
      const segments = [
        { id: '1', speaker: 'agent' as const, text: 'Hello there friend', startTime: 0, endTime: 3, confidence: 0.9 },
        { id: '2', speaker: 'prospect' as const, text: 'Hi', startTime: 3, endTime: 4, confidence: 0.9 },
      ];

      const stats = detector.getSpeakerStats(segments);

      expect(stats.agentWordCount).toBe(3);
      expect(stats.prospectWordCount).toBe(1);
    });

    it('counts turn changes correctly', () => {
      const detector = createSpeakerDetector();
      const segments = [
        { id: '1', speaker: 'agent' as const, text: 'A', startTime: 0, endTime: 1, confidence: 0.9 },
        { id: '2', speaker: 'agent' as const, text: 'B', startTime: 1, endTime: 2, confidence: 0.9 },
        { id: '3', speaker: 'prospect' as const, text: 'C', startTime: 2, endTime: 3, confidence: 0.9 },
        { id: '4', speaker: 'prospect' as const, text: 'D', startTime: 3, endTime: 4, confidence: 0.9 },
        { id: '5', speaker: 'agent' as const, text: 'E', startTime: 4, endTime: 5, confidence: 0.9 },
      ];

      const stats = detector.getSpeakerStats(segments);

      expect(stats.turnCount).toBe(3);
    });

    it('tracks unknown talk time', () => {
      const detector = createSpeakerDetector();
      const segments = [
        { id: '1', speaker: 'unknown' as const, text: 'Test', startTime: 0, endTime: 5, confidence: 0.9 },
      ];

      const stats = detector.getSpeakerStats(segments);

      expect(stats.unknownTalkTime).toBe(5);
    });
  });

  describe('refineDetection', () => {
    it('returns segments unchanged when fewer than 3', () => {
      const detector = createSpeakerDetector();
      const segments = [
        { id: '1', speaker: 'agent' as const, text: 'A', startTime: 0, endTime: 1, confidence: 0.9 },
        { id: '2', speaker: 'prospect' as const, text: 'B', startTime: 1, endTime: 2, confidence: 0.9 },
      ];

      const result = detector.refineDetection(segments);

      expect(result).toEqual(segments);
    });

    it('returns segments for larger arrays', () => {
      const detector = createSpeakerDetector();
      const segments = [
        { id: '1', speaker: 'agent' as const, text: 'A', startTime: 0, endTime: 1, confidence: 0.9 },
        { id: '2', speaker: 'prospect' as const, text: 'B', startTime: 1, endTime: 2, confidence: 0.9 },
        { id: '3', speaker: 'agent' as const, text: 'C', startTime: 2, endTime: 3, confidence: 0.9 },
      ];

      const result = detector.refineDetection(segments);

      expect(result).toHaveLength(3);
    });
  });
});
