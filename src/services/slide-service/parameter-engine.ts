/**
 * Parameter Substitution Engine
 *
 * Handles template parameter substitution for slides.
 * Parameters are defined in slide templates using {{parameter.path}} syntax.
 *
 * Example: {{prospect.clientCount}} -> "150"
 *          {{call.painPoints}} -> "Revenue volatility, client retention"
 */

import type { Prospect, CallSession } from '@prisma/client';

// Parameter context for substitution
export interface ParameterContext {
  prospect: ProspectContext;
  call: CallContext;
  agent?: AgentContext;
  custom?: Record<string, unknown>;
}

export interface ProspectContext {
  name: string;
  clientCount: number | null;
  mainPain: string | null;
  revenueVolatility: number | null;
}

export interface CallContext {
  id: string;
  status: string;
  mode: string;
  language: string;
  startedAt: Date | null;
  duration?: number; // in seconds
}

export interface AgentContext {
  name: string;
  email: string;
}

// Rendered slide content structure
export interface RenderedSlideContent {
  title: string;
  coreMessage: string | null;
  visualizationData: unknown | null;
  parameters: Record<string, string>;
  renderedAt: Date;
}

// Parameter slot definition from template
export interface ParameterSlot {
  path: string;           // e.g., "prospect.clientCount"
  label: string;          // e.g., "Client Count"
  defaultValue?: string;  // Fallback if value is null
  format?: 'number' | 'currency' | 'percentage' | 'date' | 'text';
}

/**
 * Build parameter context from database entities
 */
export function buildParameterContext(
  prospect: Prospect,
  callSession: CallSession,
  agent?: { name: string; email: string }
): ParameterContext {
  const duration = callSession.startedAt && callSession.endedAt
    ? Math.round((callSession.endedAt.getTime() - callSession.startedAt.getTime()) / 1000)
    : undefined;

  return {
    prospect: {
      name: prospect.name,
      clientCount: prospect.clientCount,
      mainPain: prospect.mainPain,
      revenueVolatility: prospect.revenueVolatility,
    },
    call: {
      id: callSession.id,
      status: callSession.status,
      mode: callSession.mode,
      language: callSession.language,
      startedAt: callSession.startedAt,
      duration,
    },
    agent: agent ? {
      name: agent.name,
      email: agent.email,
    } : undefined,
  };
}

/**
 * Get a value from the context using a dot-notation path
 * e.g., getValueByPath(context, "prospect.clientCount") -> 150
 */
export function getValueByPath(context: ParameterContext, path: string): unknown {
  const parts = path.split('.');
  let current: unknown = context;

  for (const part of parts) {
    if (current === null || current === undefined) {
      return undefined;
    }
    if (typeof current !== 'object') {
      return undefined;
    }
    current = (current as Record<string, unknown>)[part];
  }

  return current;
}

/**
 * Format a value based on the specified format type
 */
export function formatValue(
  value: unknown,
  format?: ParameterSlot['format'],
  defaultValue = '—'
): string {
  if (value === null || value === undefined) {
    return defaultValue;
  }

  switch (format) {
    case 'number':
      if (typeof value === 'number') {
        return value.toLocaleString();
      }
      return String(value);

    case 'currency':
      if (typeof value === 'number') {
        return new Intl.NumberFormat('en-US', {
          style: 'currency',
          currency: 'USD',
          minimumFractionDigits: 0,
          maximumFractionDigits: 0,
        }).format(value);
      }
      return String(value);

    case 'percentage':
      if (typeof value === 'number') {
        return `${(value * 100).toFixed(1)}%`;
      }
      return String(value);

    case 'date':
      if (value instanceof Date) {
        return value.toLocaleDateString('en-US', {
          year: 'numeric',
          month: 'short',
          day: 'numeric',
        });
      }
      if (typeof value === 'string') {
        return new Date(value).toLocaleDateString('en-US', {
          year: 'numeric',
          month: 'short',
          day: 'numeric',
        });
      }
      return String(value);

    case 'text':
    default:
      return String(value);
  }
}

/**
 * Substitute parameters in a text string
 * Replaces {{parameter.path}} with actual values
 */
export function substituteParameters(
  template: string,
  context: ParameterContext,
  slots?: ParameterSlot[]
): { result: string; parameters: Record<string, string> } {
  const parameters: Record<string, string> = {};

  // Build a map of parameter paths to their slot configurations
  const slotMap = new Map<string, ParameterSlot>();
  if (slots) {
    for (const slot of slots) {
      slotMap.set(slot.path, slot);
    }
  }

  // Find all {{...}} patterns
  const pattern = /\{\{([^}]+)\}\}/g;

  const result = template.replace(pattern, (match, path: string) => {
    const trimmedPath = path.trim();
    const value = getValueByPath(context, trimmedPath);
    const slot = slotMap.get(trimmedPath);

    const formatted = formatValue(
      value,
      slot?.format,
      slot?.defaultValue ?? '—'
    );

    parameters[trimmedPath] = formatted;
    return formatted;
  });

  return { result, parameters };
}

/**
 * Render a slide template with parameter substitution
 */
export function renderSlideContent(
  titleTemplate: string,
  coreMessageTemplate: string | null,
  visualizationTemplate: string | null,
  parameterSlots: ParameterSlot[] | null,
  context: ParameterContext
): RenderedSlideContent {
  const slots = parameterSlots ?? [];

  // Substitute parameters in title
  const { result: title, parameters: titleParams } = substituteParameters(
    titleTemplate,
    context,
    slots
  );

  // Substitute parameters in core message
  let coreMessage: string | null = null;
  let messageParams: Record<string, string> = {};
  if (coreMessageTemplate) {
    const result = substituteParameters(coreMessageTemplate, context, slots);
    coreMessage = result.result;
    messageParams = result.parameters;
  }

  // Parse visualization template if present
  let visualizationData: unknown = null;
  if (visualizationTemplate) {
    try {
      // First substitute parameters in the template
      const { result: renderedViz } = substituteParameters(
        visualizationTemplate,
        context,
        slots
      );
      // Then parse as JSON (visualization configs are stored as JSON strings)
      visualizationData = JSON.parse(renderedViz);
    } catch {
      // If parsing fails, store as raw string
      visualizationData = visualizationTemplate;
    }
  }

  return {
    title,
    coreMessage,
    visualizationData,
    parameters: { ...titleParams, ...messageParams },
    renderedAt: new Date(),
  };
}

/**
 * Extract parameter paths from a template string
 * Useful for validating templates and showing available parameters
 */
export function extractParameterPaths(template: string): string[] {
  const pattern = /\{\{([^}]+)\}\}/g;
  const paths: string[] = [];
  let match;

  while ((match = pattern.exec(template)) !== null) {
    paths.push(match[1].trim());
  }

  return [...new Set(paths)]; // Remove duplicates
}

/**
 * Validate that all required parameters have values in the context
 */
export function validateParameterContext(
  context: ParameterContext,
  requiredPaths: string[]
): { valid: boolean; missing: string[] } {
  const missing: string[] = [];

  for (const path of requiredPaths) {
    const value = getValueByPath(context, path);
    if (value === null || value === undefined) {
      missing.push(path);
    }
  }

  return {
    valid: missing.length === 0,
    missing,
  };
}
