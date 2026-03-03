import { NextRequest, NextResponse } from "next/server";
import { processData } from "@/lib/processor";
import { loadCustomMappings } from "@/lib/courseMappingsStorage";
import {
  loadCommits,
  removeCommit,
  type Commit,
} from "@/lib/commitHistoryStorage";
import path from "path";
import fs from "fs";

export const runtime = "nodejs";

const CURRENT_REPORT_FILE = path.join(process.cwd(), "data", "current_report.xlsx");
const PREFERENCE_FILE = path.join(process.cwd(), "data", "template_preference.json");

function getTemplatePreference(): boolean {
  try {
    if (fs.existsSync(PREFERENCE_FILE)) {
      const raw = fs.readFileSync(PREFERENCE_FILE, "utf-8");
      const data = JSON.parse(raw);
      return data.useDefault === true;
    }
  } catch {
    /* ignore */
  }
  return false;
}

function getTemplateBuffer(): Buffer {
  const customTemplatePath = path.join(process.cwd(), "data", "custom_template.xlsx");
  const defaultTemplatePath = path.join(process.cwd(), "data", "template.xlsx");
  const useDefault = getTemplatePreference();
  const hasCustom = fs.existsSync(customTemplatePath);
  const templatePath =
    useDefault || !hasCustom ? defaultTemplatePath : customTemplatePath;
  if (!fs.existsSync(templatePath)) {
    throw new Error("Template file not found. Please upload a template first.");
  }
  return fs.readFileSync(templatePath);
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const commitId = body?.commitId;
    if (!commitId || typeof commitId !== "string") {
      return NextResponse.json(
        { error: "Missing commitId" },
        { status: 400 }
      );
    }

    const commits = loadCommits();
    const idx = commits.findIndex((c) => c.id === commitId);
    if (idx < 0) {
      return NextResponse.json(
        { error: "Commit not found" },
        { status: 404 }
      );
    }

    const remaining = commits.filter((c) => c.id !== commitId);
    removeCommit(commitId);

    let buffer: Buffer = getTemplateBuffer();
    const customMappings = loadCustomMappings();
    let lastSummary: Array<{ label: string; male: number; female: number }> = [];

    for (const c of remaining) {
      const result = await processData(
        c.pastedData,
        buffer,
        customMappings
      );
      if (!result.success || !result.buffer) {
        return NextResponse.json(
          { error: `Rebuild failed at commit ${c.id}: ${result.error || "Unknown"}` },
          { status: 500 }
        );
      }
      buffer = result.buffer;
      lastSummary = result.summary ?? [];
    }
    const totalMatched = lastSummary.reduce((acc, s) => acc + s.male + s.female, 0);

    const dataDir = path.join(process.cwd(), "data");
    if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });
    if (remaining.length === 0) {
      if (fs.existsSync(CURRENT_REPORT_FILE)) fs.unlinkSync(CURRENT_REPORT_FILE);
    } else {
      fs.writeFileSync(CURRENT_REPORT_FILE, buffer);
    }

    return NextResponse.json({
      success: true,
      file: remaining.length > 0 ? buffer.toString("base64") : null,
      matched: totalMatched,
      summary: lastSummary,
      commits: remaining.map((c: Commit) => ({
        id: c.id,
        timestamp: c.timestamp,
      })),
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown";
    return NextResponse.json(
      { error: `Undo failed: ${message}` },
      { status: 500 }
    );
  }
}
