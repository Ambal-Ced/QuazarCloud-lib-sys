/**
 * Maps course codes (as they appear in column 7 of the pasted data)
 * to their corresponding Excel rows in the February sheet.
 *
 * maleRow / femaleRow are 1-based row numbers in the "February" sheet.
 * label is a human-readable name shown in the UI for confirmation/errors.
 *
 * HOW TO UPDATE:
 * If the course codes in your source data change, update the keys below.
 * If a new program is added to the Excel template, add a new entry here
 * and match the maleRow/femaleRow to the new rows in the sheet.
 */

export interface ProgramEntry {
  label: string;
  maleRow: number;
  femaleRow: number;
}

export type CourseMap = Record<string, ProgramEntry>;

const courseMap: CourseMap = {
  // ── COLLEGE OF ARTS AND SCIENCES (CAS) ──────────────────────────────────
  "BS PSY": {
    label: "BS Psychology (CAS)",
    maleRow: 14,
    femaleRow: 15,
  },
  "BA COMM": {
    label: "BA Communication (CAS)",
    maleRow: 19,
    femaleRow: 20,
  },

  // ── COLLEGE OF ENGINEERING TECHNOLOGY (CET) ─────────────────────────────
  "BIT ELT": {
    label: "BIT Electrical Technology (CET)",
    maleRow: 24,
    femaleRow: 25,
  },
  "BET-CPETC": {
    label: "BIT Computer Technology (CET)",
    maleRow: 29,
    femaleRow: 30,
  },
  "BIT I&C": {
    label: "BIT Instrumentation & Communication Technology (CET)",
    maleRow: 34,
    femaleRow: 35,
  },
  "BINTECH / ELXETC": {
    label: "BIT Electronics Technology (CET)",
    maleRow: 39,
    femaleRow: 40,
  },
  // Alternate short codes for the same CET programs (add as needed)
  "BINTECH / ICETC": {
    label: "BIT Instrumentation & Communication Technology (CET)",
    maleRow: 34,
    femaleRow: 35,
  },

  // ── COLLEGE OF INFORMATICS AND COMPUTING SCIENCES (CICS) ────────────────
  "BSIT BA": {
    label: "BSIT Business Analytics Track (CICS)",
    maleRow: 44,
    femaleRow: 45,
  },
  "BSIT SM": {
    label: "BSIT Service Management Track (CICS)",
    maleRow: 49,
    femaleRow: 50,
  },
  "BSIT NT": {
    label: "BSIT Network Technology Track (CICS)",
    maleRow: 54,
    femaleRow: 55,
  },

  // ── COLLEGE OF ACCOUNTING AND BUSINESS ECONOMICS (CABE) ─────────────────
  "BSBA HRM": {
    label: "BSBA Human Resource Management (CABE)",
    maleRow: 59,
    femaleRow: 60,
  },
  "BSBA OM": {
    label: "BSBA Operations Management (CABE)",
    maleRow: 64,
    femaleRow: 65,
  },
  "BSBA MM": {
    label: "BSBA Marketing Management (CABE)",
    maleRow: 69,
    femaleRow: 70,
  },
  "BS MA": {
    label: "BS Management Accounting (CABE)",
    maleRow: 74,
    femaleRow: 75,
  },
  "BS PA": {
    label: "BS Public Administration (CABE)",
    maleRow: 79,
    femaleRow: 80,
  },

  // ── COLLEGE OF TEACHER EDUCATION (CTE) ──────────────────────────────────
  "BSED MATH": {
    label: "BSEd Mathematics (CTE)",
    maleRow: 84,
    femaleRow: 85,
  },
  "BSED SCI": {
    label: "BSEd Science (CTE)",
    maleRow: 89,
    femaleRow: 90,
  },
  "BSED ENG": {
    label: "BSEd English (CTE)",
    maleRow: 94,
    femaleRow: 95,
  },

  // ── OTHER ────────────────────────────────────────────────────────────────
  "FACULTY": {
    label: "Faculty / Non-Teaching Personnel",
    maleRow: 100,
    femaleRow: 101,
  },
  "OUTSIDE": {
    label: "Outside Researchers",
    maleRow: 105,
    femaleRow: 106,
  },
};

export default courseMap;
