/**
 * Skepticism Objection Flow - ST-017
 * 3-step diagnostic for handling skepticism/doubt objections
 */

import { ObjectionFlowDefinition } from './types';

export const skepticismFlow: ObjectionFlowDefinition = {
  type: 'Skepticism',
  displayName: 'Skepticism Objection',
  description: "Handle doubt about whether the approach will work based on past experiences",
  steps: [
    {
      stepNumber: 1,
      question: "What have you tried before that didn't work?",
      purpose: 'Validate past experience',
      inputType: 'text',
      placeholder: 'What previous solutions/approaches have failed?',
    },
    {
      stepNumber: 2,
      question: "When it didn't work, was the problem the strategy itself or the execution?",
      purpose: 'Pattern recognition',
      inputType: 'select',
      options: [
        'Strategy was flawed',
        'Execution was the issue',
        'Both strategy and execution',
        'External factors beyond control',
        'Not sure - unclear why it failed',
      ],
    },
    {
      stepNumber: 3,
      question:
        'The structural difference with our approach is [X]. Does that distinction make sense?',
      purpose: 'Articulate difference',
      inputType: 'select',
      options: [
        'Yes - clear differentiation',
        'Partially - need more details',
        'Not really - sounds similar',
        "Skeptical - I've heard this before",
      ],
    },
  ],
  allowedOutcomes: ['Resolved', 'Deferred', 'Disqualified'],
};
