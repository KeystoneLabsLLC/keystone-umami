import { z } from 'zod';
import { hashInviteToken, isInviteExpired } from '@/lib/invitation';
import { parseRequest } from '@/lib/request';
import { json } from '@/lib/response';
import { getInvitationByTokenHash, getTeam } from '@/queries/prisma';

// Public endpoint: the invite set-password page calls this to check whether a
// token is still valid and to show which email/team it is for. Tokens carry
// 256 bits of entropy, so a uniform { valid: false } response is safe against
// enumeration.
export async function GET(request: Request) {
  const schema = z.object({
    token: z.string().min(1).max(512),
  });

  const { query, error } = await parseRequest(request, schema, { skipAuth: true });

  if (error) {
    return error();
  }

  const invitation = await getInvitationByTokenHash(hashInviteToken(query.token));

  if (!invitation || invitation.acceptedAt || isInviteExpired(invitation.expiresAt)) {
    return json({ valid: false });
  }

  const teamName = invitation.teamId ? (await getTeam(invitation.teamId))?.name : undefined;

  return json({
    valid: true,
    email: invitation.email,
    role: invitation.role,
    teamName,
  });
}
