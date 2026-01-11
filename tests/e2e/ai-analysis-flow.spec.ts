/**
 * E2E Tests: AI Analysis Flow
 * Tests AI-powered post-call analysis functionality
 */

import { test, expect } from '@playwright/test';

test.describe('AI Analysis Flow', () => {
  test.describe('Analysis API Authentication', () => {
    test('should require authentication to get analysis', async ({ request }) => {
      const response = await request.get('/api/calls/test-call/analysis');

      expect(response.status()).toBe(401);
      const body = await response.json();
      expect(body.error).toBe('Unauthorized');
    });

    test('should require authentication to generate analysis', async ({ request }) => {
      const response = await request.post('/api/calls/test-call/analysis', {
        data: {
          transcriptText: 'Sample transcript text',
          duration: 1800,
        },
      });

      expect(response.status()).toBe(401);
    });

    test('should require authentication to regenerate analysis', async ({ request }) => {
      const response = await request.post('/api/calls/test-call/analysis/regenerate');

      expect(response.status()).toBe(401);
    });
  });

  test.describe('Risk Detection API', () => {
    test('should require authentication to get risk flags', async ({ request }) => {
      const response = await request.get('/api/calls/test-call/risks');

      expect(response.status()).toBe(401);
    });
  });

  test.describe('Summary API', () => {
    test('should require authentication to get call summary', async ({ request }) => {
      const response = await request.get('/api/calls/test-call/summary');

      expect(response.status()).toBe(401);
    });
  });

  test.describe('Follow-up Email API', () => {
    test('should require authentication to get email draft', async ({ request }) => {
      const response = await request.get('/api/calls/test-call/email-draft');

      expect(response.status()).toBe(401);
    });

    test('should require authentication to send follow-up email', async ({ request }) => {
      const response = await request.post('/api/calls/test-call/send-email', {
        data: {
          to: 'test@example.com',
          subject: 'Follow-up',
          body: 'Thank you for the call',
        },
      });

      expect(response.status()).toBe(401);
    });
  });
});

test.describe('Analysis Results Display', () => {
  test('should protect analysis page for unauthenticated users', async ({ page }) => {
    // Try to access call analysis page
    await page.goto('/call/test-call/analysis');

    // Should redirect to sign-in
    await expect(page).toHaveURL(/sign-in/);
  });

  test('should protect call review page for unauthenticated users', async ({ page }) => {
    await page.goto('/call/test-call/review');

    await expect(page).toHaveURL(/sign-in/);
  });
});

test.describe('Agent Feedback API', () => {
  test('should require authentication to get agent feedback', async ({ request }) => {
    const response = await request.get('/api/calls/test-call/feedback');

    expect(response.status()).toBe(401);
  });

  test('should require authentication to submit feedback response', async ({ request }) => {
    const response = await request.post('/api/calls/test-call/feedback', {
      data: {
        acknowledged: true,
        notes: 'Understood the feedback',
      },
    });

    expect(response.status()).toBe(401);
  });
});

test.describe('Evidence Markers API', () => {
  test('should require authentication to get evidence markers', async ({ request }) => {
    const response = await request.get('/api/calls/test-call/evidence');

    expect(response.status()).toBe(401);
  });
});
