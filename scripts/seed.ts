import { randomUUID } from "node:crypto";

import bcrypt from "bcryptjs";
import { eq } from "drizzle-orm";

import { db } from "../src/lib/db/client";
import { users } from "../src/lib/db/schema";

const SALT_ROUNDS = 10;

// SEED_USER_EMAIL / SEED_USER_PASSWORD override these defaults when set.
// `.env.local.example` ships them empty, so an empty value must fall back too.
const DEFAULT_SEED_USER_EMAIL = "test@booktracker.app";
const DEFAULT_SEED_USER_PASSWORD = "booktracker";

async function seed(): Promise<void> {
  const email = process.env.SEED_USER_EMAIL || DEFAULT_SEED_USER_EMAIL;
  const password = process.env.SEED_USER_PASSWORD || DEFAULT_SEED_USER_PASSWORD;

  try {
    const [existingUser] = await db
      .select()
      .from(users)
      .where(eq(users.email, email))
      .limit(1);

    if (existingUser) {
      console.log(`User ${email} already exists, skipping seed.`);
      return;
    }

    const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);

    await db.insert(users).values({
      id: randomUUID(),
      email,
      passwordHash,
    });

    console.log(`Seeded user ${email}.`);
  } catch (error) {
    console.error("Failed to seed user:", error);
    throw error;
  }
}

seed();
