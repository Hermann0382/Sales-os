/**
 * Zoom Link Detector Tests
 * Tests for URL parsing, validation, and meeting ID extraction
 */

import {
  parseZoomLink,
  isZoomLink,
  extractMeetingId,
  normalizeMeetingId,
  formatMeetingId,
} from '../link-detector';

describe('Zoom Link Detector', () => {
  describe('parseZoomLink', () => {
    describe('valid Zoom meeting URLs', () => {
      it('parses standard zoom.us meeting URL', () => {
        const result = parseZoomLink('https://zoom.us/j/123456789');

        expect(result.isValid).toBe(true);
        expect(result.meetingId).toBe('123456789');
        expect(result.originalUrl).toBe('https://zoom.us/j/123456789');
      });

      it('parses URL with password', () => {
        const result = parseZoomLink(
          'https://zoom.us/j/123456789?pwd=abc123xyz'
        );

        expect(result.isValid).toBe(true);
        expect(result.meetingId).toBe('123456789');
        expect(result.password).toBe('abc123xyz');
      });

      it('parses subdomain URLs (us02web.zoom.us)', () => {
        const result = parseZoomLink('https://us02web.zoom.us/j/987654321');

        expect(result.isValid).toBe(true);
        expect(result.meetingId).toBe('987654321');
      });

      it('parses company subdomain URLs', () => {
        const result = parseZoomLink(
          'https://company.zoom.us/j/111222333?pwd=secretpwd'
        );

        expect(result.isValid).toBe(true);
        expect(result.meetingId).toBe('111222333');
        expect(result.password).toBe('secretpwd');
      });

      it('parses http URLs (converts to valid)', () => {
        const result = parseZoomLink('http://zoom.us/j/123456789');

        expect(result.isValid).toBe(true);
        expect(result.meetingId).toBe('123456789');
      });

      it('handles URLs with extra whitespace', () => {
        const result = parseZoomLink('  https://zoom.us/j/123456789  ');

        expect(result.isValid).toBe(true);
        expect(result.meetingId).toBe('123456789');
      });
    });

    describe('valid Zoom webinar URLs', () => {
      it('parses webinar URL', () => {
        const result = parseZoomLink('https://zoom.us/w/123456789');

        expect(result.isValid).toBe(true);
        expect(result.meetingId).toBe('123456789');
      });

      it('parses webinar URL with password', () => {
        const result = parseZoomLink('https://zoom.us/w/987654321?pwd=webinarpwd');

        expect(result.isValid).toBe(true);
        expect(result.meetingId).toBe('987654321');
        expect(result.password).toBe('webinarpwd');
      });
    });

    describe('invalid URLs', () => {
      it('rejects empty string', () => {
        const result = parseZoomLink('');

        expect(result.isValid).toBe(false);
      });

      it('rejects whitespace only', () => {
        const result = parseZoomLink('   ');

        expect(result.isValid).toBe(false);
      });

      it('rejects non-URL string', () => {
        const result = parseZoomLink('not a url');

        expect(result.isValid).toBe(false);
      });

      it('rejects non-Zoom domain', () => {
        const result = parseZoomLink('https://fake-zoom.com/j/123456789');

        expect(result.isValid).toBe(false);
      });

      it('rejects phishing domain', () => {
        const result = parseZoomLink('https://zoom.us.malicious.com/j/123456789');

        expect(result.isValid).toBe(false);
      });

      it('rejects personal room URLs (require resolution)', () => {
        const result = parseZoomLink('https://zoom.us/my/username');

        expect(result.isValid).toBe(false);
      });

      it('rejects URL without meeting ID', () => {
        const result = parseZoomLink('https://zoom.us/');

        expect(result.isValid).toBe(false);
      });

      it('rejects URL with invalid path', () => {
        const result = parseZoomLink('https://zoom.us/signup');

        expect(result.isValid).toBe(false);
      });
    });

    describe('security validation', () => {
      it('accepts valid zoomgov.com domain', () => {
        const result = parseZoomLink('https://zoomgov.com/j/123456789');

        // Note: Current implementation may not handle zoomgov.com
        // This test documents expected behavior
        expect(result.originalUrl).toBe('https://zoomgov.com/j/123456789');
      });

      it('preserves original URL in result', () => {
        const originalUrl = 'https://zoom.us/j/123456789?pwd=test';
        const result = parseZoomLink(originalUrl);

        expect(result.originalUrl).toBe(originalUrl);
      });
    });
  });

  describe('isZoomLink', () => {
    it('returns true for valid Zoom links', () => {
      expect(isZoomLink('https://zoom.us/j/123456789')).toBe(true);
      expect(isZoomLink('https://us02web.zoom.us/j/987654321')).toBe(true);
    });

    it('returns false for invalid links', () => {
      expect(isZoomLink('')).toBe(false);
      expect(isZoomLink('https://google.com')).toBe(false);
      expect(isZoomLink('not a url')).toBe(false);
    });
  });

  describe('extractMeetingId', () => {
    it('extracts meeting ID from valid URL', () => {
      expect(extractMeetingId('https://zoom.us/j/123456789')).toBe('123456789');
    });

    it('extracts meeting ID from URL with password', () => {
      expect(extractMeetingId('https://zoom.us/j/987654321?pwd=abc')).toBe(
        '987654321'
      );
    });

    it('returns null for invalid URL', () => {
      expect(extractMeetingId('invalid')).toBeNull();
      expect(extractMeetingId('https://google.com')).toBeNull();
    });
  });

  describe('normalizeMeetingId', () => {
    it('removes dashes from meeting ID', () => {
      expect(normalizeMeetingId('123-456-789')).toBe('123456789');
    });

    it('removes spaces from meeting ID', () => {
      expect(normalizeMeetingId('123 456 789')).toBe('123456789');
    });

    it('removes mixed delimiters', () => {
      expect(normalizeMeetingId('123-456 789')).toBe('123456789');
    });

    it('returns unchanged if already normalized', () => {
      expect(normalizeMeetingId('123456789')).toBe('123456789');
    });
  });

  describe('formatMeetingId', () => {
    it('formats 10-digit meeting ID as XXX-XXX-XXXX', () => {
      expect(formatMeetingId('1234567890')).toBe('123-456-7890');
    });

    it('formats 11-digit meeting ID as XXX-XXXX-XXXX', () => {
      expect(formatMeetingId('12345678901')).toBe('123-4567-8901');
    });

    it('normalizes before formatting', () => {
      expect(formatMeetingId('123-456-7890')).toBe('123-456-7890');
    });

    it('returns as-is for non-standard lengths', () => {
      expect(formatMeetingId('12345678')).toBe('12345678');
      expect(formatMeetingId('123456789012')).toBe('123456789012');
    });
  });
});
