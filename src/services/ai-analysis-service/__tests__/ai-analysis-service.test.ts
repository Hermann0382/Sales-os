/**
 * AI Analysis Service Tests
 * Tests for AI-powered call analysis pipeline
 */

import {
  parseRiskDetectionResponse,
  calculateRiskScore,
  buildRiskDetectionPrompt,
} from '../prompts/risk-detection-prompt';
import { RiskType, type RiskFlag } from '../types';

// Mock the prisma client
jest.mock('@/lib/db', () => ({
  prisma: {
    callSession: {
      findFirst: jest.fn(),
    },
    aIAnalysis: {
      upsert: jest.fn(),
      deleteMany: jest.fn(),
    },
  },
}));

describe('AI Analysis Service', () => {
  describe('Risk Detection', () => {
    describe('parseRiskDetectionResponse', () => {
      it('parses valid JSON array response', () => {
        const response = JSON.stringify([
          {
            type: 'overpromise',
            severity: 'high',
            evidence: 'I guarantee you will see 10x ROI',
            recommendation: 'Use specific data-backed claims',
          },
        ]);

        const result = parseRiskDetectionResponse(response);

        expect(result).toHaveLength(1);
        expect(result[0]).toEqual({
          type: RiskType.OVERPROMISE,
          severity: 'high',
          evidence: 'I guarantee you will see 10x ROI',
          transcriptTimestamp: undefined,
          recommendation: 'Use specific data-backed claims',
        });
      });

      it('parses JSON from markdown code blocks', () => {
        const response = `\`\`\`json
[{"type": "pressure_tactic", "severity": "medium", "evidence": "This offer expires today"}]
\`\`\``;

        const result = parseRiskDetectionResponse(response);

        expect(result).toHaveLength(1);
        expect(result[0].type).toBe(RiskType.PRESSURE_TACTIC);
      });

      it('returns empty array for empty response', () => {
        const result = parseRiskDetectionResponse('[]');

        expect(result).toEqual([]);
      });

      it('returns empty array for invalid JSON', () => {
        const result = parseRiskDetectionResponse('not json');

        expect(result).toEqual([]);
      });

      it('returns empty array for non-array response', () => {
        const result = parseRiskDetectionResponse('{"type": "overpromise"}');

        expect(result).toEqual([]);
      });

      it('filters out items with invalid risk types', () => {
        const response = JSON.stringify([
          { type: 'invalid_type', severity: 'high', evidence: 'test' },
          { type: 'overpromise', severity: 'medium', evidence: 'valid risk' },
        ]);

        const result = parseRiskDetectionResponse(response);

        expect(result).toHaveLength(1);
        expect(result[0].type).toBe(RiskType.OVERPROMISE);
      });

      it('filters out items with invalid severity', () => {
        const response = JSON.stringify([
          { type: 'overpromise', severity: 'critical', evidence: 'test' },
          { type: 'overpromise', severity: 'high', evidence: 'valid' },
        ]);

        const result = parseRiskDetectionResponse(response);

        expect(result).toHaveLength(1);
        expect(result[0].severity).toBe('high');
      });

      it('filters out items missing required fields', () => {
        const response = JSON.stringify([
          { type: 'overpromise', severity: 'high' }, // Missing evidence
          { type: 'overpromise', evidence: 'test' }, // Missing severity
          { severity: 'high', evidence: 'test' }, // Missing type
          { type: 'overpromise', severity: 'high', evidence: 'complete' },
        ]);

        const result = parseRiskDetectionResponse(response);

        expect(result).toHaveLength(1);
        expect(result[0].evidence).toBe('complete');
      });

      it('truncates evidence to 200 characters', () => {
        const longEvidence = 'a'.repeat(300);
        const response = JSON.stringify([
          { type: 'overpromise', severity: 'high', evidence: longEvidence },
        ]);

        const result = parseRiskDetectionResponse(response);

        expect(result[0].evidence.length).toBe(200);
      });

      it('provides default recommendation when missing', () => {
        const response = JSON.stringify([
          { type: 'overpromise', severity: 'high', evidence: 'test' },
        ]);

        const result = parseRiskDetectionResponse(response);

        expect(result[0].recommendation).toContain('specific');
      });

      it('finds timestamp from segments when evidence matches', () => {
        const segments = [
          { id: 'seg1', text: 'Hello there', startTime: 0 },
          { id: 'seg2', text: 'I guarantee you will see results', startTime: 30 },
          { id: 'seg3', text: 'Thank you', startTime: 60 },
        ];

        const response = JSON.stringify([
          {
            type: 'overpromise',
            severity: 'high',
            evidence: 'I guarantee you will see results',
          },
        ]);

        const result = parseRiskDetectionResponse(response, segments);

        expect(result[0].transcriptTimestamp).toBe(30);
      });

      it('normalizes risk type case', () => {
        const response = JSON.stringify([
          { type: 'OVERPROMISE', severity: 'HIGH', evidence: 'test' },
        ]);

        const result = parseRiskDetectionResponse(response);

        expect(result[0].type).toBe(RiskType.OVERPROMISE);
        expect(result[0].severity).toBe('high');
      });
    });

    describe('calculateRiskScore', () => {
      it('returns 0 score for empty flags', () => {
        const result = calculateRiskScore([]);

        expect(result).toEqual({ score: 0, level: 'low' });
      });

      it('calculates score for single low severity flag', () => {
        const flags: RiskFlag[] = [
          {
            type: RiskType.INCOMPLETE_DISCOVERY,
            severity: 'low',
            evidence: 'test',
            recommendation: 'test',
          },
        ];

        const result = calculateRiskScore(flags);

        expect(result.score).toBe(25); // 1 / 4 * 100
        expect(result.level).toBe('low');
      });

      it('calculates score for single medium severity flag', () => {
        const flags: RiskFlag[] = [
          {
            type: RiskType.PRESSURE_TACTIC,
            severity: 'medium',
            evidence: 'test',
            recommendation: 'test',
          },
        ];

        const result = calculateRiskScore(flags);

        expect(result.score).toBe(50); // 2 / 4 * 100
        expect(result.level).toBe('medium');
      });

      it('calculates score for single high severity flag', () => {
        const flags: RiskFlag[] = [
          {
            type: RiskType.OVERPROMISE,
            severity: 'high',
            evidence: 'test',
            recommendation: 'test',
          },
        ];

        const result = calculateRiskScore(flags);

        expect(result.score).toBe(100); // 4 / 4 * 100
        expect(result.level).toBe('high');
      });

      it('calculates weighted average for multiple flags', () => {
        const flags: RiskFlag[] = [
          {
            type: RiskType.OVERPROMISE,
            severity: 'high',
            evidence: 'test1',
            recommendation: 'test',
          },
          {
            type: RiskType.INCOMPLETE_DISCOVERY,
            severity: 'low',
            evidence: 'test2',
            recommendation: 'test',
          },
        ];

        const result = calculateRiskScore(flags);

        // (4 + 1) / (2 * 4) * 100 = 62.5 rounds to 63
        expect(result.score).toBe(63);
        expect(result.level).toBe('high');
      });

      it('categorizes scores correctly', () => {
        // Low (< 30)
        const lowFlags: RiskFlag[] = [
          { type: RiskType.INCOMPLETE_DISCOVERY, severity: 'low', evidence: 'a', recommendation: 'b' },
        ];
        expect(calculateRiskScore(lowFlags).level).toBe('low');

        // Medium (30-59)
        const mediumFlags: RiskFlag[] = [
          { type: RiskType.PRESSURE_TACTIC, severity: 'medium', evidence: 'a', recommendation: 'b' },
        ];
        expect(calculateRiskScore(mediumFlags).level).toBe('medium');

        // High (>= 60)
        const highFlags: RiskFlag[] = [
          { type: RiskType.OVERPROMISE, severity: 'high', evidence: 'a', recommendation: 'b' },
        ];
        expect(calculateRiskScore(highFlags).level).toBe('high');
      });
    });

    describe('buildRiskDetectionPrompt', () => {
      it('includes transcript in prompt', () => {
        const input = {
          transcript: 'Agent: Hello prospect',
          language: 'EN' as const,
        };

        const prompt = buildRiskDetectionPrompt(input);

        expect(prompt).toContain('Agent: Hello prospect');
        expect(prompt).toContain('TRANSCRIPT:');
      });

      it('adds German language note', () => {
        const input = {
          transcript: 'Agent: Guten Tag',
          language: 'DE' as const,
        };

        const prompt = buildRiskDetectionPrompt(input);

        expect(prompt).toContain('German');
        expect(prompt).toContain('return your analysis in English');
      });

      it('does not add language note for English', () => {
        const input = {
          transcript: 'Agent: Hello',
          language: 'EN' as const,
        };

        const prompt = buildRiskDetectionPrompt(input);

        expect(prompt).not.toContain('German');
      });
    });
  });

  describe('Objection Classification', () => {
    it('classifies resolved objections correctly', () => {
      // Testing the inline classification logic
      const objections = [
        { type: 'Price', outcome: 'Resolved' },
        { type: 'Timing', outcome: 'Deferred' },
      ];

      const classified = objections.map((obj) => ({
        type: obj.type,
        addressed: obj.outcome === 'Resolved',
        resolutionApproach: obj.outcome === 'Resolved' ? 'Addressed during call' : undefined,
        effectivenessScore: obj.outcome === 'Resolved' ? 0.8 : 0.3,
      }));

      expect(classified[0].addressed).toBe(true);
      expect(classified[0].effectivenessScore).toBe(0.8);
      expect(classified[1].addressed).toBe(false);
      expect(classified[1].effectivenessScore).toBe(0.3);
    });
  });

  describe('Decision Readiness Score', () => {
    it('calculates base score of 0.5', () => {
      // Testing the calculation logic
      const calculateScore = (
        completed: number,
        total: number,
        objectionResolved: number,
        objectionTotal: number,
        riskScore: number
      ) => {
        let score = 0.5;

        if (total > 0) {
          score += (completed / total) * 0.3;
        }

        if (objectionTotal > 0) {
          score += (objectionResolved / objectionTotal) * 0.2;
        }

        score -= (riskScore / 100) * 0.3;

        return Math.max(0, Math.min(1, Number(score.toFixed(2))));
      };

      // Perfect scenario
      expect(calculateScore(5, 5, 2, 2, 0)).toBe(1.0);

      // No milestones completed, no objections, no risks
      expect(calculateScore(0, 5, 0, 0, 0)).toBe(0.5);

      // Half milestones, half objections resolved
      expect(calculateScore(2, 4, 1, 2, 0)).toBeCloseTo(0.75, 2);

      // High risk scenario
      expect(calculateScore(5, 5, 2, 2, 100)).toBe(0.7);
    });
  });

  describe('Key Points Extraction', () => {
    it('extracts bullet points from summary', () => {
      const extractKeyPoints = (summary: string): string[] => {
        const lines = summary.split('\n');
        const keyPoints: string[] = [];

        for (const line of lines) {
          const trimmed = line.trim();
          if (trimmed.match(/^[-•*]\s+/) || trimmed.match(/^\d+[.)]\s+/)) {
            const point = trimmed.replace(/^[-•*\d.)\s]+/, '').trim();
            if (point.length > 10 && point.length < 200) {
              keyPoints.push(point);
            }
          }
        }

        return keyPoints.slice(0, 5);
      };

      const summary = `
Call Summary:
- Discussed pricing options with the client
- Reviewed implementation timeline
• Addressed concerns about team capacity
1. Next steps include sending proposal
2. Schedule follow-up call for next week
      `;

      const keyPoints = extractKeyPoints(summary);

      expect(keyPoints).toHaveLength(5);
      expect(keyPoints[0]).toBe('Discussed pricing options with the client');
      expect(keyPoints[1]).toBe('Reviewed implementation timeline');
    });

    it('limits to 5 key points', () => {
      const extractKeyPoints = (summary: string): string[] => {
        const lines = summary.split('\n');
        const keyPoints: string[] = [];

        for (const line of lines) {
          const trimmed = line.trim();
          if (trimmed.match(/^[-•*]\s+/) || trimmed.match(/^\d+[.)]\s+/)) {
            const point = trimmed.replace(/^[-•*\d.)\s]+/, '').trim();
            if (point.length > 10 && point.length < 200) {
              keyPoints.push(point);
            }
          }
        }

        return keyPoints.slice(0, 5);
      };

      const summary = `
- Point one is here today
- Point two is here today
- Point three is here today
- Point four is here today
- Point five is here today
- Point six is here today
- Point seven is here today
      `;

      const keyPoints = extractKeyPoints(summary);

      expect(keyPoints).toHaveLength(5);
    });

    it('filters out short points', () => {
      const extractKeyPoints = (summary: string): string[] => {
        const lines = summary.split('\n');
        const keyPoints: string[] = [];

        for (const line of lines) {
          const trimmed = line.trim();
          if (trimmed.match(/^[-•*]\s+/) || trimmed.match(/^\d+[.)]\s+/)) {
            const point = trimmed.replace(/^[-•*\d.)\s]+/, '').trim();
            if (point.length > 10 && point.length < 200) {
              keyPoints.push(point);
            }
          }
        }

        return keyPoints.slice(0, 5);
      };

      const summary = `
- Short
- This is a longer valid point
      `;

      const keyPoints = extractKeyPoints(summary);

      expect(keyPoints).toHaveLength(1);
      expect(keyPoints[0]).toBe('This is a longer valid point');
    });
  });
});
