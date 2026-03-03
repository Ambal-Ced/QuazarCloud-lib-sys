import path from "path";
import fs from "fs";

export interface Commit {
  id: string;
  timestamp: string; // ISO string
  pastedData: string;
}

const COMMIT_HISTORY_FILE = path.join(process.cwd(), "data", "commit_history.json");

function ensureDataDir(): void {
  const dataDir = path.join(process.cwd(), "data");
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }
}

export function loadCommits(): Commit[] {
  try {
    if (fs.existsSync(COMMIT_HISTORY_FILE)) {
      const raw = fs.readFileSync(COMMIT_HISTORY_FILE, "utf-8");
      const data = JSON.parse(raw);
      const list = Array.isArray(data.commits) ? data.commits : [];
      return list.filter(
        (c: unknown): c is Commit =>
          typeof c === "object" &&
          c !== null &&
          typeof (c as Commit).id === "string" &&
          typeof (c as Commit).timestamp === "string" &&
          typeof (c as Commit).pastedData === "string"
      );
    }
  } catch {
    /* ignore */
  }
  return [];
}

export function saveCommits(commits: Commit[]): void {
  ensureDataDir();
  fs.writeFileSync(
    COMMIT_HISTORY_FILE,
    JSON.stringify({ commits }, null, 2),
    "utf-8"
  );
}

export function addCommit(pastedData: string): Commit {
  const commits = loadCommits();
  const commit: Commit = {
    id: crypto.randomUUID(),
    timestamp: new Date().toISOString(),
    pastedData,
  };
  commits.push(commit);
  saveCommits(commits);
  return commit;
}

export function removeCommit(id: string): Commit[] {
  const commits = loadCommits().filter((c) => c.id !== id);
  saveCommits(commits);
  return commits;
}

export function clearCommits(): void {
  saveCommits([]);
}
