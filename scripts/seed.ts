import { randomUUID } from "node:crypto";

import bcrypt from "bcryptjs";
import { eq } from "drizzle-orm";

import { db } from "../src/lib/db/client";
import { users } from "../src/lib/db/schema";

const SALT_ROUNDS = 10;

async function seed(): Promise<void> {
  const email = process.env.SEED_USER_EMAIL;
  const password = process.env.SEED_USER_PASSWORD;

  if (!email || !password) {
    throw new Error(
      "Missing required environment variables: SEED_USER_EMAIL, SEED_USER_PASSWORD",
    );
  }

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
