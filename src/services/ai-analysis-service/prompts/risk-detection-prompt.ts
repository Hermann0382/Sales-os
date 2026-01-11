/**
 * Risk Detection Prompt
 * Detects risk patterns in call transcripts
 */

import { RiskType, type RiskFlag, type RiskDetectionInput } from '../types';

/**
 * System prompt for risk detection
 */
export const RISK_DETECTION_SYSTEM_PROMPT = `You are a sales quality analyst. Your role is to identify risk patterns in sales call transcripts that could harm the customer relationship or company reputation.

RISK TYPES TO DETECT:

1. OVERPROMISE - Agent makes unrealistic guarantees or inflated claims
   - Examples: "I guarantee 10x ROI", "You'll definitely see results in a week"
   - Severity: HIGH if specific numbers promised, MEDIUM if vague guarantees

2. PRESSURE_TACTIC - Agent uses manipulation or urgency to force decision
   - Examples: "This offer expires today", "Your competitors are already using this"
   - Severity: HIGH if repeated pressure, MEDIUM if single instance

3. MISALIGNMENT - Clear gap between prospect needs and what's being sold
   - Examples: Prospect says "we're not ready" but agent pushes close
   - Severity: HIGH if prospect explicitly objects, MEDIUM if subtle hesitation

4. QUALIFICATION_BYPASS - Agent ignores qualification criteria
   - Examples: Proceeding despite prospect being under minimum client threshold
   - Severity: HIGH if explicit bypass, MEDIUM if not properly verified

5. INCOMPLETE_DISCOVERY - Agent fails to understand prospect situation
   - Examples: Not asking about budget, timeline, or decision makers
   - Severity: MEDIUM typically, HIGH if leads to misalignment

OUTPUT FORMAT:
Return a JSON array of risk flags. Each flag must include:
- type: one of the risk types above
- severity: "low", "medium", or "high"
- evidence: exact quote from transcript (max 200 chars)
- recommendation: specific action to improve

If no risks detected, return an empty array: []`;

/**
 * Build user prompt for risk detection
 */
export function buildRiskDetectionPrompt(input: RiskDetectionInput): string {
  return `Analyze this sales call transcript for risk patterns.

TRANSCRIPT:
${input.transcript}

Identify any risk patterns following the types specified. Return your analysis as a JSON array.

${input.language === 'DE' ? 'The transcript is in German, but return your analysis in English.' : ''}

Respond ONLY with the JSON array, no additional text.`;
}

/**
 * Parse risk detection response from LLM
 */
export function parseRiskDetectionResponse(
  response: string,
  segments?: Array<{ id: string; text: string; startTime: number }>
): RiskFlag[] {
  try {
    // Extract JSON from response (handle markdown code blocks)
    let jsonStr = response.trim();

    // Remove markdown code block if present
    const jsonMatch = jsonStr.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (jsonMatch) {
      jsonStr = jsonMatch[1].trim();
    }

    // Parse JSON
    const parsed = JSON.parse(jsonStr);

    if (!Array.isArray(parsed)) {
      console.warn('Risk detection response is not an array');
      return [];
    }

    // Validate and transform each flag
    const flags: RiskFlag[] = [];

    for (const item of parsed) {
      // Validate required fields
      if (!item.type || !item.severity || !item.evidence) {
        continue;
      }

      // Validate risk type
      const validTypes = Object.values(RiskType);
      const normalizedType = item.type.toLowerCase();
      if (!validTypes.includes(normalizedType as RiskType)) {
        continue;
      }

      // Validate severity
      const validSeverities = ['low', 'medium', 'high'];
      const normalizedSeverity = item.severity.toLowerCase();
      if (!validSeverities.includes(normalizedSeverity)) {
        continue;
      }

      // Find timestamp if segments provided
      let timestamp: number | undefined;
      if (segments && item.evidence) {
        const evidenceLower = item.evidence.toLowerCase();
        for (const segment of segments) {
          if (segment.text.toLowerCase().includes(evidenceLower.substring(0, 50))) {
            timestamp = segment.startTime;
            break;
          }
        }
      }

      flags.push({
        type: normalizedType as RiskType,
        severity: normalizedSeverity as 'low' | 'medium' | 'high',
        evidence: item.evidence.substring(0, 200),
        transcriptTimestamp: timestamp,
        recommendation: item.recommendation || getDefaultRecommendation(normalizedType as RiskType),
      });
    }

    return flags;
  } catch (error) {
    console.error('Failed to parse risk detection response:', error);
    return [];
  }
}

/**
 * Get default recommendation for a risk type
 */
function getDefaultRecommendation(type: RiskType): string {
  switch (type) {
    case RiskType.OVERPROMISE:
      return 'Use specific, verifiable claims backed by data. Avoid absolute guarantees.';
    case RiskType.PRESSURE_TACTIC:
      return 'Focus on prospect needs rather than urgency. Allow time for decision-making.';
    case RiskType.MISALIGNMENT:
      return 'Re-qualify the prospect and ensure solution fits their actual needs.';
    case RiskType.QUALIFICATION_BYPASS:
      return 'Follow qualification criteria strictly. Document any exceptions with justification.';
    case RiskType.INCOMPLETE_DISCOVERY:
      return 'Complete the discovery checklist before presenting solutions.';
    default:
      return 'Review call approach and align with best practices.';
  }
}

/**
 * Calculate overall risk score from flags
 */
export function calculateRiskScore(flags: RiskFlag[]): {
  score: number;
  level: 'low' | 'medium' | 'high';
} {
  if (flags.length === 0) {
    return { score: 0, level: 'low' };
  }

  // Weight by severity
  const weights = { low: 1, medium: 2, high: 4 };
  const totalWeight = flags.reduce((sum, flag) => sum + weights[flag.severity], 0);

  // Normalize to 0-100 scale
  const maxPossible = flags.length * 4; // If all were high
  const score = Math.round((totalWeight / maxPossible) * 100);

  // Determine level
  let level: 'low' | 'medium' | 'high';
  if (score < 30) {
    level = 'low';
  } else if (score < 60) {
    level = 'medium';
  } else {
    level = 'high';
  }

  return { score, level };
}
