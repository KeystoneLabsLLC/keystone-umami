import { z } from 'zod';
import { saveAuth } from '@/lib/auth';
import { ROLES } from '@/lib/constants';
import { hash, secret } from '@/lib/crypto';
import { getIpAddress } from '@/lib/ip';
import { createSecureToken } from '@/lib/jwt';
import { checkPassword } from '@/lib/password';
import redis from '@/lib/redis';
import { parseRequest } from '@/lib/request';
import { json, tooManyRequests, unauthorized } from '@/lib/response';
import {
  clearFailedLogins,
  countRecentFailedLogins,
  getAllUserTeams,
  getUserByUsername,
  pruneFailedLogins,
  recordFailedLogin,
} from '@/queries/prisma';

// Durable, DB-backed brute-force throttle: after this many failed attempts from
// one client within the window, further logins are blocked for the window.
const MAX_FAILED_LOGINS = 10;
const LOGIN_WINDOW_MS = 15 * 60 * 1000;

export async function POST(request: Request) {
  const schema = z.object({
    username: z.string(),
    password: z.string(),
  });

  const { body, error } = await parseRequest(request, schema, { skipAuth: true });

  if (error) {
    return error();
  }

  const { username, password } = body;

  // Throttle by client IP (falls back to a shared bucket if IP is unavailable).
  const identifier = getIpAddress(request.headers) || 'unknown';
  const since = new Date(Date.now() - LOGIN_WINDOW_MS);

  if ((await countRecentFailedLogins(identifier, since)) >= MAX_FAILED_LOGINS) {
    return tooManyRequests({ code: 'too-many-login-attempts' });
  }

  const user = await getUserByUsername(username, { includePassword: true });

  if (!user || !checkPassword(password, user.password)) {
    await recordFailedLogin(identifier);
    return unauthorized({ code: 'incorrect-username-password' });
  }

  // Successful login: reset this client's counter and opportunistically prune.
  await clearFailedLogins(identifier);
  await pruneFailedLogins(new Date(Date.now() - 24 * 60 * 60 * 1000));

  const { id, role, createdAt } = user;

  // Bind token to password hash so a password change invalidates old tokens.
  const pwd = hash(user.password);

  let token: string;

  if (redis.enabled) {
    token = await saveAuth({ userId: id, role, pwd });
  } else {
    token = createSecureToken({ userId: user.id, role, pwd }, secret());
  }

  const teams = await getAllUserTeams(id);

  return json({
    token,
    user: { id, username, role, createdAt, isAdmin: role === ROLES.admin, teams },
  });
}
