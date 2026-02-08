import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { sql } from "drizzle-orm";

export async function GET() {
  const timestamp = new Date().toISOString();

  try {
    await db.execute(sql`SELECT 1`);

    return NextResponse.json({
      status: "ok",
      timestamp,
      database: "connected",
    });
  } catch (error) {
    console.error("[Health] Database check failed:", error);

    return NextResponse.json(
      {
        status: "error",
        timestamp,
        database: "disconnected",
      },
      { status: 503 }
    );
  }
}
