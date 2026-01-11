/**
 * Database Seed Script
 * Seeds the database with initial data for CallOS
 *
 * Run with: npm run db:seed
 */

import 'dotenv/config';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient({
  log: ['error', 'warn'],
});

async function main() {
  console.log('🌱 Starting database seed...');

  // Create default organization
  const organization = await prisma.organization.upsert({
    where: { id: 'org_default' },
    update: {},
    create: {
      id: 'org_default',
      name: 'RichtungsWechsel',
    },
  });
  console.log('✓ Organization created:', organization.name);

  // Seed 7 Milestones
  const milestones = [
    {
      milestoneNumber: 1,
      title: 'M1 Context & Frame',
      objective:
        'Establish shared understanding of the call purpose and expected outcomes. Set the frame that this is a diagnostic evaluation, not a sales pitch.',
      estimatedDurationMinutes: 5,
      orderIndex: 1,
      requiredQuestions: JSON.stringify([
        'Thank them for €495 payment (anchors seriousness)',
        'Clarify agenda structure (diagnosis → projection → decision)',
        'State the 3 possible outcomes clearly',
        'Say "this may end with us not working together"',
      ]),
      confirmations: JSON.stringify([
        'Prospect understands this is not a pitch call',
        'Prospect relaxes and feels evaluation is mutual',
      ]),
    },
    {
      milestoneNumber: 2,
      title: 'M2 Current State Mapping',
      objective:
        "Map prospect's operational reality - how clients are managed, where data lives, how decisions are made, and what breaks under stress.",
      estimatedDurationMinutes: 20,
      orderIndex: 2,
      requiredQuestions: JSON.stringify([
        'How clients enter system',
        'How they are qualified',
        'Where client data lives',
        'How follow-ups happen',
        'Which revenue is Storno-exposed',
        'Historical Storno experiences',
        'How predictable their income feels',
      ]),
      confirmations: JSON.stringify([
        'Can verbally summarize their system back to them',
        'Prospect agrees with summary',
        'Weak points visible without judgment',
      ]),
    },
    {
      milestoneNumber: 3,
      title: 'M3 Qualification Hard Gate',
      objective:
        'Decide whether continuation is allowed based on client count and implementation willingness.',
      estimatedDurationMinutes: 5,
      orderIndex: 3,
      requiredQuestions: JSON.stringify([
        'Confirm ≥500 clients again',
        'Confirm willingness to change systems',
        'Confirm time capacity for implementation',
        'Confirm they are not looking for "leads"',
      ]),
      confirmations: JSON.stringify([
        'QUALIFIED: ≥500 clients + willing to change + capacity',
        'NOT QUALIFIED: advisory call only, no selling',
      ]),
    },
    {
      milestoneNumber: 4,
      title: 'M4 ROI & Projection',
      objective: 'Move from feelings to numbers using the ROI tool with conservative assumptions.',
      estimatedDurationMinutes: 15,
      orderIndex: 4,
      requiredQuestions: JSON.stringify([
        'Open ROI tool',
        'Use conservative assumptions only',
        'Let prospect correct numbers downward if needed',
        'Show concept consultation revenue',
        'Show membership recurring revenue',
        'Show income stabilization effect',
        'Show 3-6 month amortization logic',
      ]),
      confirmations: JSON.stringify([
        'Prospect agrees math is reasonable',
        'Prospect sees €20k/year as conservative, not aggressive',
      ]),
    },
    {
      milestoneNumber: 5,
      title: 'M5 The Switch - Manual vs Systemized',
      objective: 'Reveal the hidden cost of implementation - manual labor creates a second job.',
      estimatedDurationMinutes: 15,
      orderIndex: 5,
      requiredQuestions: JSON.stringify([
        'Time required to implement manually',
        'Management overhead',
        'Error probability',
        'Burnout risk',
        '"Second job" effect',
        'CRM as backbone',
        'Guided pipelines',
        'Automated communication',
        'One system vs tool chaos',
        'Reduced cognitive load',
      ]),
      confirmations: JSON.stringify([
        'Key framing delivered: "Strategy is not the problem — execution load is"',
        'Prospect verbally acknowledges manual implementation risk',
      ]),
    },
    {
      milestoneNumber: 6,
      title: 'M6 Offer Presentation',
      objective: 'Present infrastructure investment rationally - 12-month infrastructure install, not coaching.',
      estimatedDurationMinutes: 10,
      orderIndex: 6,
      requiredQuestions: JSON.stringify([
        'Frame as 12-month infrastructure install',
        'Re-anchor ROI numbers',
        'State total investment clearly',
        'Explain upfront vs monthly',
        'Do NOT justify emotionally',
        'Say price once, then stop talking',
      ]),
      confirmations: JSON.stringify([
        'Implementation willingness confirmed BEFORE price',
        'Price presented without emotional justification',
        'Silence allowed after price statement',
      ]),
    },
    {
      milestoneNumber: 7,
      title: 'M7 Decision Point',
      objective: 'Request explicit decision with forced choice - clean decision, no pressure.',
      estimatedDurationMinutes: 5,
      orderIndex: 7,
      requiredQuestions: JSON.stringify([
        'Allow silence',
        'Answer clarification questions only',
        'Do NOT argue objections',
        'Ask: "Does this make sense for you?"',
      ]),
      confirmations: JSON.stringify([
        'YES: enrollment process',
        'NO: respectful exit',
        'MAYBE: schedule follow-up only if justified',
      ]),
    },
  ];

  for (const milestone of milestones) {
    await prisma.milestone.upsert({
      where: {
        id: `milestone_${milestone.milestoneNumber}`,
      },
      update: milestone,
      create: {
        id: `milestone_${milestone.milestoneNumber}`,
        organizationId: organization.id,
        ...milestone,
      },
    });
  }
  console.log('✓ 7 Milestones created');

  // Seed 6 Objection Types
  const objections = [
    {
      objectionType: 'Price' as const,
      diagnosticQuestions: JSON.stringify([
        { step: 1, question: 'Compared to what?', purpose: 'Neutralize emotion, identify comparison anchor' },
        {
          step: 2,
          question: 'Classify the comparison (software costs, coaching prices, current income, fear)',
          purpose: 'Identify objection subtype',
        },
        {
          step: 3,
          question: 'If this system reliably paid for itself within 6 months, would it still feel expensive?',
          purpose: 'Structural check - value mismatch vs risk perception',
        },
        {
          step: 4,
          question:
            'The reason we only work with advisors with 500+ clients is because below that number, the math breaks.',
          purpose: 'Reality anchor - only if aligned',
        },
      ]),
      allowedOutcomes: JSON.stringify(['Resolved', 'Deferred', 'Disqualified']),
    },
    {
      objectionType: 'Timing' as const,
      diagnosticQuestions: JSON.stringify([
        {
          step: 1,
          question: 'What specifically would need to change for this to become the right time?',
          purpose: 'Remove vagueness',
        },
        {
          step: 2,
          question: 'Identify type: Cash event, Capacity, Emotional hesitation, Non-answer/avoidance',
          purpose: 'Classify timing objection',
        },
        {
          step: 3,
          question: 'If nothing changes in the next 6 months, what does your situation look like?',
          purpose: 'Let them say the cost of waiting',
        },
        {
          step: 4,
          question: 'Would delaying this improve your position — or just delay the same decision?',
          purpose: 'Structural gate',
        },
      ]),
      allowedOutcomes: JSON.stringify(['Resolved', 'Deferred', 'Disqualified']),
    },
    {
      objectionType: 'Capacity_Time' as const,
      diagnosticQuestions: JSON.stringify([
        {
          step: 1,
          question:
            "Is that because you're doing too much manually — or because you don't want to add another project?",
          purpose: 'Reframe without arguing',
        },
        {
          step: 2,
          question: 'Identify core fear: Burnout, Loss of control, Past failed implementations',
          purpose: 'Surface underlying concern',
        },
        {
          step: 3,
          question:
            'If your current workload stays exactly the same for the next 12 months, are you okay with the results it will produce?',
          purpose: 'Reality question',
        },
        {
          step: 4,
          question:
            "This only works if the system removes work after the setup phase. If that's not true for you, we shouldn't do this.",
          purpose: 'Alignment check',
        },
      ]),
      allowedOutcomes: JSON.stringify(['Resolved', 'Deferred', 'Disqualified']),
    },
    {
      objectionType: 'Need_to_Think' as const,
      diagnosticQuestions: JSON.stringify([
        { step: 1, question: 'Sure. What specifically do you want to think through?', purpose: 'Clarify thinking' },
        {
          step: 2,
          question: 'Isolate variable: Price, Risk, Trust, Partner approval, Self-doubt',
          purpose: 'Identify specific concern',
        },
        {
          step: 3,
          question: "Would it be fair to say that if [variable] were resolved, you'd be ready to decide?",
          purpose: 'Containment',
        },
        {
          step: 4,
          question: "I don't want you thinking about everything. I want you thinking about the right thing.",
          purpose: 'Decision integrity',
        },
      ]),
      allowedOutcomes: JSON.stringify(['Resolved', 'Deferred', 'Disqualified']),
    },
    {
      objectionType: 'Partner_Team' as const,
      diagnosticQuestions: JSON.stringify([
        {
          step: 1,
          question: 'Is this a decision you can make — or one you need permission for?',
          purpose: 'Clarify authority',
        },
        { step: 2, question: 'What do you think their main concern will be?', purpose: 'Pre-solve misalignment' },
        {
          step: 3,
          question: 'If you explain it to them, what would you say the goal of this system is?',
          purpose: 'Equip, not push (correct only if factually wrong)',
        },
        {
          step: 4,
          question: 'If they\'re aligned after that conversation, are you comfortable moving forward?',
          purpose: 'Conditional close',
        },
      ]),
      allowedOutcomes: JSON.stringify(['Resolved', 'Deferred', 'Disqualified']),
    },
    {
      objectionType: 'Skepticism' as const,
      diagnosticQuestions: JSON.stringify([
        {
          step: 1,
          question: "That makes sense. What specifically didn't work?",
          purpose: 'Validate experience, not emotion',
        },
        { step: 2, question: 'Was the issue the strategy — or the lack of execution structure?', purpose: 'Pattern recognition' },
        {
          step: 3,
          question:
            "This isn't a tactic. It's an operating system. If that distinction doesn't matter to you, we should stop here.",
          purpose: 'Structural difference',
        },
      ]),
      allowedOutcomes: JSON.stringify(['Resolved', 'Disqualified']),
    },
  ];

  for (const objection of objections) {
    await prisma.objection.upsert({
      where: {
        id: `objection_${objection.objectionType}`,
      },
      update: objection,
      create: {
        id: `objection_${objection.objectionType}`,
        organizationId: organization.id,
        ...objection,
      },
    });
  }
  console.log('✓ 6 Objection types created');

  console.log('✅ Database seed completed successfully!');
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
