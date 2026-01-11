/**
 * Common type definitions shared across the CallOS application
 */

// Base entity with common fields
export interface BaseEntity {
  id: string;
  createdAt: Date;
}

// Timestamps mixin
export interface Timestamps {
  createdAt: Date;
  updatedAt?: Date;
}

// Pagination types
export interface PaginationParams {
  page: number;
  limit: number;
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasMore: boolean;
  };
}

// API Response types
export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: ApiError;
}

export interface ApiError {
  code: string;
  message: string;
  details?: Record<string, unknown>;
}

// Language support
export type Language = 'EN' | 'DE';

// Role-based access
export type UserRole = 'agent' | 'manager' | 'admin';

// Generic loading states
export type LoadingState = 'idle' | 'loading' | 'success' | 'error';

// Form state helper
export interface FormState<T> {
  data: T;
  errors: Partial<Record<keyof T, string>>;
  isSubmitting: boolean;
  isDirty: boolean;
}

// Date range for analytics
export interface DateRange {
  start: Date;
  end: Date;
}

// Sort direction
export type SortDirection = 'asc' | 'desc';

// Generic filter type
export interface FilterConfig<T extends string = string> {
  field: T;
  operator: 'eq' | 'ne' | 'gt' | 'gte' | 'lt' | 'lte' | 'contains' | 'in';
  value: unknown;
}

// WebSocket event types
export interface WebSocketEvent<T = unknown> {
  type: string;
  payload: T;
  timestamp: number;
}
