import { uuid } from '@/lib/crypto';
import prisma from '@/lib/prisma';

// Records only FAILED login attempts, keyed by client identifier (IP). Used for
// durable, DB-backed brute-force throttling since this deployment has no Redis.

export async function recordFailedLogin(identifier: string) {
  return prisma.client.loginAttempt.create({
    data: { id: uuid(), identifier },
  });
}

export async function countRecentFailedLogins(identifier: string, since: Date) {
  return prisma.client.loginAttempt.count({
    where: { identifier, createdAt: { gt: since } },
  });
}

// Called after a successful login to reset the identifier's failure counter.
export async function clearFailedLogins(identifier: string) {
  return prisma.client.loginAttempt.deleteMany({
    where: { identifier },
  });
}

// Opportunistic cleanup so the table cannot grow unbounded.
export async function pruneFailedLogins(before: Date) {
  return prisma.client.loginAttempt.deleteMany({
    where: { createdAt: { lt: before } },
  });
}
