import path from "path";
import fs from "fs";
import type { ProgramEntry } from "./courseMap";
import { AVAILABLE_PROGRAMS } from "./availablePrograms";

const MAPPINGS_FILE = path.join(process.cwd(), "data", "course_mappings.json");

/** Single program mapping */
export type SingleMapping = ProgramEntry;

/** Distribute counts equally across multiple programs */
export type DistributionMapping = { distribution: ProgramEntry[] };

export type MappingValue = SingleMapping | DistributionMapping;

export type CustomMappings = Record<string, MappingValue>;

function ensureDataDir() {
  const dir = path.join(process.cwd(), "data");
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

export function isDistribution(v: MappingValue): v is DistributionMapping {
  return (
    typeof v === "object" &&
    "distribution" in v &&
    Array.isArray((v as DistributionMapping).distribution)
  );
}

/** Resolve a mapping value to an array of ProgramEntry (for distribution, returns all targets). */
export function resolveMappingToEntries(v: MappingValue): ProgramEntry[] {
  if (isDistribution(v)) return v.distribution;
  return [v];
}

export function loadCustomMappings(): CustomMappings {
  ensureDataDir();
  if (!fs.existsSync(MAPPINGS_FILE)) {
    return {};
  }
  try {
    const raw = fs.readFileSync(MAPPINGS_FILE, "utf-8");
    return JSON.parse(raw) as CustomMappings;
  } catch {
    return {};
  }
}

/**
 * Save a mapping. If programIds has 1 item: single target.
 * If multiple: distribute counts equally across all selected programs.
 */
export function saveCustomMapping(
  courseCode: string,
  programIds: string[]
): { success: boolean; error?: string } {
  if (!programIds || programIds.length === 0) {
    return { success: false, error: "At least one program is required." };
  }

  const entries: ProgramEntry[] = [];
  for (const id of programIds) {
    const program = AVAILABLE_PROGRAMS.find((p) => p.id === id);
    if (!program) {
      return { success: false, error: `Invalid program: ${id}` };
    }
    entries.push({
      label: program.name,
      maleRow: program.maleRow,
      femaleRow: program.femaleRow,
    });
  }

  const value: MappingValue =
    entries.length === 1 ? entries[0] : { distribution: entries };

  ensureDataDir();
  const mappings = loadCustomMappings();
  mappings[courseCode] = value;

  try {
    fs.writeFileSync(MAPPINGS_FILE, JSON.stringify(mappings, null, 2), "utf-8");
    return { success: true };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Failed to save",
    };
  }
}

export function removeCustomMapping(courseCode: string): { success: boolean; error?: string } {
  if (!fs.existsSync(MAPPINGS_FILE)) {
    return { success: true };
  }
  try {
    const mappings = loadCustomMappings();
    delete mappings[courseCode];
    fs.writeFileSync(MAPPINGS_FILE, JSON.stringify(mappings, null, 2), "utf-8");
    return { success: true };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Failed to remove",
    };
  }
}
