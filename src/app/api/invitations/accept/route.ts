import { z } from 'zod';
import { Prisma } from '@/generated/prisma/client';
import { saveAuth } from '@/lib/auth';
import { ROLES } from '@/lib/constants';
import { hash, secret, uuid } from '@/lib/crypto';
import { hashInviteToken, isInviteExpired } from '@/lib/invitation';
import { createSecureToken } from '@/lib/jwt';
import { hashPassword } from '@/lib/password';
import { checkPasswordStrength, MIN_PASSWORD_LENGTH } from '@/lib/passwordPolicy';
import redis from '@/lib/redis';
import { parseRequest } from '@/lib/request';
import { badRequest, json } from '@/lib/response';
import {
  acceptInvitation,
  getAllUserTeams,
  getInvitationByTokenHash,
  getUserByUsername,
  InvitationClaimError,
} from '@/queries/prisma';

// Public endpoint: an invitee sets their username + password to activate the
// account the invitation grants. On success they are logged in, mirroring the
// login route's token issuance.
export async function POST(request: Request) {
  const schema = z.object({
    token: z.string().min(1).max(512),
    username: z.string().min(1).max(255),
    password: z.string().min(MIN_PASSWORD_LENGTH).max(255),
    displayName: z.string().max(255).optional(),
  });

  const { body, error } = await parseRequest(request, schema, { skipAuth: true });

  if (error) {
    return error();
  }

  const invitation = await getInvitationByTokenHash(hashInviteToken(body.token));

  if (!invitation || invitation.acceptedAt || isInviteExpired(invitation.expiresAt)) {
    return badRequest({
      code: 'invalid-invitation',
      message: 'This invitation is no longer valid',
    });
  }

  const username = body.username.trim().toLowerCase();

  const weak = await checkPasswordStrength(body.password, { username });

  if (weak) {
    return badRequest({ code: weak, message: 'Password does not meet requirements' });
  }

  const existingUser = await getUserByUsername(username, { showDeleted: true });

  if (existingUser) {
    return badRequest({ code: 'username-taken', message: 'That username is already taken' });
  }

  const userId = uuid();
  // Hash once: bcrypt uses a random salt per call, and the auth token below
  // binds to this exact stored hash (checkAuth compares hash(user.password)).
  const passwordHash = hashPassword(body.password);

  let user: { id: string; username: string; role: string; createdAt?: Date | null };

  try {
    user = await acceptInvitation({
      invitationId: invitation.id,
      user: {
        id: userId,
        username,
        password: passwordHash,
        role: invitation.role,
        displayName: body.displayName?.trim() || undefined,
      },
      teamId: invitation.teamId,
      teamRole: invitation.teamRole,
    });
  } catch (e) {
    if (e instanceof InvitationClaimError) {
      return badRequest({
        code: 'invalid-invitation',
        message: 'This invitation is no longer valid',
      });
    }
    // Unique-constraint race on username.
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002') {
      return badRequest({ code: 'username-taken', message: 'That username is already taken' });
    }
    throw e;
  }

  // Issue an auth token exactly as the login route does.
  const { id, role, createdAt } = user;
  const pwd = hash(passwordHash);

  let token: string;

  if (redis.enabled) {
    token = await saveAuth({ userId: id, role, pwd });
  } else {
    token = createSecureToken({ userId: id, role, pwd }, secret());
  }

  const teams = await getAllUserTeams(id);

  return json({
    token,
    user: { id, username: user.username, role, createdAt, isAdmin: role === ROLES.admin, teams },
  });
}
