import { NextRequest, NextResponse } from "next/server";
import { processData } from "@/lib/processor";
import { loadCustomMappings } from "@/lib/courseMappingsStorage";
import { addCommit } from "@/lib/commitHistoryStorage";
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

function getBaseWorkbook(): Buffer {
  if (fs.existsSync(CURRENT_REPORT_FILE)) {
    return fs.readFileSync(CURRENT_REPORT_FILE);
  }
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
    const formData = await req.formData();
    const pasteText = formData.get("pasteData") as string | null;
    const baseFileBase64 = formData.get("baseFile") as string | null;

    if (!pasteText || pasteText.trim().length === 0) {
      return NextResponse.json(
        { error: "No data provided. Please paste your data first." },
        { status: 400 }
      );
    }

    let templateBuffer: Buffer;
    if (baseFileBase64 && baseFileBase64.trim().length > 0) {
      try {
        templateBuffer = Buffer.from(baseFileBase64, "base64");
        if (templateBuffer.length < 100) {
          templateBuffer = getBaseWorkbook();
        }
      } catch {
        templateBuffer = getBaseWorkbook();
      }
    } else {
      templateBuffer = getBaseWorkbook();
    }
    const customMappings = loadCustomMappings();
    const result = await processData(pasteText, templateBuffer, customMappings);

    // Unknown course codes: return 200 with unmatched so UI shows "Add to record", not error
    if (!result.success && result.unmatched && result.unmatched.length > 0) {
      return NextResponse.json({
        success: true,
        file: null,
        totalRecords: result.totalRecords,
        matched: result.matched ?? 0,
        unmatched: result.unmatched,
        summary: [],
      });
    }

    if (!result.success) {
      return NextResponse.json(
        { error: result.error, unmatched: result.unmatched ?? [] },
        { status: 400 }
      );
    }

    // Persist the result for next batch (accumulation)
    const dataDir = path.join(process.cwd(), "data");
    if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });
    fs.writeFileSync(CURRENT_REPORT_FILE, result.buffer!);

    // Append to commit history for undo
    const commit = addCommit(pasteText);

    return NextResponse.json({
      file: result.buffer!.toString("base64"),
      totalRecords: result.totalRecords,
      matched: result.matched,
      unmatched: result.unmatched,
      summary: result.summary,
      commit: { id: commit.id, timestamp: commit.timestamp },
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json(
      { error: `Processing failed: ${message}` },
      { status: 500 }
    );
  }
}
