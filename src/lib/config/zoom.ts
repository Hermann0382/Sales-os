/**
 * Zoom API Configuration
 * Environment variables and configuration for Zoom integration
 */

/**
 * Zoom configuration object
 */
export interface ZoomConfig {
  apiKey: string;
  apiSecret: string;
  accountId: string;
  botEmail?: string;
  webhookSecret?: string;
  baseUrl: string;
  oauthUrl: string;
}

/**
 * Get Zoom configuration from environment
 * Throws if required variables are missing
 */
export function getZoomConfig(): ZoomConfig {
  const apiKey = process.env.ZOOM_API_KEY;
  const apiSecret = process.env.ZOOM_API_SECRET;
  const accountId = process.env.ZOOM_ACCOUNT_ID;

  if (!apiKey || !apiSecret || !accountId) {
    throw new Error(
      'Missing required Zoom environment variables: ZOOM_API_KEY, ZOOM_API_SECRET, ZOOM_ACCOUNT_ID'
    );
  }

  return {
    apiKey,
    apiSecret,
    accountId,
    botEmail: process.env.ZOOM_BOT_EMAIL,
    webhookSecret: process.env.ZOOM_WEBHOOK_SECRET,
    baseUrl: process.env.ZOOM_API_BASE_URL || 'https://api.zoom.us/v2',
    oauthUrl: process.env.ZOOM_OAUTH_URL || 'https://zoom.us/oauth/token',
  };
}

/**
 * Check if Zoom is configured
 * Returns false if required env vars are missing (allows graceful fallback)
 */
export function isZoomConfigured(): boolean {
  return !!(
    process.env.ZOOM_API_KEY &&
    process.env.ZOOM_API_SECRET &&
    process.env.ZOOM_ACCOUNT_ID
  );
}

/**
 * Recording configuration
 */
export const recordingConfig = {
  /** Maximum recording duration in minutes */
  maxDurationMinutes: 120,

  /** Time to wait for meeting join (ms) */
  joinTimeoutMs: 30000,

  /** Time to wait for recording to start after joining (ms) */
  recordingStartTimeoutMs: 10000,

  /** Signed URL expiration time (seconds) */
  signedUrlExpirationSeconds: 3600,

  /** Retry attempts for API calls */
  maxRetryAttempts: 3,

  /** Delay between retry attempts (ms) */
  retryDelayMs: 1000,
};
