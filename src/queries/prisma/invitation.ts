import type { Prisma } from '@/generated/prisma/client';
import { uuid } from '@/lib/crypto';
import prisma from '@/lib/prisma';

export interface CreateInvitationData {
  email: string;
  role: string;
  tokenHash: string;
  invitedBy: string;
  expiresAt: Date;
  teamId?: string | null;
  teamRole?: string | null;
}

export async function createInvitation(data: CreateInvitationData) {
  return prisma.client.invitation.create({
    data: {
      id: uuid(),
      email: data.email,
      role: data.role,
      tokenHash: data.tokenHash,
      invitedBy: data.invitedBy,
      expiresAt: data.expiresAt,
      teamId: data.teamId ?? null,
      teamRole: data.teamRole ?? null,
    },
  });
}

export async function getInvitation(id: string) {
  return prisma.client.invitation.findUnique({
    where: { id },
  });
}

export async function getInvitationByTokenHash(tokenHash: string) {
  return prisma.client.invitation.findUnique({
    where: { tokenHash },
  });
}

// Pending = not yet accepted and not expired. Used to block duplicate invites.
export async function getPendingInvitationByEmail(email: string, now: Date = new Date()) {
  return prisma.client.invitation.findFirst({
    where: {
      email,
      acceptedAt: null,
      expiresAt: { gt: now },
    },
  });
}

export async function listPendingInvitations(now: Date = new Date()) {
  return prisma.client.invitation.findMany({
    where: {
      acceptedAt: null,
      expiresAt: { gt: now },
    },
    select: {
      id: true,
      email: true,
      role: true,
      teamId: true,
      teamRole: true,
      expiresAt: true,
      createdAt: true,
      team: { select: { name: true } },
    },
    orderBy: { createdAt: 'desc' },
  });
}

export async function markInvitationAccepted(id: string, now: Date = new Date()) {
  return prisma.client.invitation.update({
    where: { id },
    data: { acceptedAt: now },
  });
}

export async function deleteInvitation(id: string) {
  return prisma.client.invitation.delete({
    where: { id },
  });
}

// Durable, DB-backed rate limit: number of invites this admin created recently.
export async function countRecentInvitations(invitedBy: string, since: Date) {
  return prisma.client.invitation.count({
    where: {
      invitedBy,
      createdAt: { gt: since },
    },
  });
}

// Thrown when the invite could not be atomically claimed (already accepted,
// expired, or revoked between the pre-check and the transaction).
export class InvitationClaimError extends Error {
  constructor() {
    super('Invitation is no longer valid');
    this.name = 'InvitationClaimError';
  }
}

/**
 * Atomically consume an invitation and create the user. The invite is claimed
 * with a conditional update (acceptedAt null + unexpired) inside the same
 * transaction as the user/team-membership creation, so a token cannot be used
 * twice even under concurrent requests, and a failure (e.g. duplicate username)
 * rolls the whole thing back, leaving the invite usable.
 */
export interface AcceptedUser {
  id: string;
  username: string;
  role: string;
  createdAt: Date | null;
}

export async function acceptInvitation(params: {
  invitationId: string;
  now?: Date;
  user: { id: string; username: string; password: string; role: string; displayName?: string };
  teamId?: string | null;
  teamRole?: string | null;
}): Promise<AcceptedUser> {
  const now = params.now ?? new Date();

  const user = (await prisma.transaction(async (tx: Prisma.TransactionClient) => {
    const claimed = await tx.invitation.updateMany({
      where: { id: params.invitationId, acceptedAt: null, expiresAt: { gt: now } },
      data: { acceptedAt: now },
    });

    if (claimed.count !== 1) {
      throw new InvitationClaimError();
    }

    const user = await tx.user.create({
      data: {
        id: params.user.id,
        username: params.user.username,
        password: params.user.password,
        role: params.user.role,
        displayName: params.user.displayName,
      },
      select: { id: true, username: true, role: true, createdAt: true },
    });

    if (params.teamId && params.teamRole) {
      await tx.teamUser.create({
        data: {
          id: uuid(),
          userId: user.id,
          teamId: params.teamId,
          role: params.teamRole,
        },
      });
    }

    return user;
  })) as unknown as AcceptedUser;

  return user;
}
