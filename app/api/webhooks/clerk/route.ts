/**
 * Clerk Webhook Handler
 * Syncs Clerk users and organizations with our database
 */

import { headers } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';
import { Webhook } from 'svix';

import { prisma } from '@/lib/db';

const webhookSecret = process.env.CLERK_WEBHOOK_SECRET;

interface ClerkWebhookEvent {
  type: string;
  data: {
    id: string;
    email_addresses?: Array<{
      email_address: string;
      id: string;
      verification: { status: string };
    }>;
    first_name?: string;
    last_name?: string;
    image_url?: string;
    created_at?: number;
    updated_at?: number;
    organization_memberships?: Array<{
      organization: {
        id: string;
        name: string;
      };
      role: string;
    }>;
  };
}

/**
 * POST /api/webhooks/clerk
 * Handle Clerk webhook events
 */
export async function POST(request: NextRequest) {
  if (!webhookSecret) {
    console.error('CLERK_WEBHOOK_SECRET is not set');
    return NextResponse.json(
      { error: { message: 'Webhook secret not configured', code: 'CONFIG_ERROR' } },
      { status: 500 }
    );
  }

  try {
    const headerPayload = await headers();
    const svixId = headerPayload.get('svix-id');
    const svixTimestamp = headerPayload.get('svix-timestamp');
    const svixSignature = headerPayload.get('svix-signature');

    if (!svixId || !svixTimestamp || !svixSignature) {
      return NextResponse.json(
        { error: { message: 'Missing svix headers', code: 'VALIDATION_ERROR' } },
        { status: 400 }
      );
    }

    const payload = await request.text();
    const wh = new Webhook(webhookSecret);

    let event: ClerkWebhookEvent;
    try {
      event = wh.verify(payload, {
        'svix-id': svixId,
        'svix-timestamp': svixTimestamp,
        'svix-signature': svixSignature,
      }) as ClerkWebhookEvent;
    } catch (err) {
      console.error('Error verifying webhook:', err);
      return NextResponse.json(
        { error: { message: 'Invalid webhook signature', code: 'AUTH_ERROR' } },
        { status: 400 }
      );
    }

    const { type, data } = event;

    switch (type) {
      case 'user.created':
        await handleUserCreated(data);
        break;
      case 'user.updated':
        await handleUserUpdated(data);
        break;
      case 'user.deleted':
        await handleUserDeleted(data);
        break;
      case 'organizationMembership.created':
        await handleOrgMembershipCreated(data);
        break;
      case 'organizationMembership.deleted':
        await handleOrgMembershipDeleted(data);
        break;
      default:
        console.log(`Unhandled webhook type: ${type}`);
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error processing webhook:', error);
    return NextResponse.json(
      { error: { message: 'Failed to process webhook', code: 'WEBHOOK_ERROR' } },
      { status: 500 }
    );
  }
}

/**
 * Handle user.created event
 */
async function handleUserCreated(data: ClerkWebhookEvent['data']) {
  const email = data.email_addresses?.[0]?.email_address;
  if (!email) {
    console.error('No email found for user:', data.id);
    return;
  }

  // Get or create default organization
  let organization = await prisma.organization.findFirst({
    where: { id: 'org_default' },
  });

  if (!organization) {
    organization = await prisma.organization.create({
      data: {
        id: 'org_default',
        name: 'Default Organization',
      },
    });
  }

  // Construct name from first and last
  const name = [data.first_name, data.last_name].filter(Boolean).join(' ') || null;

  await prisma.user.upsert({
    where: { clerkId: data.id },
    create: {
      clerkId: data.id,
      email,
      name,
      organizationId: organization.id,
      role: 'agent',
    },
    update: {
      email,
      name,
    },
  });
}

/**
 * Handle user.updated event
 */
async function handleUserUpdated(data: ClerkWebhookEvent['data']) {
  const email = data.email_addresses?.[0]?.email_address;
  if (!email) return;

  const name = [data.first_name, data.last_name].filter(Boolean).join(' ') || null;

  await prisma.user.update({
    where: { clerkId: data.id },
    data: {
      email,
      name,
    },
  });
}

/**
 * Handle user.deleted event
 * Note: In our schema we don't have an isActive flag, so we'll just log the deletion
 * In production, you might want to add soft delete or archive the user
 */
async function handleUserDeleted(data: ClerkWebhookEvent['data']) {
  console.log(`User deleted in Clerk: ${data.id}`);
  // Note: We don't delete users to preserve audit trail
  // Consider adding a soft delete field in the schema if needed
}

/**
 * Handle organizationMembership.created event
 */
async function handleOrgMembershipCreated(data: ClerkWebhookEvent['data']) {
  const orgMembership = data.organization_memberships?.[0];
  if (!orgMembership) return;

  // Find or create the organization
  let organization = await prisma.organization.findUnique({
    where: { id: orgMembership.organization.id },
  });

  if (!organization) {
    organization = await prisma.organization.create({
      data: {
        id: orgMembership.organization.id,
        name: orgMembership.organization.name,
      },
    });
  }

  // Update user's organization and role
  await prisma.user.update({
    where: { clerkId: data.id },
    data: {
      organizationId: organization.id,
      role: mapClerkRoleToUserRole(orgMembership.role),
    },
  });
}

/**
 * Handle organizationMembership.deleted event
 */
async function handleOrgMembershipDeleted(data: ClerkWebhookEvent['data']) {
  // Get default organization
  const defaultOrg = await prisma.organization.findUnique({
    where: { id: 'org_default' },
  });

  if (defaultOrg) {
    await prisma.user.update({
      where: { clerkId: data.id },
      data: {
        organizationId: defaultOrg.id,
        role: 'agent',
      },
    });
  }
}

/**
 * Map Clerk role to our UserRole enum
 */
function mapClerkRoleToUserRole(clerkRole: string): 'admin' | 'manager' | 'agent' {
  switch (clerkRole.toLowerCase()) {
    case 'admin':
      return 'admin';
    case 'manager':
      return 'manager';
    default:
      return 'agent';
  }
}
