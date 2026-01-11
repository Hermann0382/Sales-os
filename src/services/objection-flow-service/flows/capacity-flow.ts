/**
 * Capacity/Time Objection Flow - ST-014
 * 3-step diagnostic for handling capacity/time objections
 */

import { ObjectionFlowDefinition } from './types';

export const capacityFlow: ObjectionFlowDefinition = {
  type: 'Capacity_Time',
  displayName: 'Capacity/Time Objection',
  description: 'Handle concerns about having enough time or bandwidth',
  steps: [
    {
      stepNumber: 1,
      question:
        "When you say you don't have time, is it because you're overloaded with manual work, or because you don't want another project to manage?",
      purpose: 'Distinguish burnout from project resistance',
      inputType: 'select',
      options: [
        'Overloaded with manual work',
        "Don't want another project",
        'Both - burnout AND project resistance',
        'Other reason (specify in notes)',
      ],
    },
    {
      stepNumber: 2,
      question:
        "What's the core fear here - that this will add to your plate, or that it won't actually reduce your current load?",
      purpose: 'Identify core fear',
      inputType: 'select',
      options: [
        'Fear of adding more work',
        "Fear it won't reduce current load",
        'Both fears present',
        'Different fear (specify in notes)',
      ],
    },
    {
      stepNumber: 3,
      question: 'If your current trajectory continues unchanged for another year, what happens?',
      purpose: 'Reality check on status quo',
      inputType: 'text',
      placeholder: "What do they acknowledge about staying on current path?",
    },
  ],
  allowedOutcomes: ['Resolved', 'Deferred', 'Disqualified'],
};
