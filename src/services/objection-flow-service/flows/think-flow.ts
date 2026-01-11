/**
 * Need to Think Objection Flow - ST-015
 * 3-step diagnostic for handling "need to think about it" objections
 */

import { ObjectionFlowDefinition } from './types';

export const thinkFlow: ObjectionFlowDefinition = {
  type: 'Need_to_Think',
  displayName: 'Need to Think Objection',
  description: 'Handle requests to "think about it" or "sleep on it"',
  steps: [
    {
      stepNumber: 1,
      question: 'What specifically do you want to think through?',
      purpose: 'Surface the actual variable',
      inputType: 'text',
      placeholder: 'What specific aspect do they need to consider?',
    },
    {
      stepNumber: 2,
      question:
        'Is it the price, the risk, trust in the approach, need to consult someone, or something about yourself?',
      purpose: 'Isolate the variable',
      inputType: 'select',
      options: [
        'The price/investment',
        'Risk/uncertainty',
        'Trust in the approach',
        'Need to consult partner/team',
        'Self-doubt/personal readiness',
        'Something else (specify in notes)',
      ],
    },
    {
      stepNumber: 3,
      question: 'If we could resolve [that variable] right now, would you be ready to make a decision?',
      purpose: 'Containment check',
      inputType: 'select',
      options: [
        'Yes - ready to decide if resolved',
        'Probably - would significantly help',
        'Not sure - might surface more concerns',
        'No - there are multiple factors',
      ],
    },
  ],
  allowedOutcomes: ['Resolved', 'Deferred', 'Disqualified'],
};
