import { NextRequest, NextResponse } from "next/server";
import { processData } from "@/lib/processor";
import { loadCustomMappings } from "@/lib/courseMappingsStorage";
import path from "path";
import fs from "fs";

export const runtime = "nodejs";

const CURRENT_REPORT_FILE = path.join(process.cwd(), "data", "current_report.xlsx");

function getBaseWorkbook(): Buffer {
  // Prefer accumulated report, then custom template, then default template
  if (fs.existsSync(CURRENT_REPORT_FILE)) {
    return fs.readFileSync(CURRENT_REPORT_FILE);
  }
  const customTemplatePath = path.join(process.cwd(), "data", "custom_template.xlsx");
  const defaultTemplatePath = path.join(process.cwd(), "data", "template.xlsx");
  const templatePath = fs.existsSync(customTemplatePath)
    ? customTemplatePath
    : defaultTemplatePath;
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

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    // Persist the result for next batch (accumulation)
    const dataDir = path.join(process.cwd(), "data");
    if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });
    fs.writeFileSync(CURRENT_REPORT_FILE, result.buffer!);

    return NextResponse.json({
      file: result.buffer!.toString("base64"),
      totalRecords: result.totalRecords,
      matched: result.matched,
      unmatched: result.unmatched,
      summary: result.summary,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json(
      { error: `Processing failed: ${message}` },
      { status: 500 }
    );
  }
}
