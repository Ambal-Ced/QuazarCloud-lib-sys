import { NextResponse } from "next/server";
import { loadCommits } from "@/lib/commitHistoryStorage";

export const runtime = "nodejs";

export async function GET() {
  try {
    const commits = loadCommits();
    return NextResponse.json({
      commits: commits.map((c) => ({
        id: c.id,
        timestamp: c.timestamp,
      })),
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown";
    return NextResponse.json(
      { error: `Failed to load commits: ${message}` },
      { status: 500 }
    );
  }
}
