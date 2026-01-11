/**
 * Organization domain types
 * ENT-001: Tenant organization for white-label support
 */

import { BaseEntity } from './common';

export interface Organization extends BaseEntity {
  name: string;
}

export interface CreateOrganizationInput {
  name: string;
}

export interface UpdateOrganizationInput {
  name?: string;
}

// Organization context for multi-tenant operations
export interface OrganizationContext {
  organizationId: string;
  organizationName: string;
}
