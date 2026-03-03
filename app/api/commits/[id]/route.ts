import { NextRequest, NextResponse } from "next/server";
import { loadCommits } from "@/lib/commitHistoryStorage";

export const runtime = "nodejs";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const commits = loadCommits();
    const commit = commits.find((c) => c.id === id);
    if (!commit) {
      return NextResponse.json({ error: "Commit not found" }, { status: 404 });
    }
    return NextResponse.json({
      id: commit.id,
      timestamp: commit.timestamp,
      pastedData: commit.pastedData,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown";
    return NextResponse.json(
      { error: `Failed to load commit: ${message}` },
      { status: 500 }
    );
  }
}
