/**
 * Prospect domain types
 * ENT-003: Potential coaching client (financial advisor)
 */

import { BaseEntity } from './common';

export interface Prospect extends BaseEntity {
  organizationId: string;
  name: string;
  ghlContactId: string | null;
  clientCount: number | null;
  mainPain: string | null;
  revenueVolatility: number | null;
}

export interface CreateProspectInput {
  organizationId: string;
  name: string;
  ghlContactId?: string;
  clientCount?: number;
  mainPain?: string;
  revenueVolatility?: number;
}

export interface UpdateProspectInput {
  name?: string;
  ghlContactId?: string;
  clientCount?: number;
  mainPain?: string;
  revenueVolatility?: number;
}

// Qualification status
export interface ProspectQualification {
  prospectId: string;
  clientCountMet: boolean; // >= 500
  hasFinancialCapacity: boolean;
  hasStrategicAlignment: boolean;
  isQualifiedForCoaching: boolean;
}

export function isQualifiedForCoaching(prospect: Prospect): boolean {
  return (prospect.clientCount ?? 0) >= 500;
}

// Pain point categories
export type PainPointCategory =
  | 'Storno'
  | 'Chaos'
  | 'Instability'
  | 'Revenue_Volatility'
  | 'Client_Churn'
  | 'Operational_Overload';

// Revenue volatility scale (1-5)
export type RevenueVolatilityScore = 1 | 2 | 3 | 4 | 5;
