/**
 * Speaker Detection Service
 * Identifies and labels speakers in transcript segments
 */

import type { SpeakerRole, SpeakerHints, TranscriptSegment } from './types';

/**
 * Common patterns that indicate agent speech
 * (Sales/professional language patterns)
 */
const AGENT_PATTERNS = [
  /\b(let me|allow me|I'd like to)\b/i,
  /\b(our (company|solution|product|team))\b/i,
  /\b(we (can|offer|provide|help))\b/i,
  /\b(based on (what|the information))\b/i,
  /\b(as I mentioned)\b/i,
  /\b(let's (discuss|look at|go through))\b/i,
  /\b(I'll (send|share|follow up))\b/i,
];

/**
 * Common patterns that indicate prospect speech
 * (Questions, concerns, personal context)
 */
const PROSPECT_PATTERNS = [
  /\b(my (team|company|business|clients))\b/i,
  /\b(we (currently|have been|are using))\b/i,
  /\b(our (current|existing|main) (challenge|problem|issue))\b/i,
  /\b(how (much|long|does|would))\b/i,
  /\b(what (if|about|happens))\b/i,
  /\b(can you (explain|tell me|show))\b/i,
  /\b(I'm (concerned|worried|not sure))\b/i,
  /\b(we've (tried|been|had))\b/i,
];

/**
 * Speaker detector class
 */
export class SpeakerDetector {
  private hints: SpeakerHints;
  private speakerHistory: Map<string, SpeakerRole>;

  constructor(hints: SpeakerHints = {}) {
    this.hints = hints;
    this.speakerHistory = new Map();
  }

  /**
   * Detect speaker role for a segment
   * Uses multiple strategies: label matching, pattern analysis, and history
   */
  detectSpeaker(
    speakerLabel: string | undefined,
    text: string,
    previousSpeaker?: SpeakerRole
  ): SpeakerRole {
    // Strategy 1: Check known speakers from hints
    if (speakerLabel && this.hints.knownSpeakers) {
      const knownSpeaker = this.hints.knownSpeakers.find(
        (s) => s.label.toLowerCase() === speakerLabel.toLowerCase()
      );
      if (knownSpeaker) {
        return knownSpeaker.role;
      }
    }

    // Strategy 2: Check if speaker label matches agent/prospect names
    if (speakerLabel) {
      const cached = this.speakerHistory.get(speakerLabel);
      if (cached) {
        return cached;
      }

      const normalizedLabel = speakerLabel.toLowerCase();

      if (
        this.hints.agentName &&
        normalizedLabel.includes(this.hints.agentName.toLowerCase())
      ) {
        this.speakerHistory.set(speakerLabel, 'agent');
        return 'agent';
      }

      if (
        this.hints.prospectName &&
        normalizedLabel.includes(this.hints.prospectName.toLowerCase())
      ) {
        this.speakerHistory.set(speakerLabel, 'prospect');
        return 'prospect';
      }

      if (
        this.hints.agentEmail &&
        normalizedLabel.includes(this.hints.agentEmail.split('@')[0].toLowerCase())
      ) {
        this.speakerHistory.set(speakerLabel, 'agent');
        return 'agent';
      }
    }

    // Strategy 3: Pattern-based detection
    const agentScore = this.calculatePatternScore(text, AGENT_PATTERNS);
    const prospectScore = this.calculatePatternScore(text, PROSPECT_PATTERNS);

    if (agentScore > prospectScore && agentScore > 0) {
      if (speakerLabel) {
        this.speakerHistory.set(speakerLabel, 'agent');
      }
      return 'agent';
    }

    if (prospectScore > agentScore && prospectScore > 0) {
      if (speakerLabel) {
        this.speakerHistory.set(speakerLabel, 'prospect');
      }
      return 'prospect';
    }

    // Strategy 4: Conversation flow heuristics
    // In sales calls, agent typically speaks first and alternates
    if (previousSpeaker === 'agent') {
      return 'prospect';
    }
    if (previousSpeaker === 'prospect') {
      return 'agent';
    }

    return 'unknown';
  }

  /**
   * Calculate pattern match score for text
   */
  private calculatePatternScore(text: string, patterns: RegExp[]): number {
    let score = 0;
    for (const pattern of patterns) {
      if (pattern.test(text)) {
        score += 1;
      }
    }
    return score;
  }

  /**
   * Process raw segments and add speaker detection
   */
  processSegments(
    rawSegments: Array<{
      speaker?: string;
      text: string;
      start: number;
      end: number;
      confidence?: number;
    }>
  ): TranscriptSegment[] {
    let previousSpeaker: SpeakerRole | undefined;
    const processedSegments: TranscriptSegment[] = [];

    for (let i = 0; i < rawSegments.length; i++) {
      const raw = rawSegments[i];
      const speaker = this.detectSpeaker(raw.speaker, raw.text, previousSpeaker);

      const segment: TranscriptSegment = {
        id: `seg_${i + 1}`,
        speaker,
        speakerName: raw.speaker,
        text: raw.text.trim(),
        startTime: raw.start,
        endTime: raw.end,
        confidence: raw.confidence ?? 0.9,
      };

      processedSegments.push(segment);
      previousSpeaker = speaker;
    }

    return processedSegments;
  }

  /**
   * Refine speaker detection based on full transcript analysis
   * Uses conversation patterns and speaker turn consistency
   */
  refineDetection(segments: TranscriptSegment[]): TranscriptSegment[] {
    if (segments.length < 3) {
      return segments;
    }

    // Count speaker assignments
    const speakerCounts: Record<SpeakerRole, number> = {
      agent: 0,
      prospect: 0,
      unknown: 0,
    };

    for (const segment of segments) {
      speakerCounts[segment.speaker]++;
    }

    // If one speaker dominates heavily, it's likely the agent (they talk more in sales calls)
    const total = segments.length;
    const agentRatio = speakerCounts.agent / total;
    const prospectRatio = speakerCounts.prospect / total;

    // If agent ratio is very high (>70%), some prospects might be misidentified
    // If prospect ratio is very high, some agents might be misidentified
    // This is a simple heuristic that can be refined

    return segments;
  }

  /**
   * Get speaker statistics
   */
  getSpeakerStats(segments: TranscriptSegment[]): {
    agentTalkTime: number;
    prospectTalkTime: number;
    unknownTalkTime: number;
    agentWordCount: number;
    prospectWordCount: number;
    turnCount: number;
  } {
    let agentTalkTime = 0;
    let prospectTalkTime = 0;
    let unknownTalkTime = 0;
    let agentWordCount = 0;
    let prospectWordCount = 0;
    let turnCount = 0;
    let lastSpeaker: SpeakerRole | null = null;

    for (const segment of segments) {
      const duration = segment.endTime - segment.startTime;
      const wordCount = segment.text.split(/\s+/).length;

      switch (segment.speaker) {
        case 'agent':
          agentTalkTime += duration;
          agentWordCount += wordCount;
          break;
        case 'prospect':
          prospectTalkTime += duration;
          prospectWordCount += wordCount;
          break;
        default:
          unknownTalkTime += duration;
      }

      if (segment.speaker !== lastSpeaker) {
        turnCount++;
        lastSpeaker = segment.speaker;
      }
    }

    return {
      agentTalkTime,
      prospectTalkTime,
      unknownTalkTime,
      agentWordCount,
      prospectWordCount,
      turnCount,
    };
  }
}

/**
 * Create speaker detector with hints
 */
export function createSpeakerDetector(hints?: SpeakerHints): SpeakerDetector {
  return new SpeakerDetector(hints);
}
