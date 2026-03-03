import { NextResponse } from "next/server";
import path from "path";
import fs from "fs";
import { clearCommits } from "@/lib/commitHistoryStorage";

export const runtime = "nodejs";

const CURRENT_REPORT_FILE = path.join(process.cwd(), "data", "current_report.xlsx");

export async function POST() {
  try {
    clearCommits();
    if (fs.existsSync(CURRENT_REPORT_FILE)) {
      fs.unlinkSync(CURRENT_REPORT_FILE);
      return NextResponse.json({
        message: "Report reset. Next process will start from a fresh template.",
      });
    }
    return NextResponse.json({
      message: "No accumulated report to reset. Next process will use the template.",
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json(
      { error: `Reset failed: ${message}` },
      { status: 500 }
    );
  }
}
