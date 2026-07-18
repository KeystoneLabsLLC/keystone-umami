import { z } from 'zod';
import { getAppUrl, isEmailConfigured, isValidEmail, sendEmail } from '@/lib/email';
import { inviteEmail } from '@/lib/emailTemplates';
import { generateInviteToken, getInviteExpiry, INVITE_TTL_MS } from '@/lib/invitation';
import { parseRequest } from '@/lib/request';
import {
  badRequest,
  json,
  serverError,
  serviceUnavailable,
  tooManyRequests,
  unauthorized,
} from '@/lib/response';
import { teamRoleParam, userRoleParam } from '@/lib/schema';
import { canCreateUser } from '@/permissions';
import {
  countRecentInvitations,
  createInvitation,
  deleteInvitation,
  getPendingInvitationByEmail,
  getTeam,
  listPendingInvitations,
} from '@/queries/prisma';

// Durable, DB-backed rate limit: max invites a single admin may create per hour.
const MAX_INVITES_PER_HOUR = 20;

export async function POST(request: Request) {
  const schema = z.object({
    email: z.string().max(255),
    role: userRoleParam,
    teamId: z.uuid().optional(),
    teamRole: teamRoleParam.optional(),
  });

  const { auth, body, error } = await parseRequest(request, schema);

  if (error) {
    return error();
  }

  if (!(await canCreateUser(auth))) {
    return unauthorized();
  }

  if (!isEmailConfigured()) {
    return serviceUnavailable({ message: 'Email is not configured on the server' });
  }

  // Fail closed: the invite link host must come from trusted config, never from
  // the request Host header (which an attacker could spoof to poison the link).
  const base = getAppUrl();

  if (!base) {
    return serviceUnavailable({ message: 'APP_URL is not configured on the server' });
  }

  const email = body.email.trim().toLowerCase();
  const { role } = body;

  if (!isValidEmail(email)) {
    return badRequest({ message: 'Invalid email address' });
  }

  // Team is optional; if a team is chosen a team role is required, and vice versa.
  let teamId: string | null = null;
  let teamRole: string | null = null;
  let teamName: string | undefined;

  if (body.teamId || body.teamRole) {
    if (!body.teamId || !body.teamRole) {
      return badRequest({ message: 'Both team and team role are required to share a team' });
    }

    const team = await getTeam(body.teamId);

    if (!team) {
      return badRequest({ message: 'Team not found' });
    }

    teamId = body.teamId;
    teamRole = body.teamRole;
    teamName = team.name;
  }

  // Rate limit per inviting admin.
  const since = new Date(Date.now() - 60 * 60 * 1000);
  const recent = await countRecentInvitations(auth.user.id, since);

  if (recent >= MAX_INVITES_PER_HOUR) {
    return tooManyRequests({ message: 'Invite limit reached, try again later' });
  }

  // Block a second active invite to the same address.
  const existing = await getPendingInvitationByEmail(email);

  if (existing) {
    return badRequest({ message: 'An active invitation already exists for this email' });
  }

  const { token, tokenHash } = generateInviteToken();
  const expiresAt = getInviteExpiry();

  const invitation = await createInvitation({
    email,
    role,
    tokenHash,
    invitedBy: auth.user.id,
    expiresAt,
    teamId,
    teamRole,
  });

  // Build the accept link from the trusted public URL validated above. The raw
  // token appears only here, never in storage.
  const acceptUrl = `${base}/invite/${token}`;

  try {
    await sendEmail(
      inviteEmail({
        to: email,
        acceptUrl,
        inviterName: auth.user.username,
        teamName,
        expiresInDays: Math.round(INVITE_TTL_MS / (24 * 60 * 60 * 1000)),
      }),
    );
  } catch (e) {
    // Roll back so we never leave an invite that was never delivered.
    await deleteInvitation(invitation.id).catch(() => {});
    return serverError(e);
  }

  return json({
    id: invitation.id,
    email: invitation.email,
    role: invitation.role,
    teamId: invitation.teamId,
    teamRole: invitation.teamRole,
    expiresAt: invitation.expiresAt,
    createdAt: invitation.createdAt,
  });
}

export async function GET(request: Request) {
  const { auth, error } = await parseRequest(request);

  if (error) {
    return error();
  }

  if (!(await canCreateUser(auth))) {
    return unauthorized();
  }

  const invitations = await listPendingInvitations();

  return json({ data: invitations });
}
