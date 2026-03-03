import { NextRequest, NextResponse } from "next/server";
import path from "path";
import fs from "fs";

export const runtime = "nodejs";

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

    // Save as custom_template.xlsx — this overrides the default template
    const savePath = path.join(dataDir, "custom_template.xlsx");
    fs.writeFileSync(savePath, buffer);

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
  return NextResponse.json({
    usingCustomTemplate: hasCustom,
    templateName: hasCustom ? "custom_template.xlsx" : "template.xlsx (default)",
  });
}
