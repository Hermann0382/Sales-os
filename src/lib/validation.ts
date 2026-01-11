/**
 * Shared Zod validation schemas for API routes
 * Provides type-safe validation for IDs, common inputs, and request bodies
 */

import { z } from 'zod';

/**
 * CUID validation - Prisma's default ID format
 * CUIDs are ~25 characters, lowercase alphanumeric
 */
export const cuidSchema = z.string().cuid();

/**
 * UUID validation for optional UUID-style IDs
 */
export const uuidSchema = z.string().uuid();

/**
 * Generic ID schema that accepts either CUID or UUID
 * Useful when you need to accept multiple ID formats
 */
export const idSchema = z.string().min(1).max(128);

/**
 * Call session ID validation
 */
export const callIdSchema = z.string().cuid('Invalid call ID format');

/**
 * Objection response ID validation
 */
export const objectionResponseIdSchema = z.string().cuid('Invalid objection response ID format');

/**
 * Milestone ID validation
 */
export const milestoneIdSchema = z.string().cuid('Invalid milestone ID format');

/**
 * Objection ID validation
 */
export const objectionIdSchema = z.string().cuid('Invalid objection ID format');

/**
 * Common URL param validation schemas
 */
export const callParamsSchema = z.object({
  callId: callIdSchema,
});

export const objectionResponseParamsSchema = z.object({
  callId: callIdSchema,
  objectionResponseId: objectionResponseIdSchema,
});

export const milestoneParamsSchema = z.object({
  callId: callIdSchema,
  milestoneId: milestoneIdSchema,
});

/**
 * Validate and parse URL params with error handling
 * Returns parsed params or throws formatted error
 */
export function validateParams<T>(
  schema: z.ZodSchema<T>,
  params: unknown
): T {
  const result = schema.safeParse(params);
  if (!result.success) {
    const errorMessages = result.error.errors.map(e => e.message).join(', ');
    throw new Error(`Invalid parameters: ${errorMessages}`);
  }
  return result.data;
}

/**
 * Safe validation that returns null instead of throwing
 */
export function safeValidateParams<T>(
  schema: z.ZodSchema<T>,
  params: unknown
): T | null {
  const result = schema.safeParse(params);
  return result.success ? result.data : null;
}

/**
 * Agent ID array validation
 * Used for filtering by multiple agents in analytics endpoints
 */
export const agentIdsSchema = z
  .array(z.string().cuid('Invalid agent ID format'))
  .max(50, 'Maximum 50 agent IDs allowed')
  .optional();

/**
 * Time range preset validation
 */
export const timeRangePresetSchema = z
  .enum(['week', 'month', 'quarter', 'year'])
  .optional();

/**
 * Pagination validation
 */
export const paginationSchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).default(50),
  offset: z.coerce.number().int().min(0).default(0),
});

/**
 * Analytics query params validation
 */
export const analyticsQuerySchema = z.object({
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
  preset: timeRangePresetSchema,
  agentIds: z.string().transform((val) => val.split(',').filter(Boolean)).optional(),
});

/**
 * Validate agentIds from comma-separated string
 * Returns validated array or null if invalid
 */
export function validateAgentIds(agentIdsString: string | null): string[] | null {
  if (!agentIdsString) return null;

  const ids = agentIdsString.split(',').filter(Boolean);
  if (ids.length === 0) return null;
  if (ids.length > 50) return null;

  // Validate each ID is a CUID format
  const cuidRegex = /^c[a-z0-9]{24,}$/;
  for (const id of ids) {
    if (!cuidRegex.test(id)) {
      return null;
    }
  }

  return ids;
}
