/**
 * Zoom API Client
 * Handles OAuth authentication and API requests to Zoom
 */

import { getZoomConfig, isZoomConfigured, recordingConfig } from '@/lib/config/zoom';
import type {
  ZoomTokenResponse,
  ZoomMeetingResponse,
  ZoomRecordingsResponse,
} from './types';

/**
 * Cached access token with expiration
 */
interface CachedToken {
  accessToken: string;
  expiresAt: number;
}

/**
 * Zoom API client for Server-to-Server OAuth
 * Uses account-level credentials for automated recording management
 */
class ZoomApiClient {
  private cachedToken: CachedToken | null = null;

  /**
   * Get a valid access token, refreshing if necessary
   * Uses Server-to-Server OAuth (account credentials)
   */
  async getAccessToken(): Promise<string> {
    // Check if we have a valid cached token (with 60s buffer)
    if (this.cachedToken && Date.now() < this.cachedToken.expiresAt - 60000) {
      return this.cachedToken.accessToken;
    }

    if (!isZoomConfigured()) {
      throw new Error('Zoom API is not configured');
    }

    const config = getZoomConfig();
    const credentials = Buffer.from(`${config.apiKey}:${config.apiSecret}`).toString('base64');

    const response = await fetch(config.oauthUrl, {
      method: 'POST',
      headers: {
        Authorization: `Basic ${credentials}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        grant_type: 'account_credentials',
        account_id: config.accountId,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Failed to get Zoom access token: ${error}`);
    }

    const data = (await response.json()) as ZoomTokenResponse;

    this.cachedToken = {
      accessToken: data.access_token,
      expiresAt: Date.now() + data.expires_in * 1000,
    };

    return data.access_token;
  }

  /**
   * Make an authenticated request to the Zoom API
   */
  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const config = getZoomConfig();
    const token = await this.getAccessToken();

    const url = endpoint.startsWith('http')
      ? endpoint
      : `${config.baseUrl}${endpoint}`;

    let lastError: Error | null = null;

    for (let attempt = 1; attempt <= recordingConfig.maxRetryAttempts; attempt++) {
      try {
        const response = await fetch(url, {
          ...options,
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
            ...options.headers,
          },
        });

        if (!response.ok) {
          const errorBody = await response.text();

          // Don't retry client errors (4xx)
          if (response.status >= 400 && response.status < 500) {
            throw new Error(
              `Zoom API error (${response.status}): ${errorBody}`
            );
          }

          // Retry server errors (5xx)
          throw new Error(
            `Zoom API error (${response.status}): ${errorBody}`
          );
        }

        // Handle 204 No Content
        if (response.status === 204) {
          return {} as T;
        }

        return (await response.json()) as T;
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));

        // Don't retry on client errors
        if (lastError.message.includes('(4')) {
          throw lastError;
        }

        if (attempt < recordingConfig.maxRetryAttempts) {
          await this.delay(recordingConfig.retryDelayMs * attempt);
        }
      }
    }

    throw lastError ?? new Error('Zoom API request failed');
  }

  /**
   * Helper to delay execution
   */
  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * Get meeting details by ID
   * @param meetingId - The Zoom meeting ID
   */
  async getMeeting(meetingId: string): Promise<ZoomMeetingResponse> {
    return this.request<ZoomMeetingResponse>(`/meetings/${meetingId}`);
  }

  /**
   * Get meeting recordings
   * @param meetingId - The Zoom meeting ID
   */
  async getMeetingRecordings(meetingId: string): Promise<ZoomRecordingsResponse> {
    return this.request<ZoomRecordingsResponse>(
      `/meetings/${meetingId}/recordings`
    );
  }

  /**
   * List recordings for a specific date range
   * @param userId - The user ID (or 'me' for current user)
   * @param from - Start date (YYYY-MM-DD)
   * @param to - End date (YYYY-MM-DD)
   */
  async listRecordings(
    userId: string,
    from: string,
    to: string
  ): Promise<{ meetings: ZoomRecordingsResponse[] }> {
    return this.request<{ meetings: ZoomRecordingsResponse[] }>(
      `/users/${userId}/recordings?from=${from}&to=${to}`
    );
  }

  /**
   * Delete a meeting recording
   * @param meetingId - The Zoom meeting ID
   * @param action - 'trash' or 'delete' (default: 'trash')
   */
  async deleteRecording(
    meetingId: string,
    action: 'trash' | 'delete' = 'trash'
  ): Promise<void> {
    await this.request<void>(
      `/meetings/${meetingId}/recordings?action=${action}`,
      { method: 'DELETE' }
    );
  }

  /**
   * Recover a trashed recording
   * @param meetingId - The Zoom meeting ID
   */
  async recoverRecording(meetingId: string): Promise<void> {
    await this.request<void>(`/meetings/${meetingId}/recordings/status`, {
      method: 'PUT',
      body: JSON.stringify({ action: 'recover' }),
    });
  }

  /**
   * Get a signed download URL for a recording file
   * The URL is valid for the configured expiration time
   * @param downloadUrl - The original download URL from the recording
   */
  async getSignedDownloadUrl(downloadUrl: string): Promise<string> {
    const token = await this.getAccessToken();
    const separator = downloadUrl.includes('?') ? '&' : '?';
    return `${downloadUrl}${separator}access_token=${token}`;
  }

  /**
   * Clear the cached token (useful for testing or forced refresh)
   */
  clearTokenCache(): void {
    this.cachedToken = null;
  }
}

/**
 * Singleton instance of the Zoom API client
 */
export const zoomApiClient = new ZoomApiClient();
