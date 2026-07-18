import { serializeError } from 'serialize-error';
import { z } from 'zod';
import { ROLES } from '@/lib/constants';
import { getAppUrl, isEmailConfigured, isValidEmail, sendEmail } from '@/lib/email';
import { inviteEmail } from '@/lib/emailTemplates';
import { generateInviteToken, getInviteExpiry, INVITE_TTL_MS } from '@/lib/invitation';
import { parseRequest } from '@/lib/request';
import {
  badRequest,
  json,
  serviceUnavailable,
  tooManyRequests,
  unauthorized,
} from '@/lib/response';
import { canCreateUser } from '@/permissions';
import {
  countRecentInvitations,
  createInvitation,
  deleteInvitation,
  getPendingInvitationByEmail,
  getTeam,
  getUserByUsername,
  listPendingInvitations,
} from '@/queries/prisma';

// Durable, DB-backed rate limit: max invites a single admin may create per hour.
const MAX_INVITES_PER_HOUR = 20;

// One invite role → the account role and (if a team is attached) the team role.
const ACCOUNT_ROLE: Record<string, string> = {
  'view-only': ROLES.viewOnly,
  member: ROLES.user,
  manager: ROLES.user,
};
const TEAM_ROLE: Record<string, string> = {
  'view-only': ROLES.teamViewOnly,
  member: ROLES.teamMember,
  manager: ROLES.teamManager,
};

export async function POST(request: Request) {
  const schema = z.object({
    email: z.string().max(255),
    role: z.enum(['view-only', 'member', 'manager']),
    teamId: z.uuid().optional(),
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

  if (!isValidEmail(email)) {
    return badRequest({ message: 'Invalid email address' });
  }

  // The username is the email, so reject if that account already exists.
  if (await getUserByUsername(email, { showDeleted: true })) {
    return badRequest({ message: 'A user with this email already exists' });
  }

  // Derive the account role and (if a team is attached) the team role from the
  // single invite role.
  const role = ACCOUNT_ROLE[body.role];

  // Team is optional; if attached, the team role is derived from the same role.
  let teamId: string | null = null;
  let teamRole: string | null = null;
  let teamName: string | undefined;

  if (body.teamId) {
    const team = await getTeam(body.teamId);

    if (!team) {
      return badRequest({ message: 'Team not found' });
    }

    teamId = body.teamId;
    teamRole = TEAM_ROLE[body.role];
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
    // Log the real provider error server-side; return a clear, email-specific
    // code so the admin knows to check the email configuration.
    // eslint-disable-next-line no-console
    console.log(serializeError(e));
    return Response.json(
      {
        error: {
          message: 'Could not send the invitation email',
          code: 'email-send-failed',
          status: 502,
        },
      },
      { status: 502 },
    );
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
