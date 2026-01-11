/**
 * Price Objection Flow - ST-012
 * 4-step diagnostic for handling price objections
 */

import { ObjectionFlowDefinition } from './types';

export const priceFlow: ObjectionFlowDefinition = {
  type: 'Price',
  displayName: 'Price Objection',
  description: 'Handle concerns about cost, investment, or value',
  steps: [
    {
      stepNumber: 1,
      question: 'Compared to what?',
      purpose: 'Neutralize emotion, identify comparison anchor',
      inputType: 'text',
      placeholder: 'What are they comparing the price to?',
    },
    {
      stepNumber: 2,
      question: 'Classify the comparison (software costs, coaching prices, current income, fear)',
      purpose: 'Identify objection subtype',
      inputType: 'select',
      options: [
        'Software costs',
        'Coaching/consulting prices',
        'Current income/budget',
        'General fear/risk aversion',
        'Other (specify in notes)',
      ],
    },
    {
      stepNumber: 3,
      question: 'If this system reliably paid for itself within 6 months, would it still feel expensive?',
      purpose: 'Structural check - value mismatch vs risk perception',
      inputType: 'select',
      options: ['Yes - still feels expensive', 'No - that would work', 'Uncertain'],
    },
    {
      stepNumber: 4,
      question:
        'The reason we only work with advisors with 500+ clients is because below that number, the math breaks.',
      purpose: 'Reality anchor - only if aligned',
      inputType: 'statement',
      isStatement: true,
    },
  ],
  allowedOutcomes: ['Resolved', 'Deferred', 'Disqualified'],
};
