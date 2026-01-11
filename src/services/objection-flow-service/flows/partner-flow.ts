/**
 * Partner/Team Objection Flow - ST-016
 * 3-step diagnostic for handling partner/team decision objections
 */

import { ObjectionFlowDefinition } from './types';

export const partnerFlow: ObjectionFlowDefinition = {
  type: 'Partner_Team',
  displayName: 'Partner/Team Objection',
  description: 'Handle concerns about needing approval from partners or team members',
  steps: [
    {
      stepNumber: 1,
      question:
        'Is this something you can decide on your own, or do you need permission from someone else?',
      purpose: 'Clarify authority',
      inputType: 'select',
      options: [
        'Can decide alone - just want input',
        'Need partner approval',
        'Need business partner approval',
        'Need team/board approval',
        'Joint decision required',
      ],
    },
    {
      stepNumber: 2,
      question: "What concerns do you anticipate they'll have, and how would you address them?",
      purpose: 'Pre-solve anticipated objections',
      inputType: 'text',
      placeholder: 'What objections do they expect from the other party?',
    },
    {
      stepNumber: 3,
      question: 'Would it help if I gave you a summary you could share with them?',
      purpose: 'Equip them to sell internally',
      inputType: 'select',
      options: [
        'Yes - would be very helpful',
        'Maybe - depends on format',
        'No - I prefer to explain myself',
        'They need to be on the call directly',
      ],
    },
  ],
  allowedOutcomes: ['Resolved', 'Deferred', 'Disqualified'],
};
