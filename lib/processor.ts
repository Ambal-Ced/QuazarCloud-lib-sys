import ExcelJS from "exceljs";
import courseMap, { type CourseMap, type ProgramEntry } from "./courseMap";
import type { CustomMappings, MappingValue } from "./courseMappingsStorage";
import { isDistribution, resolveMappingToEntries } from "./courseMappingsStorage";
import { AVAILABLE_PROGRAMS } from "./availablePrograms";

export interface ParsedRecord {
  date: string;
  day: number;
  sex: "MALE" | "FEMALE";
  /** Column 6: used with col7 to confirm correct course mapping */
  col6: string;
  /** Column 7: course/program code */
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
 * Extracts: col 2 (date), col 5 (sex), col 6 (course/program confirm), col 7 (course code).
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
    const cols = line.split("\t");

    if (cols.length < 7) {
      skippedRows++;
      continue;
    }

    const rawDate = cols[1].trim();
    const rawSex = cols[4].trim().toUpperCase();
    const rawCol6 = cols[5].trim();   // col 6 = index 5 — used to confirm correct course
    const rawCol7 = cols[6].trim();   // col 7 = index 6 — course code

    if (!rawDate || !rawSex || !rawCol7) {
      skippedRows++;
      continue;
    }

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
      col6: rawCol6,
      courseCode: rawCol7,
    });
  }

  return { records, skippedRows };
}

/**
 * Extract college id from program label, e.g. "(CICS)" → "cics", "(CTE)" → "cte".
 */
function getCollegeFromLabel(label: string): string | null {
  if (/\((CICS|CTE|CAS|CET|CABE)\)/i.test(label)) {
    const m = label.match(/\((CICS|CTE|CAS|CET|CABE)\)/i);
    return m ? m[1].toLowerCase() : null;
  }
  if (/COLLEGE OF ARTS AND SCIENCES|ARTS AND SCIENCES/i.test(label)) return "cas";
  if (/Faculty|Non-Teaching/i.test(label)) return "faculty";
  if (/Outside/i.test(label)) return "outside";
  return null;
}

/**
 * Get department from col6 (column 6). Returns department id or null.
 * Covers: CICS, CTE, CET, CABE, CAS, Faculty, Outside.
 */
function getDepartmentFromCol6(col6: string): string | null {
  const u = col6.toUpperCase().trim();
  if (u.length < 3) return null; // Avoid "BA", "NT", "SM", "OM", "MM"
  if (/\bCICS\b|INFORMATICS|COMPUTING SCIENCES|BSIT\b|BSITECH/i.test(u)) return "cics";
  if (/\bCTE\b|TEACHER EDUCATION|COLLEGE OF EDUCATION|\bBSED\b/i.test(u)) return "cte";
  if (/\bCET\b|ENGINEERING TECHNOLOGY|\bBET\b|BINTECH|BIT ELECTRICAL|BIT COMPUTER|BIT INSTRUMENT|BIT ELECTRONICS|ELETC|CPETC|ELXETC|ICETC|ELT\b/i.test(u)) return "cet";
  if (/\bCABE\b|ACCOUNTING.*BUSINESS|BSBA\b|MANAGEMENT ACCOUNTING|PUBLIC ADMIN|HUMAN RESOURCE|OPERATIONS MGMT|MARKETING MGMT/i.test(u)) return "cabe";
  if (/\bCAS\b|ARTS AND SCIENCES|PSYCHOLOGY|COMMUNICATION|BA COMM|BS PSY/i.test(u)) return "cas";
  if (/FACULTY|NON-TEACHING|PERSONNEL/i.test(u)) return "faculty";
  if (/OUTSIDE|RESEARCHER/i.test(u)) return "outside";
  return null;
}

/** Get all course keys in mergedMap that belong to the given department. */
function getCourseKeysForDepartment(mergedMap: MergedMap, department: string): Set<string> {
  const keys = new Set<string>();
  for (const [key, value] of Object.entries(mergedMap)) {
    const entries = resolveMappingToEntries(value as MappingValue);
    for (const e of entries) {
      if (getCollegeFromLabel(e.label) === department) {
        keys.add(key);
        break;
      }
    }
  }
  return keys;
}

/** Normalize a key for matching (collapse spaces, unify slash). */
function normalizeKey(k: string): string {
  return k.replace(/\s+/g, " ").replace(/\s*\/\s*/g, " /").trim();
}

/** Find mergedMap key that matches candidate (exact or normalized match). */
function findMatchingKey(candidate: string, mergedMap: MergedMap): string | null {
  const n = normalizeKey(candidate);
  // Direct lookup
  if (mergedMap[n]) return n;
  // Iterate keys: match normalized form (handles encoding/whitespace differences)
  for (const key of Object.keys(mergedMap)) {
    if (normalizeKey(key) === n) return key;
  }
  return null;
}

/**
 * Resolves course key using DEPARTMENT-FIRST logic:
 * 1. Col6 = department (CICS, CTE, CET, etc.) — restricts targets to that department only
 * 2. Col7 = track (BA, NT, SM for CICS; MATH, SCI, ENG for CTE; etc.)
 * 3. Custom mappings are checked within the department filter
 * Data goes ONLY to programs in the department from col6.
 */
function resolveCourseKey(
  col6: string,
  col7: string,
  mergedMap: MergedMap
): string | null {
  const department = getDepartmentFromCol6(col6);
  const allowedKeys = department ? getCourseKeysForDepartment(mergedMap, department) : null;

  const tryMatch = (key: string): string | null => {
    const matchedKey = findMatchingKey(key, mergedMap);
    if (!matchedKey) return null;
    if (allowedKeys) {
      // Check if matchedKey (or its normalized form) is in allowed department keys
      const allowedNorm = new Set([...allowedKeys].map((k) => normalizeKey(k)));
      if (!allowedNorm.has(normalizeKey(matchedKey))) return null;
    }
    return matchedKey;
  };

  // Build candidates: try both "department | track" and "track" for all departments
  const candidates: string[] = [];
  if (col6 && col7) {
    candidates.push(`${col6} | ${col7}`); // e.g. CICS | BSITECH /BA
    candidates.push(`${col7} | ${col6}`); // swapped (in case column order differs)
  }
  candidates.push(col7); // track only: BSITECH /BA, BSED MATH, etc.
  candidates.push(col6); // dept only (e.g. "BSITECH" distribution)
  if (col6 && col7) {
    candidates.push(
      `${col6} /${col7}`,
      `${col6}/${col7}`,
      `${col6} ${col7}`,
      `${col7} /${col6}`,
      `${col7}/${col6}`
    );
  }

  for (const key of candidates) {
    const match = tryMatch(key);
    if (match) return match;
  }

  // Department + track fallback: col6=dept, col7=track (e.g. CICS+BA → BSIT BA)
  // Only match when col7 is a known track identifier to avoid "SCI" matching CICS
  if (department && col7) {
    const deptKeys = getCourseKeysForDepartment(mergedMap, department);
    const trackUpper = col7.toUpperCase().trim();
    for (const key of deptKeys) {
      const n = normalizeKey(key);
      const keyUpper = n.toUpperCase();
      // Match whole track: key ends with track (e.g. "BSIT BA" ends with "BA") or has " /TRACK"
      if (
        keyUpper === trackUpper ||
        keyUpper.endsWith(" " + trackUpper) ||
        keyUpper.endsWith("/" + trackUpper)
      ) {
        return n;
      }
    }
  }

  return null;
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

  // Resolve course key using col 6 + col 7 so data goes to the correct program
  const resolvedRecords: ParsedRecord[] = [];
  const unmatchedSet = new Set<string>();

  for (const r of records) {
    // Department-first: col6 restricts to that department, col7 picks track
    const key = resolveCourseKey(r.col6, r.courseCode, mergedMap);
    if (!key) {
      unmatchedSet.add(r.col6 ? `${r.col6} | ${r.courseCode}` : r.courseCode);
      continue;
    }
    resolvedRecords.push({ ...r, courseCode: key });
  }

  // If any unknown course codes, do not update Excel — prevents doubling on retry
  if (unmatchedSet.size > 0) {
    return {
      success: false,
      totalRecords: records.length + skippedRows,
      matched: resolvedRecords.length,
      unmatched: Array.from(unmatchedSet),
      summary: [],
      error: `Cannot update Excel: ${unmatchedSet.size} unknown course code(s). Add mappings for them first, then process again.`,
    };
  }

  const tallied = tally(resolvedRecords);
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
