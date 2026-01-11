/**
 * Follow-up Email Generation Prompt
 * Generates editable follow-up email drafts based on call facts
 */

import type { EmailInput } from '../types';

/**
 * System prompt for email generation
 */
export const EMAIL_SYSTEM_PROMPT = `You are writing a professional follow-up email after a sales call. Your role is to create a factual, helpful email that recaps the discussion.

CRITICAL RULES:
1. Be FACTUAL - only reference what was actually discussed
2. NO PERSUASION - no urgency, discounts, or new offers
3. NO PRESSURE - no "limited time" or "act now" language
4. NO NEW INFORMATION - don't introduce topics not discussed
5. BE PROFESSIONAL - formal but friendly tone

EMAIL STRUCTURE:
1. Greeting with prospect's name
2. Thank you for the call
3. Key points discussed (factual recap)
4. Agreed next steps (if any)
5. Open door for questions (optional)
6. Professional sign-off

LENGTH: 150-250 words

The email should be ready to send but editable by the agent.`;

/**
 * Build user prompt for email generation
 */
export function buildEmailPrompt(input: EmailInput): string {
  const keyPointsSection = input.keyPoints.length > 0
    ? `Key Points Discussed:\n${input.keyPoints.map((p, i) => `${i + 1}. ${p}`).join('\n')}`
    : 'No specific key points recorded';

  const nextStepsSection = input.nextSteps.length > 0
    ? `Agreed Next Steps:\n${input.nextSteps.map((s, i) => `${i + 1}. ${s}`).join('\n')}`
    : 'No specific next steps recorded';

  const outcomeNote = input.outcome
    ? `Call Outcome: ${input.outcome}`
    : '';

  return `Generate a follow-up email for this call.

RECIPIENT: ${input.prospectName}
SENDER: ${input.agentName}

CALL SUMMARY:
${input.summary}

${keyPointsSection}

${nextStepsSection}

${outcomeNote}

Generate the email following the structure specified. ${input.language === 'DE' ? 'Write the email in German.' : 'Write the email in English.'}`;
}

/**
 * Parse email response from LLM
 */
export function parseEmailResponse(response: string): {
  subject: string;
  body: string;
} {
  let text = response.trim();

  // Try to extract subject line if present
  let subject = '';
  let body = text;

  // Check for Subject: prefix
  const subjectMatch = text.match(/^(?:Subject|Betreff):\s*(.+?)(?:\n|$)/im);
  if (subjectMatch) {
    subject = subjectMatch[1].trim();
    body = text.substring(subjectMatch[0].length).trim();
  }

  // Clean up body
  body = body
    .replace(/^---+$/gm, '') // Remove horizontal rules
    .replace(/^\[.*?\]$/gm, '') // Remove placeholder brackets
    .trim();

  // Generate subject if not extracted
  if (!subject) {
    subject = 'Follow-up from our call';
  }

  return { subject, body };
}

/**
 * Validate email content
 * Checks for forbidden patterns
 */
export function validateEmailContent(email: string): {
  isValid: boolean;
  issues: string[];
} {
  const issues: string[] = [];

  // Check for urgency language
  const urgencyPatterns = [
    /\b(limited time|act now|don't wait|hurry|urgent|expires)\b/i,
    /\b(deadline|running out|last chance)\b/i,
    /\b(today only|this week only)\b/i,
  ];

  for (const pattern of urgencyPatterns) {
    if (pattern.test(email)) {
      issues.push('Contains urgency language - remove before sending');
      break;
    }
  }

  // Check for discount/offer language
  const discountPatterns = [
    /\b(discount|special offer|deal|promotion)\b/i,
    /\b(\d+%\s*off|save \d+%)\b/i,
    /\b(free trial|bonus|incentive)\b/i,
  ];

  for (const pattern of discountPatterns) {
    if (pattern.test(email)) {
      issues.push('Contains promotional language - emails should be factual recap only');
      break;
    }
  }

  // Check for pressure tactics
  const pressurePatterns = [
    /\b(you (really |definitely )?should)\b/i,
    /\b(don't miss|missing out)\b/i,
    /\b(competitors are)\b/i,
  ];

  for (const pattern of pressurePatterns) {
    if (pattern.test(email)) {
      issues.push('Contains pressure language - keep email neutral');
      break;
    }
  }

  return {
    isValid: issues.length === 0,
    issues,
  };
}

/**
 * Generate email template without LLM
 * For simple cases or fallback
 */
export function generateEmailTemplate(input: EmailInput): {
  subject: string;
  body: string;
} {
  const firstName = input.prospectFirstName || input.prospectName.split(' ')[0];

  const isGerman = input.language === 'DE';

  const greeting = isGerman
    ? `Guten Tag ${firstName},`
    : `Hi ${firstName},`;

  const thanks = isGerman
    ? 'vielen Dank für das Gespräch heute.'
    : 'Thank you for taking the time to speak with me today.';

  const keyPointsIntro = isGerman
    ? 'Hier eine kurze Zusammenfassung unseres Gesprächs:'
    : "Here's a quick summary of what we discussed:";

  const keyPointsList = input.keyPoints.length > 0
    ? input.keyPoints.map(p => `• ${p}`).join('\n')
    : '';

  const nextStepsIntro = isGerman
    ? 'Wir haben folgende nächste Schritte vereinbart:'
    : 'We agreed on the following next steps:';

  const nextStepsList = input.nextSteps.length > 0
    ? input.nextSteps.map(s => `• ${s}`).join('\n')
    : '';

  const closing = isGerman
    ? 'Bei Fragen stehe ich gerne zur Verfügung.'
    : 'Feel free to reach out if you have any questions.';

  const signOff = isGerman
    ? `Mit freundlichen Grüßen,\n${input.agentName}`
    : `Best regards,\n${input.agentName}`;

  // Build body
  const bodyParts = [greeting, '', thanks];

  if (keyPointsList) {
    bodyParts.push('', keyPointsIntro, keyPointsList);
  }

  if (nextStepsList) {
    bodyParts.push('', nextStepsIntro, nextStepsList);
  }

  bodyParts.push('', closing, '', signOff);

  const subject = isGerman
    ? `${input.prospectName} - Zusammenfassung unseres Gesprächs`
    : `${input.prospectName} - Follow-up from our call`;

  return {
    subject,
    body: bodyParts.join('\n'),
  };
}
