/**
 * GoHighLevel Service - CRM integration for contact sync and calendar
 * Handles prospect data sync and follow-up scheduling
 */

import { CreateProspectInput, Prospect } from '@/lib/types';

// GHL Contact type
interface GHLContact {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  customFields?: Record<string, unknown>;
  tags?: string[];
}

// GHL Calendar event
interface GHLCalendarEvent {
  id: string;
  title: string;
  startTime: Date;
  endTime: Date;
  contactId: string;
  locationId: string;
  calendarId: string;
}

export class GHLService {
  private apiKey: string;
  private baseUrl = 'https://rest.gohighlevel.com/v1';

  constructor() {
    this.apiKey = process.env.GHL_API_KEY || '';
  }

  /**
   * Sync prospect from GHL contact
   */
  async syncProspectFromGHL(
    ghlContactId: string,
    organizationId: string
  ): Promise<CreateProspectInput | null> {
    try {
      const contact = await this.getContact(ghlContactId);
      if (!contact) return null;

      // Map GHL contact to prospect input
      return {
        organizationId,
        name: `${contact.firstName} ${contact.lastName}`.trim(),
        ghlContactId: contact.id,
        clientCount: this.extractClientCount(contact.customFields),
        mainPain: this.extractMainPain(contact.customFields),
        revenueVolatility: this.extractRevenueVolatility(contact.customFields),
      };
    } catch (error) {
      console.error('Failed to sync prospect from GHL:', error);
      return null;
    }
  }

  /**
   * Get GHL contact by ID
   */
  async getContact(contactId: string): Promise<GHLContact | null> {
    try {
      const response = await fetch(`${this.baseUrl}/contacts/${contactId}`, {
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`GHL API error: ${response.status}`);
      }

      const data = await response.json();
      return data.contact;
    } catch (error) {
      console.error('Failed to get GHL contact:', error);
      return null;
    }
  }

  /**
   * Search contacts
   */
  async searchContacts(query: string): Promise<GHLContact[]> {
    try {
      const response = await fetch(
        `${this.baseUrl}/contacts/search?query=${encodeURIComponent(query)}`,
        {
          headers: {
            Authorization: `Bearer ${this.apiKey}`,
            'Content-Type': 'application/json',
          },
        }
      );

      if (!response.ok) {
        throw new Error(`GHL API error: ${response.status}`);
      }

      const data = await response.json();
      return data.contacts || [];
    } catch (error) {
      console.error('Failed to search GHL contacts:', error);
      return [];
    }
  }

  /**
   * Update GHL contact with call outcome
   */
  async updateContactAfterCall(
    ghlContactId: string,
    updates: {
      outcome?: string;
      nextSteps?: string;
      notes?: string;
      tags?: string[];
    }
  ): Promise<boolean> {
    try {
      const customFields: Record<string, unknown> = {};

      if (updates.outcome) {
        customFields.callOutcome = updates.outcome;
      }
      if (updates.nextSteps) {
        customFields.nextSteps = updates.nextSteps;
      }
      if (updates.notes) {
        customFields.callNotes = updates.notes;
      }

      const body: Record<string, unknown> = {};
      if (Object.keys(customFields).length > 0) {
        body.customField = customFields;
      }
      if (updates.tags) {
        body.tags = updates.tags;
      }

      const response = await fetch(`${this.baseUrl}/contacts/${ghlContactId}`, {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
      });

      return response.ok;
    } catch (error) {
      console.error('Failed to update GHL contact:', error);
      return false;
    }
  }

  /**
   * Schedule follow-up in GHL calendar
   */
  async scheduleFollowUp(
    ghlContactId: string,
    followUpData: {
      title: string;
      startTime: Date;
      endTime: Date;
      notes?: string;
      calendarId: string;
      locationId: string;
    }
  ): Promise<GHLCalendarEvent | null> {
    try {
      const response = await fetch(`${this.baseUrl}/appointments/`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contactId: ghlContactId,
          calendarId: followUpData.calendarId,
          locationId: followUpData.locationId,
          title: followUpData.title,
          startTime: followUpData.startTime.toISOString(),
          endTime: followUpData.endTime.toISOString(),
          notes: followUpData.notes,
        }),
      });

      if (!response.ok) {
        throw new Error(`GHL API error: ${response.status}`);
      }

      const data = await response.json();
      return data.appointment;
    } catch (error) {
      console.error('Failed to schedule follow-up in GHL:', error);
      return null;
    }
  }

  /**
   * Get calendars for location
   */
  async getCalendars(locationId: string): Promise<Array<{ id: string; name: string }>> {
    try {
      const response = await fetch(
        `${this.baseUrl}/calendars/?locationId=${locationId}`,
        {
          headers: {
            Authorization: `Bearer ${this.apiKey}`,
            'Content-Type': 'application/json',
          },
        }
      );

      if (!response.ok) {
        throw new Error(`GHL API error: ${response.status}`);
      }

      const data = await response.json();
      return data.calendars || [];
    } catch (error) {
      console.error('Failed to get GHL calendars:', error);
      return [];
    }
  }

  /**
   * Extract client count from custom fields
   */
  private extractClientCount(
    customFields?: Record<string, unknown>
  ): number | undefined {
    if (!customFields) return undefined;

    const clientCount =
      customFields.clientCount ||
      customFields.client_count ||
      customFields.numberOfClients;

    if (typeof clientCount === 'number') return clientCount;
    if (typeof clientCount === 'string') {
      const parsed = parseInt(clientCount, 10);
      return isNaN(parsed) ? undefined : parsed;
    }
    return undefined;
  }

  /**
   * Extract main pain from custom fields
   */
  private extractMainPain(
    customFields?: Record<string, unknown>
  ): string | undefined {
    if (!customFields) return undefined;

    const mainPain =
      customFields.mainPain ||
      customFields.main_pain ||
      customFields.painPoint;

    return typeof mainPain === 'string' ? mainPain : undefined;
  }

  /**
   * Extract revenue volatility from custom fields
   */
  private extractRevenueVolatility(
    customFields?: Record<string, unknown>
  ): number | undefined {
    if (!customFields) return undefined;

    const volatility =
      customFields.revenueVolatility ||
      customFields.revenue_volatility ||
      customFields.volatilityScore;

    if (typeof volatility === 'number') {
      return Math.min(5, Math.max(1, volatility));
    }
    if (typeof volatility === 'string') {
      const parsed = parseInt(volatility, 10);
      return isNaN(parsed) ? undefined : Math.min(5, Math.max(1, parsed));
    }
    return undefined;
  }
}

export const ghlService = new GHLService();
