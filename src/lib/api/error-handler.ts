/**
 * API Error Handler - Centralizes error response formatting and sanitization
 * Prevents internal implementation details from leaking to clients (SEC-003)
 */

import { NextResponse } from 'next/server';

/**
 * Standard API error response format
 */
export interface ApiErrorResponse {
  error: {
    message: string;
    code: string;
  };
}

/**
 * Error codes for client-facing responses
 */
export const ErrorCodes = {
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  NOT_FOUND: 'NOT_FOUND',
  UNAUTHORIZED: 'UNAUTHORIZED',
  FORBIDDEN: 'FORBIDDEN',
  CONFLICT: 'CONFLICT',
  INTERNAL_ERROR: 'INTERNAL_ERROR',
  BAD_REQUEST: 'BAD_REQUEST',
  SERVICE_UNAVAILABLE: 'SERVICE_UNAVAILABLE',
} as const;

export type ErrorCode = (typeof ErrorCodes)[keyof typeof ErrorCodes];

/**
 * Known error patterns that map to specific HTTP status codes
 */
const ERROR_PATTERNS: Array<{
  pattern: RegExp | string;
  status: number;
  code: ErrorCode;
  sanitizedMessage?: string;
}> = [
  { pattern: /not found/i, status: 404, code: ErrorCodes.NOT_FOUND },
  { pattern: /unauthorized/i, status: 401, code: ErrorCodes.UNAUTHORIZED },
  { pattern: /forbidden/i, status: 403, code: ErrorCodes.FORBIDDEN },
  { pattern: /already exists/i, status: 409, code: ErrorCodes.CONFLICT },
  { pattern: /validation/i, status: 400, code: ErrorCodes.VALIDATION_ERROR },
  { pattern: /invalid/i, status: 400, code: ErrorCodes.BAD_REQUEST },
  { pattern: /required/i, status: 400, code: ErrorCodes.VALIDATION_ERROR },
];

/**
 * Sensitive patterns that should be sanitized from error messages
 */
const SENSITIVE_PATTERNS = [
  /prisma/i,
  /database/i,
  /sql/i,
  /query/i,
  /connection/i,
  /timeout/i,
  /constraint/i,
  /foreign key/i,
  /unique constraint/i,
  /deadlock/i,
  /transaction/i,
  /column/i,
  /table/i,
  /model/i,
  /\.ts:\d+/i, // File paths with line numbers
  /at\s+\w+\s+\(/i, // Stack traces
  /node_modules/i,
];

/**
 * Check if an error message contains sensitive information
 */
function containsSensitiveInfo(message: string): boolean {
  return SENSITIVE_PATTERNS.some((pattern) => pattern.test(message));
}

/**
 * Sanitize error message for client consumption
 * Returns a safe version of the message or a generic fallback
 */
function sanitizeErrorMessage(error: unknown, fallback: string): string {
  if (!(error instanceof Error)) {
    return fallback;
  }

  const message = error.message;

  // If message contains sensitive info, return generic message
  if (containsSensitiveInfo(message)) {
    return fallback;
  }

  // Truncate very long messages
  if (message.length > 200) {
    return message.substring(0, 200) + '...';
  }

  return message;
}

/**
 * Map error to HTTP status code
 */
function getStatusCode(error: unknown): number {
  if (!(error instanceof Error)) {
    return 500;
  }

  for (const { pattern, status } of ERROR_PATTERNS) {
    if (typeof pattern === 'string' && error.message.includes(pattern)) {
      return status;
    }
    if (pattern instanceof RegExp && pattern.test(error.message)) {
      return status;
    }
  }

  return 500;
}

/**
 * Map error to error code
 */
function getErrorCode(error: unknown): ErrorCode {
  if (!(error instanceof Error)) {
    return ErrorCodes.INTERNAL_ERROR;
  }

  for (const { pattern, code } of ERROR_PATTERNS) {
    if (typeof pattern === 'string' && error.message.includes(pattern)) {
      return code;
    }
    if (pattern instanceof RegExp && pattern.test(error.message)) {
      return code;
    }
  }

  return ErrorCodes.INTERNAL_ERROR;
}

/**
 * Main error handler for API routes
 * Logs full error server-side, returns sanitized response to client
 */
export function handleApiError(
  error: unknown,
  context: string,
  options?: {
    fallbackMessage?: string;
    logError?: boolean;
  }
): NextResponse<ApiErrorResponse> {
  const { fallbackMessage = 'An unexpected error occurred', logError = true } = options ?? {};

  // Log full error server-side
  if (logError) {
    console.error(`[${context}]`, error);
  }

  const status = getStatusCode(error);
  const code = getErrorCode(error);

  // For 5xx errors, always use generic message
  const message =
    status >= 500 ? fallbackMessage : sanitizeErrorMessage(error, fallbackMessage);

  return NextResponse.json({ error: { message, code } }, { status });
}

/**
 * Create a standardized error response
 */
export function createErrorResponse(
  message: string,
  code: ErrorCode,
  status: number
): NextResponse<ApiErrorResponse> {
  return NextResponse.json({ error: { message, code } }, { status });
}

/**
 * Common pre-built error responses
 */
export const ErrorResponses = {
  unauthorized: () =>
    createErrorResponse('Unauthorized', ErrorCodes.UNAUTHORIZED, 401),

  notFound: (resource = 'Resource') =>
    createErrorResponse(`${resource} not found`, ErrorCodes.NOT_FOUND, 404),

  forbidden: (message = 'Access denied') =>
    createErrorResponse(message, ErrorCodes.FORBIDDEN, 403),

  badRequest: (message = 'Invalid request') =>
    createErrorResponse(message, ErrorCodes.BAD_REQUEST, 400),

  validationError: (message = 'Validation failed') =>
    createErrorResponse(message, ErrorCodes.VALIDATION_ERROR, 400),

  conflict: (message = 'Resource already exists') =>
    createErrorResponse(message, ErrorCodes.CONFLICT, 409),

  internalError: () =>
    createErrorResponse('An unexpected error occurred', ErrorCodes.INTERNAL_ERROR, 500),

  serviceUnavailable: (message = 'Service temporarily unavailable') =>
    createErrorResponse(message, ErrorCodes.SERVICE_UNAVAILABLE, 503),
};
