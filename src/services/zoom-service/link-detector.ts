/**
 * Zoom Link Detection and Parsing
 * Extracts meeting ID and password from various Zoom URL formats
 */

import type { ParsedZoomLink } from './types';

/**
 * Regular expression patterns for Zoom URL parsing
 * Supports various Zoom URL formats:
 * - https://zoom.us/j/123456789
 * - https://zoom.us/j/123456789?pwd=xxxxx
 * - https://us02web.zoom.us/j/123456789
 * - https://company.zoom.us/j/123456789?pwd=xxxxx
 */
const ZOOM_URL_PATTERNS = {
  /**
   * Main pattern to extract meeting ID and optional password
   * Captures: [1] domain, [2] meeting ID, [3] password (if present)
   */
  meetingUrl: /^https?:\/\/([\w-]+\.)?zoom\.us\/j\/(\d+)(?:\?pwd=([\w-]+))?/i,

  /**
   * Personal meeting room URLs
   * Format: https://zoom.us/my/username
   * Captures: [1] username
   */
  personalRoom: /^https?:\/\/(?:[\w-]+\.)?zoom\.us\/my\/([\w.-]+)/i,

  /**
   * Webinar URLs
   * Format: https://zoom.us/w/123456789
   * Captures: [1] webinar ID, [2] password (if present)
   */
  webinarUrl: /^https?:\/\/(?:[\w-]+\.)?zoom\.us\/w\/(\d+)(?:\?pwd=([\w-]+))?/i,
};

/**
 * Valid Zoom domains for security validation
 */
const VALID_ZOOM_DOMAINS = ['zoom.us', 'zoomgov.com'];

/**
 * Parse a Zoom meeting URL and extract meeting details
 * @param url - The Zoom URL to parse
 * @returns Parsed link details with meeting ID and password if available
 */
export function parseZoomLink(url: string): ParsedZoomLink {
  const trimmedUrl = url.trim();

  if (!trimmedUrl) {
    return {
      isValid: false,
      originalUrl: url,
    };
  }

  // Validate URL format
  let parsedUrl: URL;
  try {
    parsedUrl = new URL(trimmedUrl);
  } catch {
    return {
      isValid: false,
      originalUrl: url,
    };
  }

  // Security: Validate domain is a legitimate Zoom domain
  const hostname = parsedUrl.hostname.toLowerCase();
  const isValidDomain = VALID_ZOOM_DOMAINS.some(
    (domain) => hostname === domain || hostname.endsWith(`.${domain}`)
  );

  if (!isValidDomain) {
    return {
      isValid: false,
      originalUrl: url,
    };
  }

  // Try standard meeting URL pattern
  const meetingMatch = trimmedUrl.match(ZOOM_URL_PATTERNS.meetingUrl);
  if (meetingMatch) {
    const [, domain, meetingId, password] = meetingMatch;
    return {
      isValid: true,
      meetingId: meetingId,
      password: password,
      domain: domain ? `${domain}zoom.us` : 'zoom.us',
      originalUrl: url,
    };
  }

  // Try webinar URL pattern
  const webinarMatch = trimmedUrl.match(ZOOM_URL_PATTERNS.webinarUrl);
  if (webinarMatch) {
    const [, webinarId, password] = webinarMatch;
    return {
      isValid: true,
      meetingId: webinarId,
      password: password,
      domain: hostname,
      originalUrl: url,
    };
  }

  // Personal room URLs are valid but don't have a meeting ID until the meeting starts
  const personalMatch = trimmedUrl.match(ZOOM_URL_PATTERNS.personalRoom);
  if (personalMatch) {
    return {
      isValid: false, // Can't join without resolving to actual meeting ID
      originalUrl: url,
    };
  }

  return {
    isValid: false,
    originalUrl: url,
  };
}

/**
 * Check if a URL is a valid Zoom meeting link
 * @param url - The URL to check
 * @returns True if the URL is a valid Zoom meeting link
 */
export function isZoomLink(url: string): boolean {
  const parsed = parseZoomLink(url);
  return parsed.isValid;
}

/**
 * Extract meeting ID from a Zoom URL
 * @param url - The Zoom URL
 * @returns Meeting ID or null if invalid
 */
export function extractMeetingId(url: string): string | null {
  const parsed = parseZoomLink(url);
  return parsed.isValid ? (parsed.meetingId ?? null) : null;
}

/**
 * Normalize a meeting ID by removing any dashes or spaces
 * Zoom meeting IDs are typically 9-11 digits
 * @param meetingId - The meeting ID to normalize
 * @returns Normalized meeting ID (digits only)
 */
export function normalizeMeetingId(meetingId: string): string {
  return meetingId.replace(/[\s-]/g, '');
}

/**
 * Format a meeting ID for display (add dashes for readability)
 * @param meetingId - The meeting ID to format
 * @returns Formatted meeting ID (e.g., "123-456-7890")
 */
export function formatMeetingId(meetingId: string): string {
  const normalized = normalizeMeetingId(meetingId);

  if (normalized.length === 10) {
    return `${normalized.slice(0, 3)}-${normalized.slice(3, 6)}-${normalized.slice(6)}`;
  }

  if (normalized.length === 11) {
    return `${normalized.slice(0, 3)}-${normalized.slice(3, 7)}-${normalized.slice(7)}`;
  }

  // For other lengths, return as-is
  return normalized;
}
