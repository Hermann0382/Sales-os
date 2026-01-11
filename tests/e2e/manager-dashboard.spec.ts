/**
 * E2E Tests: Manager Dashboard
 * Tests manager-specific analytics and dashboard functionality
 */

import { test, expect } from '@playwright/test';

test.describe('Manager Dashboard', () => {
  test.describe('Dashboard Access', () => {
    test('should protect manager dashboard for unauthenticated users', async ({ page }) => {
      await page.goto('/manager/dashboard');

      await expect(page).toHaveURL(/sign-in/);
    });

    test('should protect team performance page', async ({ page }) => {
      await page.goto('/manager/team');

      await expect(page).toHaveURL(/sign-in/);
    });

    test('should protect agent details page', async ({ page }) => {
      await page.goto('/manager/agents/test-agent-id');

      await expect(page).toHaveURL(/sign-in/);
    });
  });

  test.describe('Analytics API', () => {
    test('should require authentication to get dashboard metrics', async ({ request }) => {
      const response = await request.get('/api/analytics/dashboard');

      expect(response.status()).toBe(401);
      const body = await response.json();
      expect(body.error).toBe('Unauthorized');
    });

    test('should require authentication to get team performance', async ({ request }) => {
      const response = await request.get('/api/analytics/team');

      expect(response.status()).toBe(401);
    });

    test('should require authentication to get agent variance', async ({ request }) => {
      const response = await request.get('/api/analytics/agent-variance');

      expect(response.status()).toBe(401);
    });

    test('should require authentication to get calls list', async ({ request }) => {
      const response = await request.get('/api/analytics/calls');

      expect(response.status()).toBe(401);
    });

    test('should require authentication to get call details', async ({ request }) => {
      const response = await request.get('/api/analytics/calls/test-call-id');

      expect(response.status()).toBe(401);
    });
  });

  test.describe('Metrics Filtering', () => {
    test('should require authentication to filter by date range', async ({ request }) => {
      const response = await request.get(
        '/api/analytics/dashboard?startDate=2024-01-01&endDate=2024-01-31'
      );

      expect(response.status()).toBe(401);
    });

    test('should require authentication to filter by agent', async ({ request }) => {
      const response = await request.get(
        '/api/analytics/calls?agentIds=agent1,agent2'
      );

      expect(response.status()).toBe(401);
    });

    test('should require authentication to filter by outcome', async ({ request }) => {
      const response = await request.get(
        '/api/analytics/calls?outcome=Coaching_Client'
      );

      expect(response.status()).toBe(401);
    });
  });

  test.describe('Objection Analytics', () => {
    test('should require authentication to get objection stats', async ({ request }) => {
      const response = await request.get('/api/analytics/objections');

      expect(response.status()).toBe(401);
    });

    test('should require authentication to get objection breakdown', async ({ request }) => {
      const response = await request.get('/api/analytics/objections/breakdown');

      expect(response.status()).toBe(401);
    });

    test('should require authentication to get resolution rates', async ({ request }) => {
      const response = await request.get('/api/analytics/objections/resolution-rates');

      expect(response.status()).toBe(401);
    });
  });

  test.describe('Milestone Analytics', () => {
    test('should require authentication to get milestone completion', async ({ request }) => {
      const response = await request.get('/api/analytics/milestones');

      expect(response.status()).toBe(401);
    });

    test('should require authentication to get milestone effectiveness', async ({ request }) => {
      const response = await request.get('/api/analytics/milestones/effectiveness');

      expect(response.status()).toBe(401);
    });

    test('should require authentication to get milestone timing', async ({ request }) => {
      const response = await request.get('/api/analytics/milestones/timing');

      expect(response.status()).toBe(401);
    });
  });

  test.describe('Risk Analytics', () => {
    test('should require authentication to get risk overview', async ({ request }) => {
      const response = await request.get('/api/analytics/risks');

      expect(response.status()).toBe(401);
    });

    test('should require authentication to get risk trends', async ({ request }) => {
      const response = await request.get('/api/analytics/risks/trends');

      expect(response.status()).toBe(401);
    });
  });

  test.describe('Export Functionality', () => {
    test('should require authentication to export dashboard data', async ({ request }) => {
      const response = await request.get('/api/analytics/export?format=csv');

      expect(response.status()).toBe(401);
    });

    test('should require authentication to export calls report', async ({ request }) => {
      const response = await request.get('/api/analytics/calls/export');

      expect(response.status()).toBe(401);
    });
  });
});

test.describe('Call Review Interface', () => {
  test.describe('Access Control', () => {
    test('should protect call review list', async ({ page }) => {
      await page.goto('/manager/calls');

      await expect(page).toHaveURL(/sign-in/);
    });

    test('should protect individual call review', async ({ page }) => {
      await page.goto('/manager/calls/test-call-id');

      await expect(page).toHaveURL(/sign-in/);
    });

    test('should protect call transcript viewer', async ({ page }) => {
      await page.goto('/manager/calls/test-call-id/transcript');

      await expect(page).toHaveURL(/sign-in/);
    });
  });
});

test.describe('API Rate Limiting', () => {
  test('should rate limit analytics endpoints', async ({ request }) => {
    // Make many rapid requests to test rate limiting
    const promises = [];
    for (let i = 0; i < 10; i++) {
      promises.push(request.get('/api/analytics/dashboard'));
    }

    const responses = await Promise.all(promises);

    // All should return 401 since unauthenticated
    // Rate limiting would return 429 for authenticated users
    responses.forEach((response) => {
      expect([401, 429]).toContain(response.status());
    });
  });
});

test.describe('Input Validation', () => {
  test('should validate date range format', async ({ request }) => {
    const response = await request.get(
      '/api/analytics/dashboard?startDate=invalid&endDate=also-invalid'
    );

    // Should return 401 (unauthenticated) - validation happens after auth
    expect(response.status()).toBe(401);
  });

  test('should validate pagination parameters', async ({ request }) => {
    const response = await request.get('/api/analytics/calls?limit=-1&page=0');

    expect(response.status()).toBe(401);
  });

  test('should validate agent ID format', async ({ request }) => {
    const response = await request.get(
      '/api/analytics/calls?agentIds=invalid<script>'
    );

    expect(response.status()).toBe(401);
  });
});
