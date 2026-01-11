/**
 * Analytics Service Tests
 * Tests for metrics calculation and analytics functions
 */

import {
  calculateConversionRate,
  calculatePercentageChange,
  calculateAverage,
  calculateStdDev,
  getPreviousPeriod,
  getTimeRangeFromPreset,
  parseDateToUTC,
  determineTrend,
  calculateExecutionScore,
  calculateResolutionRate,
  groupAndCount,
  formatDuration,
} from '../metrics-calculator';
import type { TimeRange } from '../types';

describe('Analytics Service - Metrics Calculator', () => {
  describe('calculateConversionRate', () => {
    it('calculates rate with all outcome types', () => {
      const rate = calculateConversionRate(10, 5, 3, 2);

      // Positive = 10 + 5 + 3 = 18, Total = 20
      // Rate = 18 / 20 = 0.9
      expect(rate).toBe(0.9);
    });

    it('returns 0 for zero total', () => {
      const rate = calculateConversionRate(0, 0, 0, 0);
      expect(rate).toBe(0);
    });

    it('calculates 100% conversion when no disqualified', () => {
      const rate = calculateConversionRate(5, 3, 2, 0);
      expect(rate).toBe(1);
    });

    it('handles only disqualified outcomes', () => {
      const rate = calculateConversionRate(0, 0, 0, 10);
      expect(rate).toBe(0);
    });

    it('returns precision to 4 decimal places', () => {
      const rate = calculateConversionRate(1, 1, 1, 1);
      // 3 / 4 = 0.75
      expect(rate).toBe(0.75);
    });
  });

  describe('calculatePercentageChange', () => {
    it('calculates positive change', () => {
      const change = calculatePercentageChange(120, 100);
      expect(change).toBe(20);
    });

    it('calculates negative change', () => {
      const change = calculatePercentageChange(80, 100);
      expect(change).toBe(-20);
    });

    it('returns 0 for no change', () => {
      const change = calculatePercentageChange(100, 100);
      expect(change).toBe(0);
    });

    it('returns 100 when previous is 0 and current is positive', () => {
      const change = calculatePercentageChange(50, 0);
      expect(change).toBe(100);
    });

    it('returns 0 when both are 0', () => {
      const change = calculatePercentageChange(0, 0);
      expect(change).toBe(0);
    });

    it('handles decimal results', () => {
      const change = calculatePercentageChange(110, 100);
      expect(change).toBe(10);
    });
  });

  describe('calculateAverage', () => {
    it('calculates average of numbers', () => {
      const avg = calculateAverage([10, 20, 30]);
      expect(avg).toBe(20);
    });

    it('returns 0 for empty array', () => {
      const avg = calculateAverage([]);
      expect(avg).toBe(0);
    });

    it('handles single value', () => {
      const avg = calculateAverage([42]);
      expect(avg).toBe(42);
    });

    it('handles decimal values', () => {
      const avg = calculateAverage([1, 2, 3, 4]);
      expect(avg).toBe(2.5);
    });
  });

  describe('calculateStdDev', () => {
    it('calculates standard deviation', () => {
      const stdDev = calculateStdDev([2, 4, 4, 4, 5, 5, 7, 9]);
      expect(stdDev).toBe(2);
    });

    it('returns 0 for empty array', () => {
      const stdDev = calculateStdDev([]);
      expect(stdDev).toBe(0);
    });

    it('returns 0 for single value', () => {
      const stdDev = calculateStdDev([5]);
      expect(stdDev).toBe(0);
    });

    it('returns 0 for identical values', () => {
      const stdDev = calculateStdDev([10, 10, 10, 10]);
      expect(stdDev).toBe(0);
    });
  });

  describe('getPreviousPeriod', () => {
    it('calculates previous period correctly', () => {
      const current: TimeRange = {
        startDate: new Date('2024-01-15T00:00:00Z'),
        endDate: new Date('2024-01-22T23:59:59Z'),
      };

      const previous = getPreviousPeriod(current);

      expect(previous.endDate.toISOString()).toBe(current.startDate.toISOString());

      // Duration should be same as original
      const originalDuration = current.endDate.getTime() - current.startDate.getTime();
      const previousDuration = previous.endDate.getTime() - previous.startDate.getTime();
      expect(previousDuration).toBe(originalDuration);
    });

    it('works for month-long period', () => {
      const current: TimeRange = {
        startDate: new Date('2024-02-01T00:00:00Z'),
        endDate: new Date('2024-02-29T23:59:59Z'),
      };

      const previous = getPreviousPeriod(current);

      expect(previous.endDate).toEqual(current.startDate);
    });
  });

  describe('getTimeRangeFromPreset', () => {
    beforeEach(() => {
      // Mock current date to a fixed point
      jest.useFakeTimers();
      jest.setSystemTime(new Date('2024-06-15T12:00:00Z'));
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    it('returns week range', () => {
      const range = getTimeRangeFromPreset('week');

      expect(range.endDate.getUTCHours()).toBe(23);
      expect(range.endDate.getUTCMinutes()).toBe(59);

      // Duration is 7 days + end of day buffer (roughly 8 days total)
      const diffDays = Math.round(
        (range.endDate.getTime() - range.startDate.getTime()) / (1000 * 60 * 60 * 24)
      );
      expect(diffDays).toBeGreaterThanOrEqual(7);
      expect(diffDays).toBeLessThanOrEqual(8);
    });

    it('returns month range', () => {
      const range = getTimeRangeFromPreset('month');

      // Should be approximately 30-31 days + buffer for end of day
      const diffDays = Math.round(
        (range.endDate.getTime() - range.startDate.getTime()) / (1000 * 60 * 60 * 24)
      );
      expect(diffDays).toBeGreaterThanOrEqual(28);
      expect(diffDays).toBeLessThanOrEqual(33);
    });

    it('returns quarter range', () => {
      const range = getTimeRangeFromPreset('quarter');

      // Should be approximately 90 days + buffer
      const diffDays = Math.round(
        (range.endDate.getTime() - range.startDate.getTime()) / (1000 * 60 * 60 * 24)
      );
      expect(diffDays).toBeGreaterThanOrEqual(89);
      expect(diffDays).toBeLessThanOrEqual(94);
    });

    it('returns year range', () => {
      const range = getTimeRangeFromPreset('year');

      // Should be approximately 365 days + buffer
      const diffDays = Math.round(
        (range.endDate.getTime() - range.startDate.getTime()) / (1000 * 60 * 60 * 24)
      );
      expect(diffDays).toBeGreaterThanOrEqual(365);
      expect(diffDays).toBeLessThanOrEqual(368);
    });

    it('uses UTC for start dates', () => {
      const range = getTimeRangeFromPreset('week');

      expect(range.startDate.getUTCHours()).toBe(0);
      expect(range.startDate.getUTCMinutes()).toBe(0);
      expect(range.startDate.getUTCSeconds()).toBe(0);
    });
  });

  describe('parseDateToUTC', () => {
    it('parses date-only string to start of day UTC', () => {
      const date = parseDateToUTC('2024-06-15');

      expect(date.getUTCFullYear()).toBe(2024);
      expect(date.getUTCMonth()).toBe(5); // June (0-indexed)
      expect(date.getUTCDate()).toBe(15);
      expect(date.getUTCHours()).toBe(0);
      expect(date.getUTCMinutes()).toBe(0);
    });

    it('parses date-only string to end of day UTC', () => {
      const date = parseDateToUTC('2024-06-15', true);

      expect(date.getUTCHours()).toBe(23);
      expect(date.getUTCMinutes()).toBe(59);
      expect(date.getUTCSeconds()).toBe(59);
    });

    it('parses ISO timestamp directly', () => {
      const date = parseDateToUTC('2024-06-15T10:30:00.000Z');

      expect(date.getUTCHours()).toBe(10);
      expect(date.getUTCMinutes()).toBe(30);
    });

    it('ignores endOfDay flag for full timestamps', () => {
      const date = parseDateToUTC('2024-06-15T10:30:00.000Z', true);

      expect(date.getUTCHours()).toBe(10);
    });
  });

  describe('determineTrend', () => {
    it('returns up for positive change above threshold', () => {
      expect(determineTrend(10)).toBe('up');
      expect(determineTrend(6)).toBe('up');
    });

    it('returns down for negative change below threshold', () => {
      expect(determineTrend(-10)).toBe('down');
      expect(determineTrend(-6)).toBe('down');
    });

    it('returns stable for changes within threshold', () => {
      expect(determineTrend(0)).toBe('stable');
      expect(determineTrend(4)).toBe('stable');
      expect(determineTrend(-4)).toBe('stable');
    });

    it('uses custom threshold', () => {
      expect(determineTrend(8, 10)).toBe('stable');
      expect(determineTrend(12, 10)).toBe('up');
      expect(determineTrend(-12, 10)).toBe('down');
    });

    it('handles edge cases at threshold', () => {
      expect(determineTrend(5)).toBe('stable');
      expect(determineTrend(-5)).toBe('stable');
      expect(determineTrend(5.01)).toBe('up');
    });
  });

  describe('calculateExecutionScore', () => {
    it('calculates perfect score', () => {
      const score = calculateExecutionScore(1, 1, 1, 0);

      // 35 + 25 + 25 + 15 = 100
      expect(score).toBe(100);
    });

    it('calculates minimum score', () => {
      const score = calculateExecutionScore(0, 0, 0, 5);

      // Risk with 5 flags = 0, all others = 0
      expect(score).toBe(0);
    });

    it('includes risk penalty', () => {
      const noRiskScore = calculateExecutionScore(0.5, 0.5, 0.5, 0);
      const withRiskScore = calculateExecutionScore(0.5, 0.5, 0.5, 2);

      expect(withRiskScore).toBeLessThan(noRiskScore);
    });

    it('weights conversion rate highest', () => {
      // High conversion only
      const highConversion = calculateExecutionScore(1, 0, 0, 0);
      // High milestone only
      const highMilestone = calculateExecutionScore(0, 1, 0, 0);

      expect(highConversion).toBeGreaterThan(highMilestone);
    });

    it('caps score at 100', () => {
      // Even with impossible inputs, should cap at 100
      const score = calculateExecutionScore(2, 2, 2, -10);
      expect(score).toBeLessThanOrEqual(100);
    });

    it('floors score at 0', () => {
      const score = calculateExecutionScore(-1, -1, -1, 100);
      expect(score).toBeGreaterThanOrEqual(0);
    });
  });

  describe('calculateResolutionRate', () => {
    it('calculates resolution rate', () => {
      expect(calculateResolutionRate(3, 4)).toBe(0.75);
    });

    it('returns 0 for zero total', () => {
      expect(calculateResolutionRate(0, 0)).toBe(0);
    });

    it('returns 1 for all resolved', () => {
      expect(calculateResolutionRate(10, 10)).toBe(1);
    });

    it('returns precision to 4 decimal places', () => {
      expect(calculateResolutionRate(1, 3)).toBe(0.3333);
    });
  });

  describe('groupAndCount', () => {
    it('groups items by key', () => {
      const items = [
        { type: 'A' },
        { type: 'B' },
        { type: 'A' },
        { type: 'A' },
        { type: 'B' },
      ];

      const result = groupAndCount(items, (item) => item.type);

      expect(result).toEqual({ A: 3, B: 2 });
    });

    it('returns empty object for empty array', () => {
      const result = groupAndCount([], (item: { type: string }) => item.type);
      expect(result).toEqual({});
    });

    it('handles single item', () => {
      const items = [{ category: 'test' }];
      const result = groupAndCount(items, (item) => item.category);

      expect(result).toEqual({ test: 1 });
    });

    it('handles complex key functions', () => {
      const items = [
        { date: new Date('2024-01-15') },
        { date: new Date('2024-01-15') },
        { date: new Date('2024-02-20') },
      ];

      const result = groupAndCount(
        items,
        (item) => `${item.date.getFullYear()}-${item.date.getMonth() + 1}`
      );

      expect(result).toEqual({ '2024-1': 2, '2024-2': 1 });
    });
  });

  describe('formatDuration', () => {
    it('formats seconds only', () => {
      expect(formatDuration(45)).toBe('45s');
    });

    it('formats minutes and seconds', () => {
      expect(formatDuration(90)).toBe('1m 30s');
    });

    it('formats minutes only when no seconds', () => {
      expect(formatDuration(120)).toBe('2m');
    });

    it('formats hours and minutes', () => {
      expect(formatDuration(3720)).toBe('1h 2m');
    });

    it('formats hours only when no minutes', () => {
      expect(formatDuration(3600)).toBe('1h');
    });

    it('rounds seconds', () => {
      expect(formatDuration(45.7)).toBe('46s');
    });

    it('handles zero', () => {
      expect(formatDuration(0)).toBe('0s');
    });

    it('handles large durations', () => {
      expect(formatDuration(7200)).toBe('2h');
      expect(formatDuration(7260)).toBe('2h 1m');
    });
  });
});
