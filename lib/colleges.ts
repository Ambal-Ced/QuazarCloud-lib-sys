/**
 * College/Department list for the department status panel.
 * Each college maps to program label patterns (substrings in the program label from courseMap).
 */

export const COLLEGES: { id: string; name: string; pattern: RegExp }[] = [
  { id: "cas", name: "College of Arts and Sciences", pattern: /\(CAS\)/ },
  { id: "cet", name: "College of Engineering Technology", pattern: /\(CET\)/ },
  { id: "cics", name: "College of Informatics and Computing Sciences", pattern: /\(CICS\)/ },
  { id: "cabe", name: "College of Accounting and Business Economics", pattern: /\(CABE\)/ },
  { id: "cte", name: "College of Teacher Education", pattern: /\(CTE\)/ },
  { id: "faculty", name: "Faculty / Non-Teaching Personnel", pattern: /Faculty|Non-Teaching/ },
  { id: "outside", name: "Outside Researchers", pattern: /Outside Researchers/ },
];

/**
 * Given program labels that have data (from summary), returns which college IDs have at least one updated program.
 */
export function getUpdatedColleges(summaryLabels: string[]): Set<string> {
  const updated = new Set<string>();
  for (const label of summaryLabels) {
    for (const college of COLLEGES) {
      if (college.pattern.test(label)) {
        updated.add(college.id);
        break;
      }
    }
  }
  return updated;
}
