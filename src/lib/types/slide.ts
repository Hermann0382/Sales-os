/**
 * Slide system types
 * ENT-010: SlideTemplate - Individual slide definition
 * ENT-011: SlideDeck - Versioned slide deck
 * ENT-012: SlideInstance - Slide presentation during call
 */

import { BaseEntity } from './common';

// Deck status
export type DeckStatus = 'draft' | 'active' | 'deprecated';

// Slide outcome tag
export type SlideOutcomeTag = 'positive' | 'neutral' | 'negative';

// Parameter slot definition
export interface ParameterSlot {
  id: string;
  name: string;
  type: 'text' | 'number' | 'currency' | 'percentage' | 'date' | 'list';
  source: 'prospect' | 'call' | 'milestone' | 'manual';
  sourceField?: string;
  defaultValue?: string;
  format?: string;
}

// Slide template (ENT-010)
export interface SlideTemplate extends BaseEntity {
  organizationId: string;
  milestoneId: string | null;
  titleStatic: string;
  coreMessageStatic: string | null;
  parameterSlots: ParameterSlot[] | null;
  visualizationTemplate: string | null;
  orderIndex: number;
}

export interface CreateSlideTemplateInput {
  organizationId: string;
  milestoneId?: string;
  titleStatic: string;
  coreMessageStatic?: string;
  parameterSlots?: ParameterSlot[];
  visualizationTemplate?: string;
  orderIndex: number;
}

export interface UpdateSlideTemplateInput {
  milestoneId?: string;
  titleStatic?: string;
  coreMessageStatic?: string;
  parameterSlots?: ParameterSlot[];
  visualizationTemplate?: string;
  orderIndex?: number;
}

// Slide deck (ENT-011)
export interface SlideDeck extends BaseEntity {
  organizationId: string;
  productId: string | null;
  version: string;
  status: DeckStatus;
}

export interface CreateSlideDeckInput {
  organizationId: string;
  productId?: string;
  version: string;
}

export interface UpdateSlideDeckInput {
  version?: string;
  status?: DeckStatus;
}

// Rendered content for a slide instance
export interface RenderedSlideContent {
  title: string;
  coreMessage: string | null;
  parameters: Record<string, string | number>;
  visualizationData?: unknown;
}

// Slide instance (ENT-012)
export interface SlideInstance extends BaseEntity {
  callSessionId: string;
  slideTemplateId: string;
  prospectId: string;
  renderedContent: RenderedSlideContent | null;
  agentNotes: string | null;
  outcomeTag: SlideOutcomeTag | null;
  startedAt: Date | null;
  endedAt: Date | null;
}

export interface CreateSlideInstanceInput {
  callSessionId: string;
  slideTemplateId: string;
  prospectId: string;
  renderedContent?: RenderedSlideContent;
}

export interface UpdateSlideInstanceInput {
  renderedContent?: RenderedSlideContent;
  agentNotes?: string;
  outcomeTag?: SlideOutcomeTag;
  startedAt?: Date;
  endedAt?: Date;
}

// Presentation state for real-time sync
export interface PresentationState {
  isActive: boolean;
  currentSlideIndex: number;
  totalSlides: number;
  currentSlideId: string | null;
  slideHistory: string[]; // slideInstanceIds
}

// Slide sync event for WebSocket
export interface SlideSyncEvent {
  type: 'slide_change' | 'presentation_start' | 'presentation_end';
  callSessionId: string;
  slideInstanceId?: string;
  slideIndex?: number;
  timestamp: number;
}
