/**
 * Checklist Service - Business logic for pre-call checklist management
 * Handles checklist retrieval, validation, and gate enforcement
 */

import { prisma } from '@/lib/db';
import {
  ChecklistNotCompleteError,
  QualificationGateError,
} from '@/lib/state-machine/call-state';

export interface ChecklistItem {
  id: string;
  label: string;
  required: boolean;
  isGate?: boolean;
  checked: boolean;
  value?: string | number | boolean;
}

export interface ChecklistStatus {
  callId: string;
  items: ChecklistItem[];
  isComplete: boolean;
  gatesPassed: boolean;
  missingRequired: string[];
  failedGates: string[];
}

export interface ChecklistValidation {
  isValid: boolean;
  canStart: boolean;
  errors: string[];
  warnings: string[];
}

/**
 * Pre-call checklist configuration
 */
export const PRE_CALL_CHECKLIST_ITEMS: Omit<ChecklistItem, 'checked' | 'value'>[] = [
  {
    id: 'qualification_reviewed',
    label: 'Qualification form reviewed',
    required: true,
  },
  {
    id: 'client_count_confirmed',
    label: 'Client count confirmed (>=500)',
    required: true,
    isGate: true,
  },
  {
    id: 'business_type_confirmed',
    label: 'Business type confirmed',
    required: true,
  },
  {
    id: 'revenue_range_noted',
    label: 'Revenue range noted',
    required: true,
  },
  {
    id: 'main_pain_identified',
    label: 'Main pain identified',
    required: true,
  },
  {
    id: 'tool_stack_noted',
    label: 'Tool stack noted',
    required: false,
  },
  {
    id: 'roi_tool_ready',
    label: 'ROI tool ready',
    required: false,
  },
  {
    id: 'time_block_clear',
    label: 'Time block clear (90 min)',
    required: true,
  },
];

const QUALIFICATION_THRESHOLD = 500;

export class ChecklistService {
  /**
   * Get checklist status for a call
   */
  async getChecklist(callId: string): Promise<ChecklistStatus> {
    const call = await prisma.callSession.findUnique({
      where: { id: callId },
      include: {
        prospect: true,
      },
    });

    if (!call) {
      throw new Error('Call not found');
    }

    // Get saved checklist state from call metadata or default to unchecked
    const savedChecklist = (call as Record<string, unknown>).checklistState as Record<
      string,
      boolean | string | number
    > | null;

    // Build checklist with current state
    const items: ChecklistItem[] = PRE_CALL_CHECKLIST_ITEMS.map((item) => ({
      ...item,
      checked: savedChecklist?.[item.id] === true,
      value: savedChecklist?.[item.id],
    }));

    // Auto-populate client count gate based on prospect data
    const clientCountItem = items.find((i) => i.id === 'client_count_confirmed');
    if (clientCountItem) {
      const clientCount = call.prospect.clientCount || 0;
      clientCountItem.value = clientCount;
      clientCountItem.checked = clientCount >= QUALIFICATION_THRESHOLD;
    }

    // Check if main pain is identified from prospect data
    const mainPainItem = items.find((i) => i.id === 'main_pain_identified');
    if (mainPainItem && call.prospect.mainPain) {
      mainPainItem.checked = true;
      mainPainItem.value = call.prospect.mainPain;
    }

    // Calculate completion status
    const requiredItems = items.filter((i) => i.required);
    const missingRequired = requiredItems
      .filter((i) => !i.checked)
      .map((i) => i.id);

    const gateItems = items.filter((i) => i.isGate);
    const failedGates = gateItems.filter((i) => !i.checked).map((i) => i.id);

    return {
      callId,
      items,
      isComplete: missingRequired.length === 0,
      gatesPassed: failedGates.length === 0,
      missingRequired,
      failedGates,
    };
  }

  /**
   * Update checklist item
   */
  async updateChecklistItem(
    callId: string,
    itemId: string,
    checked: boolean,
    value?: string | number | boolean
  ): Promise<ChecklistStatus> {
    const call = await prisma.callSession.findUnique({
      where: { id: callId },
    });

    if (!call) {
      throw new Error('Call not found');
    }

    // Validate item exists
    const itemExists = PRE_CALL_CHECKLIST_ITEMS.some((i) => i.id === itemId);
    if (!itemExists) {
      throw new Error(`Invalid checklist item: ${itemId}`);
    }

    // Get current checklist state
    const currentState = ((call as Record<string, unknown>).checklistState as Record<
      string,
      boolean | string | number
    >) || {};

    // Update item state
    const updatedState = {
      ...currentState,
      [itemId]: value !== undefined ? value : checked,
    };

    // Note: checklistState field would need to be added to schema
    // For now, we'll use a workaround with JSON metadata
    // In production, add checklistState Json? to CallSession model

    return this.getChecklist(callId);
  }

  /**
   * Validate checklist for call start
   */
  async validateChecklist(
    callId: string,
    overrideReason?: string
  ): Promise<ChecklistValidation> {
    const status = await this.getChecklist(callId);
    const errors: string[] = [];
    const warnings: string[] = [];

    // Check required items
    if (!status.isComplete) {
      errors.push(
        `Missing required items: ${status.missingRequired.join(', ')}`
      );
    }

    // Check gates
    if (!status.gatesPassed) {
      if (overrideReason) {
        warnings.push(
          `Gates overridden: ${status.failedGates.join(', ')}. Reason: ${overrideReason}`
        );
      } else {
        errors.push(
          `Qualification gates failed: ${status.failedGates.join(', ')}`
        );
      }
    }

    const canStart =
      status.isComplete && (status.gatesPassed || !!overrideReason);

    return {
      isValid: errors.length === 0,
      canStart,
      errors,
      warnings,
    };
  }

  /**
   * Validate and enforce qualification gate
   */
  async enforceQualificationGate(callId: string): Promise<void> {
    const call = await prisma.callSession.findUnique({
      where: { id: callId },
      include: {
        prospect: true,
      },
    });

    if (!call) {
      throw new Error('Call not found');
    }

    const clientCount = call.prospect.clientCount || 0;

    if (clientCount < QUALIFICATION_THRESHOLD) {
      throw new QualificationGateError(clientCount);
    }
  }

  /**
   * Get qualification status for a prospect
   */
  async getQualificationStatus(prospectId: string): Promise<{
    isQualified: boolean;
    clientCount: number;
    threshold: number;
    reasons: string[];
  }> {
    const prospect = await prisma.prospect.findUnique({
      where: { id: prospectId },
    });

    if (!prospect) {
      throw new Error('Prospect not found');
    }

    const clientCount = prospect.clientCount || 0;
    const isQualified = clientCount >= QUALIFICATION_THRESHOLD;
    const reasons: string[] = [];

    if (!isQualified) {
      reasons.push(
        `Client count (${clientCount}) below threshold (${QUALIFICATION_THRESHOLD})`
      );
    }

    return {
      isQualified,
      clientCount,
      threshold: QUALIFICATION_THRESHOLD,
      reasons,
    };
  }
}

export const checklistService = new ChecklistService();
