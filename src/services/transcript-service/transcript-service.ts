/**
 * Transcript Service
 * Generates and manages call transcripts with speaker detection and markers
 */

import { prisma } from '@/lib/db';
import { createSpeakerDetector } from './speaker-detector';
import {
  injectMarkers,
  type CallTimeline,
  type MilestoneResponseData,
  type ObjectionResponseData,
} from './marker-injector';
import type {
  Transcript,
  GenerateTranscriptInput,
  GenerateTranscriptResult,
  RawTranscriptData,
  TranscriptSearchQuery,
  TranscriptSearchResult,
  TranscriptExportOptions,
  TranscriptExportFormat,
} from './types';

/**
 * Transcript Service
 * Handles transcript generation, storage, and retrieval
 */
class TranscriptService {
  /**
   * Generate transcript from a recording
   * @param organizationId - Organization ID for tenant isolation
   * @param input - Generation input with recording details
   */
  async generateTranscript(
    organizationId: string,
    input: GenerateTranscriptInput
  ): Promise<GenerateTranscriptResult> {
    try {
      // Get call session with related data
      const callSession = await prisma.callSession.findFirst({
        where: {
          id: input.callSessionId,
          organizationId,
        },
        include: {
          agent: {
            select: {
              name: true,
              email: true,
            },
          },
          prospect: {
            select: {
              name: true,
            },
          },
          milestoneResponses: {
            include: {
              milestone: {
                select: {
                  title: true,
                },
              },
            },
            orderBy: {
              startedAt: 'asc',
            },
          },
          objectionResponses: {
            include: {
              objection: {
                select: {
                  objectionType: true,
                },
              },
            },
            orderBy: {
              createdAt: 'asc',
            },
          },
        },
      });

      if (!callSession) {
        return {
          success: false,
          error: 'Call session not found',
        };
      }

      if (!callSession.startedAt) {
        return {
          success: false,
          error: 'Call has not started yet',
        };
      }

      // Fetch raw transcript
      // In production, this would call external transcription service
      const rawTranscript = await this.fetchRawTranscript(
        input.recordingUrl,
        input.transcriptUrl
      );

      if (!rawTranscript) {
        return {
          success: false,
          error: 'Failed to fetch transcript from recording',
        };
      }

      // Create speaker detector with hints
      const speakerDetector = createSpeakerDetector({
        agentName: callSession.agent.name ?? undefined,
        agentEmail: callSession.agent.email,
        prospectName: callSession.prospect.name,
      });

      // Process segments with speaker detection
      const segments = speakerDetector.processSegments(rawTranscript.segments);

      // Prepare timeline data for marker injection
      const timeline: CallTimeline = {
        startedAt: callSession.startedAt,
        endedAt: callSession.endedAt ?? undefined,
        milestoneResponses: callSession.milestoneResponses.map(
          (mr): MilestoneResponseData => ({
            id: mr.id,
            milestoneId: mr.milestoneId,
            milestoneTitle: mr.milestone.title,
            status: mr.status as 'in_progress' | 'completed' | 'skipped',
            startedAt: mr.startedAt,
            completedAt: mr.completedAt ?? undefined,
          })
        ),
        objectionResponses: callSession.objectionResponses.map(
          (or): ObjectionResponseData => ({
            id: or.id,
            objectionType: or.objection.objectionType,
            outcome: or.outcome as 'Resolved' | 'Deferred' | 'Disqualified',
            createdAt: or.createdAt,
          })
        ),
      };

      // Inject markers
      const { milestoneMarkers, objectionMarkers } = injectMarkers(
        segments,
        timeline
      );

      // Build transcript
      const transcript: Transcript = {
        recordingId: input.recordingId,
        callSessionId: input.callSessionId,
        duration: rawTranscript.duration,
        language: (input.language || callSession.language) as 'EN' | 'DE',
        segments,
        milestoneMarkers,
        objectionMarkers,
        generatedAt: new Date(),
        status: 'completed',
      };

      return {
        success: true,
        transcript,
      };
    } catch (error) {
      console.error('Transcript generation failed:', error);
      return {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : 'Transcript generation failed',
      };
    }
  }

  /**
   * Fetch raw transcript from recording
   * Placeholder for external transcription service integration
   */
  private async fetchRawTranscript(
    recordingUrl: string,
    transcriptUrl?: string
  ): Promise<RawTranscriptData | null> {
    // If a transcript URL is provided (from Zoom native transcription),
    // fetch and parse it
    if (transcriptUrl) {
      try {
        // In production, this would fetch and parse VTT/SRT from Zoom
        // For now, return a placeholder structure
        console.log(`Fetching transcript from: ${transcriptUrl}`);
        // TODO: Implement Zoom VTT parsing
      } catch (error) {
        console.error('Failed to fetch transcript from URL:', error);
      }
    }

    // If no transcript URL or fetching failed, use transcription service
    // This would call AssemblyAI, Deepgram, or OpenAI Whisper
    console.log(`Transcribing recording from: ${recordingUrl}`);

    // Placeholder: In production, replace with actual API call
    // For now, return empty transcript structure
    return {
      segments: [],
      duration: 0,
      language: 'EN',
    };
  }

  /**
   * Get transcript for a call session
   * @param organizationId - Organization ID for tenant isolation
   * @param callSessionId - Call session ID
   */
  async getTranscript(
    organizationId: string,
    callSessionId: string
  ): Promise<Transcript | null> {
    // Check if call exists and belongs to organization
    const callSession = await prisma.callSession.findFirst({
      where: {
        id: callSessionId,
        organizationId,
      },
      select: {
        id: true,
      },
    });

    if (!callSession) {
      return null;
    }

    // In production, this would fetch stored transcript
    // For now, return null (transcript not yet generated)
    return null;
  }

  /**
   * Search transcript for keywords
   */
  searchTranscript(
    transcript: Transcript,
    query: TranscriptSearchQuery
  ): TranscriptSearchResult {
    const matches: TranscriptSearchResult['matches'] = [];
    const keyword = query.keyword.toLowerCase();

    for (const segment of transcript.segments) {
      // Apply filters
      if (query.speaker && segment.speaker !== query.speaker) {
        continue;
      }

      if (query.fromTime !== undefined && segment.startTime < query.fromTime) {
        continue;
      }

      if (query.toTime !== undefined && segment.endTime > query.toTime) {
        continue;
      }

      // Check for keyword match
      const text = segment.text.toLowerCase();
      if (text.includes(keyword)) {
        // Create highlighted version
        const highlightedText = segment.text.replace(
          new RegExp(`(${this.escapeRegex(query.keyword)})`, 'gi'),
          '**$1**'
        );

        // Calculate score based on match position and frequency
        const matchCount = (text.match(new RegExp(keyword, 'g')) || []).length;
        const positionScore = text.indexOf(keyword) === 0 ? 1.5 : 1;
        const score = matchCount * positionScore;

        matches.push({
          segment,
          highlightedText,
          score,
        });
      }
    }

    // Sort by score descending
    matches.sort((a, b) => b.score - a.score);

    return {
      matches,
      totalMatches: matches.length,
    };
  }

  /**
   * Export transcript to various formats
   */
  exportTranscript(
    transcript: Transcript,
    options: TranscriptExportOptions
  ): string {
    switch (options.format) {
      case 'txt':
        return this.exportToText(transcript, options);
      case 'vtt':
        return this.exportToVtt(transcript, options);
      case 'srt':
        return this.exportToSrt(transcript, options);
      case 'json':
        return this.exportToJson(transcript);
      default:
        throw new Error(`Unsupported export format: ${options.format}`);
    }
  }

  /**
   * Export to plain text
   */
  private exportToText(
    transcript: Transcript,
    options: TranscriptExportOptions
  ): string {
    const lines: string[] = [];

    for (const segment of transcript.segments) {
      let line = '';

      if (options.includeTimestamps) {
        line += `[${this.formatTime(segment.startTime)}] `;
      }

      if (options.includeSpeakers) {
        const speaker =
          segment.speakerName || segment.speaker.toUpperCase();
        line += `${speaker}: `;
      }

      line += segment.text;
      lines.push(line);
    }

    return lines.join('\n\n');
  }

  /**
   * Export to WebVTT format
   */
  private exportToVtt(
    transcript: Transcript,
    options: TranscriptExportOptions
  ): string {
    const lines: string[] = ['WEBVTT', ''];

    for (let i = 0; i < transcript.segments.length; i++) {
      const segment = transcript.segments[i];

      lines.push(`${i + 1}`);
      lines.push(
        `${this.formatVttTime(segment.startTime)} --> ${this.formatVttTime(segment.endTime)}`
      );

      let text = segment.text;
      if (options.includeSpeakers) {
        const speaker =
          segment.speakerName || segment.speaker.toUpperCase();
        text = `<v ${speaker}>${text}`;
      }

      lines.push(text);
      lines.push('');
    }

    return lines.join('\n');
  }

  /**
   * Export to SRT format
   */
  private exportToSrt(
    transcript: Transcript,
    options: TranscriptExportOptions
  ): string {
    const lines: string[] = [];

    for (let i = 0; i < transcript.segments.length; i++) {
      const segment = transcript.segments[i];

      lines.push(`${i + 1}`);
      lines.push(
        `${this.formatSrtTime(segment.startTime)} --> ${this.formatSrtTime(segment.endTime)}`
      );

      let text = segment.text;
      if (options.includeSpeakers) {
        const speaker =
          segment.speakerName || segment.speaker.toUpperCase();
        text = `[${speaker}] ${text}`;
      }

      lines.push(text);
      lines.push('');
    }

    return lines.join('\n');
  }

  /**
   * Export to JSON
   */
  private exportToJson(transcript: Transcript): string {
    return JSON.stringify(transcript, null, 2);
  }

  /**
   * Format time as MM:SS
   */
  private formatTime(seconds: number): string {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }

  /**
   * Format time for VTT (HH:MM:SS.mmm)
   */
  private formatVttTime(seconds: number): string {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);
    const ms = Math.floor((seconds % 1) * 1000);
    return `${hrs.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}.${ms.toString().padStart(3, '0')}`;
  }

  /**
   * Format time for SRT (HH:MM:SS,mmm)
   */
  private formatSrtTime(seconds: number): string {
    return this.formatVttTime(seconds).replace('.', ',');
  }

  /**
   * Escape regex special characters
   */
  private escapeRegex(str: string): string {
    return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }
}

/**
 * Singleton instance of the transcript service
 */
export const transcriptService = new TranscriptService();
