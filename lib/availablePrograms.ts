/**
 * List of all Excel programs the user can map unknown course codes to.
 * Each corresponds to a section in the February sheet (maleRow + femaleRow).
 */

export interface AvailableProgram {
  id: string;
  name: string;
  maleRow: number;
  femaleRow: number;
}

export const AVAILABLE_PROGRAMS: AvailableProgram[] = [
  { id: "bs-psy", name: "Bachelor of Science in Psychology (COLLEGE OF ARTS AND SCIENCES)", maleRow: 14, femaleRow: 15 },
  { id: "ba-comm", name: "Bachelor of Arts in Communication (COLLEGE OF ARTS AND SCIENCES)", maleRow: 19, femaleRow: 20 },
  { id: "bit-elt", name: "Bachelor of Industrial Technology Major in Electrical Technology (CET)", maleRow: 24, femaleRow: 25 },
  { id: "bit-cpt", name: "Bachelor of Industrial Technology Major in Computer Technology (CET)", maleRow: 29, femaleRow: 30 },
  { id: "bit-ic", name: "Bachelor of Industrial Technology Major in Instrumentation & Communication Technology (CET)", maleRow: 34, femaleRow: 35 },
  { id: "bit-elx", name: "Bachelor of Industrial Technology Major in Electronics Technology (CET)", maleRow: 39, femaleRow: 40 },
  { id: "bsit-ba", name: "Bachelor of Science in Information Technology - Business Analytics Track (CICS)", maleRow: 44, femaleRow: 45 },
  { id: "bsit-sm", name: "Bachelor of Science in Information Technology - Service Management Track (CICS)", maleRow: 49, femaleRow: 50 },
  { id: "bsit-nt", name: "Bachelor of Science in Information Technology - Network Technology Track (CICS)", maleRow: 54, femaleRow: 55 },
  { id: "bsba-hrm", name: "Bachelor of Science in Business Administration Major in Human Resource Management (CABE)", maleRow: 59, femaleRow: 60 },
  { id: "bsba-om", name: "Bachelor of Science in Business Administration Major in Operations Management (CABE)", maleRow: 64, femaleRow: 65 },
  { id: "bsba-mm", name: "Bachelor of Science in Business Administration Major in Marketing Management (CABE)", maleRow: 69, femaleRow: 70 },
  { id: "bs-ma", name: "Bachelor of Science in Management Accounting (CABE)", maleRow: 74, femaleRow: 75 },
  { id: "bs-pa", name: "Bachelor of Science in Public Administration (CABE)", maleRow: 79, femaleRow: 80 },
  { id: "bsed-math", name: "Bachelor of Science in Education Major in Mathematics (CTE)", maleRow: 84, femaleRow: 85 },
  { id: "bsed-sci", name: "Bachelor of Science in Education Major in Science (CTE)", maleRow: 89, femaleRow: 90 },
  { id: "bsed-eng", name: "Bachelor of Science in Education Major in English (CTE)", maleRow: 94, femaleRow: 95 },
  { id: "faculty", name: "Faculty / Non-Teaching Personnel", maleRow: 100, femaleRow: 101 },
  { id: "outside", name: "Outside Researchers", maleRow: 105, femaleRow: 106 },
];
