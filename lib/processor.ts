import ExcelJS from "exceljs";
import courseMap, { type CourseMap, type ProgramEntry } from "./courseMap";
import type { CustomMappings, MappingValue } from "./courseMappingsStorage";
import { isDistribution, resolveMappingToEntries } from "./courseMappingsStorage";
import { AVAILABLE_PROGRAMS } from "./availablePrograms";

export interface ParsedRecord {
  date: string;
  day: number;
  sex: "MALE" | "FEMALE";
  courseCode: string;
}

export interface ProcessResult {
  success: boolean;
  buffer?: Buffer;
  totalRecords: number;
  matched: number;
  unmatched: string[];
  summary: Array<{ label: string; male: number; female: number }>;
  error?: string;
}

/**
 * Parses pasted tab-separated data (no header row).
 * Extracts: col 2 (date, 1-based), col 5 (sex), col 7 (course code).
 */
export function parsePastedData(raw: string): {
  records: ParsedRecord[];
  skippedRows: number;
} {
  const lines = raw
    .split("\n")
    .map((l) => l.trim())
    .filter((l) => l.length > 0);

  const records: ParsedRecord[] = [];
  let skippedRows = 0;

  for (const line of lines) {
    // Support both tab-separated and multiple-spaces-separated (copy from web table)
    const cols = line.split("\t");

    // Need at least 7 columns (indices 0–6)
    if (cols.length < 7) {
      skippedRows++;
      continue;
    }

    const rawDate = cols[1].trim();   // col 2 (1-based) = index 1
    const rawSex = cols[4].trim().toUpperCase();  // col 5 = index 4
    const rawCourse = cols[6].trim(); // col 7 = index 6

    if (!rawDate || !rawSex || !rawCourse) {
      skippedRows++;
      continue;
    }

    // Parse date: accepts M/D/YYYY or MM/DD/YYYY
    const dateParts = rawDate.split("/");
    if (dateParts.length < 2) {
      skippedRows++;
      continue;
    }
    const day = parseInt(dateParts[1], 10);
    if (isNaN(day) || day < 1 || day > 31) {
      skippedRows++;
      continue;
    }

    if (rawSex !== "MALE" && rawSex !== "FEMALE") {
      skippedRows++;
      continue;
    }

    records.push({
      date: rawDate,
      day,
      sex: rawSex as "MALE" | "FEMALE",
      courseCode: rawCourse,
    });
  }

  return { records, skippedRows };
}

/**
 * Tallies records into a nested map:
 * courseCode -> day -> { MALE: count, FEMALE: count }
 */
function tally(
  records: ParsedRecord[]
): Map<string, Map<number, { MALE: number; FEMALE: number }>> {
  const result = new Map<
    string,
    Map<number, { MALE: number; FEMALE: number }>
  >();

  for (const r of records) {
    if (!result.has(r.courseCode)) {
      result.set(r.courseCode, new Map());
    }
    const dayMap = result.get(r.courseCode)!;
    if (!dayMap.has(r.day)) {
      dayMap.set(r.day, { MALE: 0, FEMALE: 0 });
    }
    dayMap.get(r.day)![r.sex]++;
  }

  return result;
}

/**
 * Converts day number (1-31) to the Excel column index (1-based).
 * Day 1 → column C (index 3), Day 31 → column AG (index 33).
 */
function dayToColIndex(day: number): number {
  return day + 2; // C=3, D=4, ... AG=33
}

/** Safely parse a cell value as a number (avoids NaN/Infinity and formula objects). */
function safeNum(v: unknown): number {
  if (typeof v === "number" && Number.isFinite(v)) return Math.round(v);
  if (typeof v === "string") {
    const n = parseFloat(v);
    return Number.isFinite(n) ? Math.round(n) : 0;
  }
  return 0;
}

/** Unified map: built-in uses ProgramEntry, custom can be single or distribution. */
type MergedMap = Record<string, ProgramEntry | MappingValue>;

function getMergedMap(customMappings?: CustomMappings): MergedMap {
  const merged: MergedMap = { ...courseMap };
  if (customMappings && Object.keys(customMappings).length > 0) {
    for (const [code, value] of Object.entries(customMappings)) {
      merged[code] = value;
    }
  }
  return merged;
}

/**
 * Split a count equally across N targets. Uses floor division; remainder goes to first.
 * e.g. 7 across 3 → [3, 2, 2]
 */
function distributeCount(count: number, n: number): number[] {
  if (n <= 0) return [];
  if (n === 1) return [count];
  const base = Math.floor(count / n);
  const remainder = count % n;
  const result: number[] = [];
  for (let i = 0; i < n; i++) {
    result.push(base + (i < remainder ? 1 : 0));
  }
  return result;
}

/**
 * Main processor: parses pasted text, fills the xlsx template, returns buffer.
 * customMappings: user-added mappings persisted in course_mappings.json
 */
export async function processData(
  rawPaste: string,
  templateBuffer: Buffer | ArrayBuffer,
  customMappings?: CustomMappings
): Promise<ProcessResult> {
  const mergedMap = getMergedMap(customMappings);

  const { records, skippedRows } = parsePastedData(rawPaste);

  if (records.length === 0) {
    return {
      success: false,
      totalRecords: 0,
      matched: 0,
      unmatched: [],
      summary: [],
      error: `No valid records found. ${skippedRows} row(s) were skipped due to formatting issues.`,
    };
  }

  const tallied = tally(records);

  // Track which course codes are unknown
  const unmatchedSet = new Set<string>();
  let matched = 0;

  // Load workbook from the template buffer
  const workbook = new ExcelJS.Workbook();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await workbook.xlsx.load(templateBuffer as any);

  const sheet = workbook.getWorksheet("February");
  if (!sheet) {
    return {
      success: false,
      totalRecords: records.length,
      matched: 0,
      unmatched: [],
      summary: [],
      error: 'Could not find the "February" sheet in the template.',
    };
  }

  // Write counts into the sheet
  for (const [courseCode, dayMap] of tallied) {
    const value = mergedMap[courseCode];
    if (!value) {
      unmatchedSet.add(courseCode);
      continue;
    }

    const targets = resolveMappingToEntries(value);
    const n = targets.length;

    for (const [day, counts] of dayMap) {
      const colIndex = dayToColIndex(day);
      const maleParts = distributeCount(counts.MALE, n);
      const femaleParts = distributeCount(counts.FEMALE, n);

      for (let i = 0; i < n; i++) {
        const entry = targets[i];
        const maleRow = sheet.getRow(entry.maleRow);
        const maleCell = maleRow.getCell(colIndex);
        const currentMale = safeNum(maleCell.value);
        const newMale = currentMale + maleParts[i];
        maleCell.value = Number.isFinite(newMale) ? Math.round(newMale) : 0;

        const femaleRow = sheet.getRow(entry.femaleRow);
        const femaleCell = femaleRow.getCell(colIndex);
        const currentFemale = safeNum(femaleCell.value);
        const newFemale = currentFemale + femaleParts[i];
        femaleCell.value = Number.isFinite(newFemale) ? Math.round(newFemale) : 0;
      }

      matched += counts.MALE + counts.FEMALE;
    }
  }

  // Build summary from workbook (accumulated totals) — read actual cell values after write
  const summary: Array<{ label: string; male: number; female: number }> = [];
  for (const prog of AVAILABLE_PROGRAMS) {
    let male = 0;
    let female = 0;
    for (let col = 3; col <= 33; col++) {
      male += safeNum(sheet.getRow(prog.maleRow).getCell(col).value);
      female += safeNum(sheet.getRow(prog.femaleRow).getCell(col).value);
    }
    if (male > 0 || female > 0) {
      summary.push({ label: prog.name, male, female });
    }
  }

  // Write to buffer — use plain options to reduce corruption risk
  const outBuffer = await workbook.xlsx.writeBuffer({
    useSharedStrings: false,
  });

  return {
    success: true,
    buffer: Buffer.from(outBuffer),
    totalRecords: records.length + skippedRows,
    matched,
    unmatched: Array.from(unmatchedSet),
    summary,
  };
}
