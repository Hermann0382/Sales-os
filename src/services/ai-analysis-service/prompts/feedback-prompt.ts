/**
 * Agent Feedback Prompt
 * Generates constructive feedback for agent improvement
 */

import type { FeedbackInput, RiskFlag } from '../types';

/**
 * System prompt for feedback generation
 */
export const FEEDBACK_SYSTEM_PROMPT = `You are a sales coach providing constructive feedback. Your role is to help agents improve their call execution.

FEEDBACK PRINCIPLES:
1. Be SPECIFIC - reference actual moments from the call
2. Be CONSTRUCTIVE - focus on improvement, not criticism
3. Be BALANCED - acknowledge what went well before suggesting improvements
4. Be ACTIONABLE - give concrete steps the agent can take

FEEDBACK STRUCTURE:
1. Strengths (2-3 specific things done well)
2. Improvement Areas (2-3 specific areas with examples)
3. Key Recommendations (2-3 actionable next steps)

TONE:
- Professional and supportive
- Direct but not harsh
- Focus on behaviors, not personality

LENGTH: 200-350 words total`;

/**
 * Build user prompt for feedback generation
 */
export function buildFeedbackPrompt(input: FeedbackInput): string {
  const milestonesSection = input.milestonesCompleted.length > 0
    ? `Milestones Completed: ${input.milestonesCompleted.join(', ')}`
    : 'No milestones completed';

  const skippedSection = input.milestonesSkipped.length > 0
    ? `Milestones Skipped: ${input.milestonesSkipped.join(', ')}`
    : '';

  const objectionsSection = input.objections.length > 0
    ? `Objections Handled:\n${input.objections.map(o => `- ${o.type}: ${o.outcome}`).join('\n')}`
    : 'No objections recorded';

  const risksSection = input.riskFlags.length > 0
    ? `Risk Flags Detected:\n${input.riskFlags.map(r => `- ${r.type} (${r.severity}): ${r.evidence.substring(0, 100)}`).join('\n')}`
    : 'No risk flags detected';

  return `Generate constructive feedback for this sales call.

CALL METRICS:
- ${milestonesSection}
${skippedSection ? `- ${skippedSection}` : ''}

${objectionsSection}

${risksSection}

TRANSCRIPT:
${input.transcript}

Generate feedback following the structure specified. ${input.language === 'DE' ? 'Write the feedback in German.' : 'Write the feedback in English.'}`;
}

/**
 * Parse feedback response from LLM
 */
export function parseFeedbackResponse(response: string): string {
  // Clean up the response
  let feedback = response.trim();

  // Remove any markdown headers if the model added structure
  feedback = feedback.replace(/^#+\s+/gm, '');

  // Ensure reasonable length
  if (feedback.length > 1500) {
    // Truncate at last sentence within limit
    const truncated = feedback.substring(0, 1500);
    const lastPeriod = truncated.lastIndexOf('.');
    if (lastPeriod > 1200) {
      feedback = truncated.substring(0, lastPeriod + 1);
    }
  }

  return feedback;
}

/**
 * Generate quick feedback summary
 * For when full LLM analysis isn't needed
 */
export function generateQuickFeedback(
  milestonesCompleted: string[],
  milestonesSkipped: string[],
  objectionsHandled: number,
  objectionsResolved: number,
  riskFlags: RiskFlag[]
): string {
  const lines: string[] = [];

  // Milestone completion
  const totalMilestones = milestonesCompleted.length + milestonesSkipped.length;
  if (totalMilestones > 0) {
    const completionRate = Math.round(
      (milestonesCompleted.length / totalMilestones) * 100
    );
    if (completionRate >= 80) {
      lines.push(`Strong milestone execution with ${completionRate}% completion rate.`);
    } else if (completionRate >= 50) {
      lines.push(`Moderate milestone progress. ${milestonesSkipped.length} milestones were skipped.`);
    } else {
      lines.push(`Milestone execution needs attention. Only ${completionRate}% completed.`);
    }
  }

  // Objection handling
  if (objectionsHandled > 0) {
    const resolutionRate = Math.round((objectionsResolved / objectionsHandled) * 100);
    if (resolutionRate >= 80) {
      lines.push(`Excellent objection handling with ${resolutionRate}% resolution rate.`);
    } else if (resolutionRate >= 50) {
      lines.push(`Objection handling adequate. ${objectionsHandled - objectionsResolved} objections remain unresolved.`);
    } else {
      lines.push(`Objection handling needs improvement. Only ${resolutionRate}% resolved.`);
    }
  }

  // Risk summary
  const highRisks = riskFlags.filter(r => r.severity === 'high').length;
  const mediumRisks = riskFlags.filter(r => r.severity === 'medium').length;

  if (highRisks > 0) {
    lines.push(`ATTENTION: ${highRisks} high-severity risk flag(s) detected. Review immediately.`);
  } else if (mediumRisks > 0) {
    lines.push(`${mediumRisks} medium-severity risk flag(s) detected. Consider reviewing approach.`);
  } else if (riskFlags.length === 0) {
    lines.push('No significant risk patterns detected. Good compliance.');
  }

  return lines.join('\n\n');
}

/**
 * Calculate execution score based on metrics
 */
export function calculateExecutionScore(
  milestonesCompleted: number,
  totalMilestones: number,
  objectionsResolved: number,
  objectionsTotal: number,
  riskFlags: RiskFlag[]
): number {
  let score = 100;

  // Milestone completion (up to -30 points)
  if (totalMilestones > 0) {
    const milestoneScore = (milestonesCompleted / totalMilestones) * 30;
    score -= (30 - milestoneScore);
  }

  // Objection handling (up to -30 points)
  if (objectionsTotal > 0) {
    const objectionScore = (objectionsResolved / objectionsTotal) * 30;
    score -= (30 - objectionScore);
  }

  // Risk penalties (up to -40 points)
  const riskPenalties = {
    high: 15,
    medium: 8,
    low: 3,
  };

  for (const flag of riskFlags) {
    score -= riskPenalties[flag.severity];
  }

  // Ensure score is within bounds
  return Math.max(0, Math.min(100, Math.round(score)));
}
