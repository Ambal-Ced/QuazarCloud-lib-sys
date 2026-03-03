import { NextRequest, NextResponse } from "next/server";
import path from "path";
import fs from "fs";

export const runtime = "nodejs";

const PREFERENCE_FILE = path.join(process.cwd(), "data", "template_preference.json");

function getPreference(): { useDefault: boolean } {
  try {
    if (fs.existsSync(PREFERENCE_FILE)) {
      const raw = fs.readFileSync(PREFERENCE_FILE, "utf-8");
      const data = JSON.parse(raw);
      return { useDefault: data.useDefault === true };
    }
  } catch {
    // ignore
  }
  return { useDefault: false }; // default to custom if it exists
}

function setPreference(useDefault: boolean) {
  const dataDir = path.join(process.cwd(), "data");
  if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });
  fs.writeFileSync(PREFERENCE_FILE, JSON.stringify({ useDefault }));
}

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get("template") as File | null;

    if (!file) {
      return NextResponse.json(
        { error: "No file provided." },
        { status: 400 }
      );
    }

    if (!file.name.endsWith(".xlsx")) {
      return NextResponse.json(
        { error: "Only .xlsx files are supported." },
        { status: 400 }
      );
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // Validate it is a real xlsx by checking the magic bytes (PK zip header)
    if (buffer[0] !== 0x50 || buffer[1] !== 0x4b) {
      return NextResponse.json(
        { error: "Invalid file. Please upload a valid .xlsx file." },
        { status: 400 }
      );
    }

    const dataDir = path.join(process.cwd(), "data");
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }

    // Save as custom_template.xlsx
    const savePath = path.join(dataDir, "custom_template.xlsx");
    fs.writeFileSync(savePath, buffer);
    setPreference(false); // switch to custom after upload

    return NextResponse.json({
      message: "Template uploaded successfully. It will be used for all future processing.",
      filename: file.name,
      size: buffer.length,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json(
      { error: `Upload failed: ${message}` },
      { status: 500 }
    );
  }
}

export async function DELETE() {
  try {
    const customTemplatePath = path.join(
      process.cwd(),
      "data",
      "custom_template.xlsx"
    );
    if (fs.existsSync(customTemplatePath)) {
      fs.unlinkSync(customTemplatePath);
      setPreference(true); // switch back to default
      return NextResponse.json({
        message: "Custom template removed. System will use the built-in default template.",
      });
    }
    return NextResponse.json({
      message: "No custom template was set.",
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json(
      { error: `Failed to remove template: ${message}` },
      { status: 500 }
    );
  }
}

export async function GET() {
  const customTemplatePath = path.join(
    process.cwd(),
    "data",
    "custom_template.xlsx"
  );
  const hasCustom = fs.existsSync(customTemplatePath);
  const { useDefault } = getPreference();
  const activeIsDefault = useDefault || !hasCustom;
  return NextResponse.json({
    hasCustomTemplate: hasCustom,
    useDefault: activeIsDefault,
    templateName: activeIsDefault ? "template.xlsx (default)" : "custom_template.xlsx",
  });
}

export async function PATCH(req: NextRequest) {
  try {
    const body = await req.json();
    const useDefault = body.useDefault === true;
    const customTemplatePath = path.join(process.cwd(), "data", "custom_template.xlsx");
    const hasCustom = fs.existsSync(customTemplatePath);
    if (useDefault) {
      setPreference(true);
      return NextResponse.json({
        message: "Using default template.",
        templateName: "template.xlsx (default)",
        useDefault: true,
      });
    }
    if (!hasCustom) {
      return NextResponse.json(
        { error: "No custom template uploaded. Upload one first." },
        { status: 400 }
      );
    }
    setPreference(false);
    return NextResponse.json({
      message: "Using custom template.",
      templateName: "custom_template.xlsx",
      useDefault: false,
    });
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }
}
