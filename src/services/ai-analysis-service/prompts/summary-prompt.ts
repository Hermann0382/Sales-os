/**
 * Summary Generation Prompt
 * Generates factual, neutral call summaries
 */

import type { SummaryInput } from '../types';

/**
 * System prompt for summary generation
 */
export const SUMMARY_SYSTEM_PROMPT = `You are a neutral call analyst. Your role is to generate factual, objective summaries of sales calls.

CRITICAL RULES:
1. Be FACTUAL - only state what was actually said or occurred
2. Be NEUTRAL - no persuasion language, no sales recommendations
3. Be OBJECTIVE - no speculation about prospect intent or feelings
4. NEVER use urgency language (e.g., "limited time", "act now")
5. NEVER include sales recommendations or next pitch suggestions
6. NEVER speculate about what the prospect "really" meant

OUTPUT FORMAT:
Your summary should be 200-400 words and cover:
1. Call Context - Who, why, and meeting setup
2. Current State Findings - What was learned about prospect's situation
3. Objections Raised - What concerns came up and how addressed
4. Outcome - What was decided and any concrete next steps

Write in professional, clear language. Use past tense.`;

/**
 * Build user prompt for summary generation
 */
export function buildSummaryPrompt(input: SummaryInput): string {
  const milestoneSection = input.milestonesCompleted.length > 0
    ? `Milestones Completed: ${input.milestonesCompleted.join(', ')}`
    : 'No milestones formally completed';

  const skippedSection = input.milestonesSkipped.length > 0
    ? `Milestones Skipped: ${input.milestonesSkipped.join(', ')}`
    : '';

  const clientInfo = input.clientCount !== undefined
    ? `Client Count: ${input.clientCount}`
    : 'Client count not specified';

  return `Generate a factual summary of this sales call.

CALL CONTEXT:
- Prospect: ${input.prospectName}
- ${clientInfo}
- Duration: ${input.durationMinutes} minutes
- ${milestoneSection}
${skippedSection ? `- ${skippedSection}` : ''}

TRANSCRIPT:
${input.transcript}

Generate a neutral, factual summary following the format specified. ${input.language === 'DE' ? 'Write the summary in German.' : 'Write the summary in English.'}`;
}

/**
 * Parse summary response from LLM
 */
export function parseSummaryResponse(response: string): string {
  // Clean up the response
  let summary = response.trim();

  // Remove any markdown headers if present
  summary = summary.replace(/^#+\s+/gm, '');

  // Remove any "Summary:" prefix if the model added it
  summary = summary.replace(/^(Summary|Zusammenfassung):\s*/i, '');

  // Ensure reasonable length
  if (summary.length > 2000) {
    // Truncate at last sentence within limit
    const truncated = summary.substring(0, 2000);
    const lastPeriod = truncated.lastIndexOf('.');
    if (lastPeriod > 1500) {
      summary = truncated.substring(0, lastPeriod + 1);
    }
  }

  return summary;
}

/**
 * Validate summary content
 * Checks for forbidden patterns that indicate non-neutral language
 */
export function validateSummaryContent(summary: string): {
  isValid: boolean;
  issues: string[];
} {
  const issues: string[] = [];

  // Check for urgency language
  const urgencyPatterns = [
    /\b(limited time|act now|don't wait|hurry|urgent|immediately)\b/i,
    /\b(deadline|expires|running out)\b/i,
  ];

  for (const pattern of urgencyPatterns) {
    if (pattern.test(summary)) {
      issues.push('Contains urgency language');
      break;
    }
  }

  // Check for sales recommendations
  const salesPatterns = [
    /\b(should (consider|try|buy|purchase|sign up))\b/i,
    /\b(recommend(ed|s)?|suggest(ed|s)?)\b/i,
    /\b(great (opportunity|deal|offer))\b/i,
  ];

  for (const pattern of salesPatterns) {
    if (pattern.test(summary)) {
      issues.push('Contains sales recommendation language');
      break;
    }
  }

  // Check for speculation
  const speculationPatterns = [
    /\b(probably|likely|seems to|appears to|might be)\b/i,
    /\b(really (means|wants|thinks))\b/i,
  ];

  for (const pattern of speculationPatterns) {
    if (pattern.test(summary)) {
      issues.push('Contains speculative language');
      break;
    }
  }

  return {
    isValid: issues.length === 0,
    issues,
  };
}
