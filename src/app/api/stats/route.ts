import { count, eq } from "drizzle-orm";
import { NextResponse } from "next/server";

import { requireUserId } from "@/lib/auth/session";
import { db } from "@/lib/db/client";
import { userBooks } from "@/lib/db/schema";
import type { BookStats, CategoryStats } from "@/types/books";

function emptyCategoryStats(): CategoryStats {
  return { reading: 0, read: 0, want_to_read: 0 };
}

export async function GET() {
  const userId = await requireUserId();

  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const rows = await db
      .select({
        category: userBooks.category,
        status: userBooks.status,
        count: count(),
      })
      .from(userBooks)
      .where(eq(userBooks.userId, userId))
      .groupBy(userBooks.category, userBooks.status);

    const stats: BookStats = {
      total: 0,
      novels: emptyCategoryStats(),
      non_fiction: emptyCategoryStats(),
    };

    for (const row of rows) {
      const categoryStats = row.category === "novel" ? stats.novels : stats.non_fiction;
      categoryStats[row.status] = row.count;
      stats.total += row.count;
    }

    return NextResponse.json(stats);
  } catch (error) {
    console.error("Failed to fetch stats:", error);
    return NextResponse.json({ error: "Failed to fetch stats" }, { status: 500 });
  }
}
