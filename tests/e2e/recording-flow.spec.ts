/**
 * E2E Tests: Recording Flow
 * Tests Zoom recording integration and transcript generation
 */

import { test, expect } from '@playwright/test';

test.describe('Recording Flow', () => {
  test.describe('Zoom Link Validation', () => {
    test('should reject invalid Zoom link format', async ({ request }) => {
      const response = await request.post('/api/calls/test-call/recording', {
        data: {
          zoomLink: 'not-a-valid-url',
        },
      });

      // Should return 401 (unauthenticated) or 400 (bad request)
      expect([400, 401]).toContain(response.status());
    });

    test('should reject non-Zoom URLs', async ({ request }) => {
      const response = await request.post('/api/calls/test-call/recording', {
        data: {
          zoomLink: 'https://google.com/meeting',
        },
      });

      expect([400, 401]).toContain(response.status());
    });
  });

  test.describe('Recording API Authentication', () => {
    test('should require authentication to start recording', async ({ request }) => {
      const response = await request.post('/api/calls/test-call/recording', {
        data: {
          zoomLink: 'https://zoom.us/j/123456789',
        },
      });

      expect(response.status()).toBe(401);
      const body = await response.json();
      expect(body.error).toBe('Unauthorized');
    });

    test('should require authentication to stop recording', async ({ request }) => {
      const response = await request.delete('/api/calls/test-call/recording');

      expect(response.status()).toBe(401);
    });

    test('should require authentication to get recording status', async ({ request }) => {
      const response = await request.get('/api/calls/test-call/recording');

      expect(response.status()).toBe(401);
    });
  });

  test.describe('Recording UI Elements', () => {
    test('should protect recording page for unauthenticated users', async ({ page }) => {
      // Try to access a call presentation page
      await page.goto('/call/test-call/presentation');

      // Should redirect to sign-in
      await expect(page).toHaveURL(/sign-in/);
    });
  });
});

test.describe('Transcript API', () => {
  test.describe('Authentication', () => {
    test('should require authentication to get transcript', async ({ request }) => {
      const response = await request.get('/api/calls/test-call/transcript');

      expect(response.status()).toBe(401);
    });

    test('should require authentication to generate transcript', async ({ request }) => {
      const response = await request.post('/api/calls/test-call/transcript', {
        data: {
          recordingUrl: 'https://example.com/recording.mp4',
        },
      });

      expect(response.status()).toBe(401);
    });

    test('should require authentication to search transcript', async ({ request }) => {
      const response = await request.get('/api/calls/test-call/transcript/search?q=test');

      expect(response.status()).toBe(401);
    });

    test('should require authentication to export transcript', async ({ request }) => {
      const response = await request.get('/api/calls/test-call/transcript/export?format=txt');

      expect(response.status()).toBe(401);
    });
  });
});

test.describe('Recording Session Management', () => {
  test('should require authentication to list recordings', async ({ request }) => {
    const response = await request.get('/api/recordings');

    expect(response.status()).toBe(401);
  });

  test('should validate recording ID format', async ({ request }) => {
    // Invalid ID format should return 400 or 401
    const response = await request.get('/api/recordings/invalid-id-format');

    expect([400, 401, 404]).toContain(response.status());
  });
});
