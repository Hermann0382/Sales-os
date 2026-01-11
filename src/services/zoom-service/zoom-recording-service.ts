/**
 * Zoom Recording Service
 * Manages recording sessions and coordinates with Zoom API
 */

import { prisma } from '@/lib/db';
import { isZoomConfigured } from '@/lib/config/zoom';
import { zoomApiClient } from './zoom-api-client';
import { parseZoomLink } from './link-detector';
import type {
  RecordingSession,
  RecordingStatus,
  StartRecordingInput,
  StartRecordingResult,
  StopRecordingResult,
  RecordingDetails,
  ZoomMeetingInfo,
} from './types';

/**
 * Zoom Recording Service
 * Handles recording lifecycle for call sessions
 */
class ZoomRecordingService {
  /**
   * Start recording a Zoom meeting for a call session
   * @param organizationId - The organization ID for tenant isolation
   * @param input - Recording input with call session ID and Zoom link
   */
  async startRecording(
    organizationId: string,
    input: StartRecordingInput
  ): Promise<StartRecordingResult> {
    // Validate Zoom is configured
    if (!isZoomConfigured()) {
      return {
        success: false,
        error: 'Zoom integration is not configured',
      };
    }

    // Parse and validate the Zoom link
    const parsedLink = parseZoomLink(input.zoomLink);
    if (!parsedLink.isValid || !parsedLink.meetingId) {
      return {
        success: false,
        error: 'Invalid Zoom meeting link',
      };
    }

    // Verify call session exists and belongs to organization
    const callSession = await prisma.callSession.findFirst({
      where: {
        id: input.callSessionId,
        organizationId,
      },
      select: {
        id: true,
        status: true,
      },
    });

    if (!callSession) {
      return {
        success: false,
        error: 'Call session not found',
      };
    }

    // Check if recording already exists for this call
    const existingRecording = await prisma.recordingSession.findFirst({
      where: {
        callSessionId: input.callSessionId,
        status: {
          in: ['pending', 'connecting', 'recording'],
        },
      },
    });

    if (existingRecording) {
      return {
        success: false,
        error: 'Recording already in progress for this call',
        recordingId: existingRecording.id,
      };
    }

    // Create recording session in pending state
    const recording = await prisma.recordingSession.create({
      data: {
        callSessionId: input.callSessionId,
        organizationId,
        meetingId: parsedLink.meetingId,
        status: 'pending',
        zoomLink: input.zoomLink,
      },
    });

    // Update to connecting status
    await this.updateRecordingStatus(recording.id, 'connecting');

    // Verify meeting exists via Zoom API
    try {
      const meetingInfo = await zoomApiClient.getMeeting(parsedLink.meetingId);

      await prisma.recordingSession.update({
        where: { id: recording.id },
        data: {
          meetingNumber: String(meetingInfo.id),
          status: 'recording',
          startedAt: new Date(),
        },
      });

      return {
        success: true,
        recordingId: recording.id,
        meetingId: parsedLink.meetingId,
      };
    } catch (error) {
      // Update recording to failed status
      await this.updateRecordingStatus(
        recording.id,
        'failed',
        error instanceof Error ? error.message : 'Failed to connect to meeting'
      );

      return {
        success: false,
        error: 'Failed to connect to Zoom meeting',
        recordingId: recording.id,
      };
    }
  }

  /**
   * Stop recording for a call session
   * @param organizationId - The organization ID for tenant isolation
   * @param callSessionId - The call session ID
   */
  async stopRecording(
    organizationId: string,
    callSessionId: string
  ): Promise<StopRecordingResult> {
    const recording = await prisma.recordingSession.findFirst({
      where: {
        callSessionId,
        organizationId,
        status: 'recording',
      },
    });

    if (!recording) {
      return {
        success: false,
        error: 'No active recording found for this call',
      };
    }

    const endedAt = new Date();
    const duration = recording.startedAt
      ? Math.round((endedAt.getTime() - recording.startedAt.getTime()) / 1000)
      : undefined;

    await prisma.recordingSession.update({
      where: { id: recording.id },
      data: {
        status: 'processing',
        endedAt,
        duration,
      },
    });

    return {
      success: true,
      duration,
    };
  }

  /**
   * Get recording details for a call session
   * @param organizationId - The organization ID for tenant isolation
   * @param callSessionId - The call session ID
   */
  async getRecording(
    organizationId: string,
    callSessionId: string
  ): Promise<RecordingDetails | null> {
    const recording = await prisma.recordingSession.findFirst({
      where: {
        callSessionId,
        organizationId,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    if (!recording) {
      return null;
    }

    return this.mapToRecordingDetails(recording);
  }

  /**
   * Get all recordings for an organization
   * @param organizationId - The organization ID
   * @param options - Query options
   */
  async listRecordings(
    organizationId: string,
    options?: {
      status?: RecordingStatus;
      limit?: number;
      offset?: number;
    }
  ): Promise<RecordingDetails[]> {
    const recordings = await prisma.recordingSession.findMany({
      where: {
        organizationId,
        ...(options?.status && { status: options.status }),
      },
      orderBy: {
        createdAt: 'desc',
      },
      take: options?.limit ?? 50,
      skip: options?.offset ?? 0,
    });

    return recordings.map((r) => this.mapToRecordingDetails(r));
  }

  /**
   * Process completed recording from Zoom webhook
   * Called when recording.completed webhook is received
   * @param meetingId - The Zoom meeting ID
   */
  async processCompletedRecording(meetingId: string): Promise<void> {
    // Find recording session by meeting ID
    const recording = await prisma.recordingSession.findFirst({
      where: {
        meetingId,
        status: {
          in: ['recording', 'processing'],
        },
      },
    });

    if (!recording) {
      console.warn(`No active recording found for meeting ${meetingId}`);
      return;
    }

    try {
      // Fetch recording details from Zoom
      const recordings = await zoomApiClient.getMeetingRecordings(meetingId);

      // Find the video recording file
      const videoFile = recordings.recording_files.find(
        (f) => f.file_type === 'MP4'
      );
      const transcriptFile = recordings.recording_files.find(
        (f) => f.file_type === 'TRANSCRIPT'
      );

      // Get signed URLs for the files
      const recordingUrl = videoFile?.download_url
        ? await zoomApiClient.getSignedDownloadUrl(videoFile.download_url)
        : undefined;

      const transcriptUrl = transcriptFile?.download_url
        ? await zoomApiClient.getSignedDownloadUrl(transcriptFile.download_url)
        : undefined;

      // Update recording with URLs
      await prisma.recordingSession.update({
        where: { id: recording.id },
        data: {
          status: 'completed',
          recordingUrl,
          transcriptUrl,
          duration: recordings.duration,
          endedAt: recording.endedAt ?? new Date(),
        },
      });
    } catch (error) {
      await this.updateRecordingStatus(
        recording.id,
        'failed',
        error instanceof Error ? error.message : 'Failed to process recording'
      );
    }
  }

  /**
   * Get meeting info from Zoom API
   * @param zoomLink - The Zoom meeting link
   */
  async getMeetingInfo(zoomLink: string): Promise<ZoomMeetingInfo | null> {
    const parsed = parseZoomLink(zoomLink);
    if (!parsed.isValid || !parsed.meetingId) {
      return null;
    }

    try {
      const meeting = await zoomApiClient.getMeeting(parsed.meetingId);

      return {
        meetingId: parsed.meetingId,
        meetingNumber: String(meeting.id),
        hostEmail: meeting.host_email,
        topic: meeting.topic,
        startTime: meeting.start_time ? new Date(meeting.start_time) : undefined,
        duration: meeting.duration,
        joinUrl: meeting.join_url,
        password: parsed.password,
      };
    } catch {
      return null;
    }
  }

  /**
   * Update recording status
   */
  private async updateRecordingStatus(
    recordingId: string,
    status: RecordingStatus,
    error?: string
  ): Promise<void> {
    await prisma.recordingSession.update({
      where: { id: recordingId },
      data: {
        status,
        ...(error && { error }),
        ...(status === 'failed' && { endedAt: new Date() }),
      },
    });
  }

  /**
   * Map database model to RecordingDetails
   */
  private mapToRecordingDetails(recording: {
    id: string;
    callSessionId: string;
    status: string;
    duration: number | null;
    recordingUrl: string | null;
    transcriptUrl: string | null;
    startedAt: Date | null;
    endedAt: Date | null;
  }): RecordingDetails {
    return {
      id: recording.id,
      callSessionId: recording.callSessionId,
      status: recording.status as RecordingStatus,
      duration: recording.duration ?? undefined,
      recordingUrl: recording.recordingUrl ?? undefined,
      transcriptUrl: recording.transcriptUrl ?? undefined,
      startedAt: recording.startedAt ?? undefined,
      endedAt: recording.endedAt ?? undefined,
    };
  }
}

/**
 * Singleton instance of the Zoom recording service
 */
export const zoomRecordingService = new ZoomRecordingService();
