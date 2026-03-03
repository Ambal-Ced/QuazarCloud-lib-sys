import { NextRequest, NextResponse } from "next/server";
import {
  loadCustomMappings,
  saveCustomMapping,
  removeCustomMapping,
  resolveMappingToEntries,
} from "@/lib/courseMappingsStorage";
import { AVAILABLE_PROGRAMS } from "@/lib/availablePrograms";

export const runtime = "nodejs";

export async function GET() {
  try {
    const mappings = loadCustomMappings();
    return NextResponse.json({
      mappings: Object.entries(mappings).map(([code, value]) => {
        const targets = resolveMappingToEntries(value);
        return {
          code,
          targets: targets.map((t) => ({ label: t.label, maleRow: t.maleRow, femaleRow: t.femaleRow })),
        };
      }),
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json(
      { error: `Failed to load mappings: ${message}` },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { code, programId, programIds } = body as {
      code?: string;
      programId?: string;
      programIds?: string[];
    };

    if (!code || typeof code !== "string" || !code.trim()) {
      return NextResponse.json(
        { error: "Course code is required." },
        { status: 400 }
      );
    }

    const ids = Array.isArray(programIds) && programIds.length > 0
      ? programIds
      : typeof programId === "string"
        ? [programId]
        : [];

    if (ids.length === 0) {
      return NextResponse.json(
        { error: "At least one program must be selected." },
        { status: 400 }
      );
    }

    const result = saveCustomMapping(code.trim(), ids);

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    const msg =
      ids.length === 1
        ? `"${code.trim()}" is now mapped to one program.`
        : `"${code.trim()}" is now mapped to ${ids.length} programs (counts will be distributed equally).`;
    return NextResponse.json({
      message: msg + " Use it in future processing.",
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json(
      { error: `Failed to save mapping: ${message}` },
      { status: 500 }
    );
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const code = searchParams.get("code");

    if (!code) {
      return NextResponse.json(
        { error: "Course code is required." },
        { status: 400 }
      );
    }

    const result = removeCustomMapping(code);

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 500 });
    }

    return NextResponse.json({
      message: `Mapping for "${code}" has been removed.`,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json(
      { error: `Failed to remove mapping: ${message}` },
      { status: 500 }
    );
  }
}
