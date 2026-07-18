/* eslint-disable no-console */
// Reset a Keystone user's password directly against the database.
//
// Usage:
//   NEW_PASSWORD='your-new-password' DATABASE_URL='postgres://...' \
//     corepack pnpm change-password [username]
//
// - Username defaults to "admin".
// - The new password is read from the NEW_PASSWORD environment variable so it
//   never appears in shell history or the process list (unlike a CLI argument).
// - The password is bcrypt-hashed with the same cost the app uses; the plaintext
//   and hash are never printed.
import 'dotenv/config';
import bcrypt from 'bcryptjs';
import pg from 'pg';

const SALT_ROUNDS = 10; // must match src/lib/password.ts

async function main() {
  const username = (process.argv[2] || 'admin').toLowerCase();
  const password = process.env.NEW_PASSWORD;

  if (!process.env.DATABASE_URL) {
    console.error('Error: DATABASE_URL is not set.');
    process.exit(1);
  }

  if (!password || password.length < 8) {
    console.error('Error: set NEW_PASSWORD to at least 8 characters.');
    process.exit(1);
  }

  const passwordHash = bcrypt.hashSync(password, SALT_ROUNDS);

  const client = new pg.Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();

  try {
    const result = await client.query(
      `UPDATE "user"
         SET password = $1, updated_at = now()
       WHERE username = $2 AND deleted_at IS NULL`,
      [passwordHash, username],
    );

    if (result.rowCount === 0) {
      console.error(`No active user found with username "${username}".`);
      process.exit(1);
    }

    console.log(`Password updated for user "${username}".`);
  } finally {
    await client.end();
  }
}

main().catch(err => {
  // Log the message only, never the password or hash.
  console.error('Failed to change password:', err.message);
  process.exit(1);
});
