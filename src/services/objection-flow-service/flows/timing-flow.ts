/**
 * Timing Objection Flow - ST-013
 * 4-step diagnostic for handling timing objections
 */

import { ObjectionFlowDefinition } from './types';

export const timingFlow: ObjectionFlowDefinition = {
  type: 'Timing',
  displayName: 'Timing Objection',
  description: 'Handle concerns about timing, readiness, or "not now"',
  steps: [
    {
      stepNumber: 1,
      question: 'What would need to change for now to be the right time?',
      purpose: 'Surface real blocker',
      inputType: 'text',
      placeholder: 'What specific change would make now the right time?',
    },
    {
      stepNumber: 2,
      question: 'Is this a cash issue, a capacity issue, an emotional issue, or avoidance?',
      purpose: 'Identify timing objection type',
      inputType: 'select',
      options: [
        'Cash/budget issue',
        'Capacity/bandwidth issue',
        'Emotional readiness issue',
        'Avoidance/procrastination',
        'External factor (specify in notes)',
      ],
    },
    {
      stepNumber: 3,
      question: 'If we fast-forward 6 months and nothing has changed, how would you feel?',
      purpose: 'Future projection to surface urgency',
      inputType: 'text',
      placeholder: 'How do they respond to this scenario?',
    },
    {
      stepNumber: 4,
      question: "What's the cost of waiting another 6 months at your current trajectory?",
      purpose: 'Delay cost acknowledgment',
      inputType: 'text',
      placeholder: 'What costs/losses do they acknowledge?',
    },
  ],
  allowedOutcomes: ['Resolved', 'Deferred', 'Disqualified'],
};
