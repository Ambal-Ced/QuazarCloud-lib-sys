import { NextResponse } from "next/server";
import { AVAILABLE_PROGRAMS } from "@/lib/availablePrograms";

export const runtime = "nodejs";

export async function GET() {
  return NextResponse.json({ programs: AVAILABLE_PROGRAMS });
}
