import Database from 'better-sqlite3';
import { join } from 'path';
import { homedir } from 'os';
import { mkdirSync } from 'fs';

const dataDir = join(homedir(), '.investigation-mcp', 'data');
mkdirSync(dataDir, { recursive: true });

export const db = new Database(join(dataDir, 'findings.db'));
db.pragma('journal_mode = WAL');
db.pragma('busy_timeout = 5000');

db.exec(`
  CREATE TABLE IF NOT EXISTS findings (
    id TEXT PRIMARY KEY,
    timestamp TEXT NOT NULL,
    expires_at TEXT NOT NULL,
    repos TEXT NOT NULL,
    files TEXT NOT NULL,
    finding TEXT NOT NULL,
    tags TEXT NOT NULL
  );
  CREATE INDEX IF NOT EXISTS idx_expires_at ON findings(expires_at);
  CREATE INDEX IF NOT EXISTS idx_repos ON findings(repos);
`);

export interface DbFinding {
  id: string;
  timestamp: string;
  expires_at: string;
  repos: string;
  files: string;
  finding: string;
  tags: string;
}

export function insertFinding(f: {
  id: string;
  timestamp: string;
  expires_at: string;
  repos: string[];
  files: Array<{ path: string; git_hash: string; repo: string }>;
  finding: string;
  tags: string[];
}): void {
  db.prepare(`
    INSERT INTO findings (id, timestamp, expires_at, repos, files, finding, tags)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(f.id, f.timestamp, f.expires_at, JSON.stringify(f.repos), JSON.stringify(f.files), f.finding, JSON.stringify(f.tags));
}

export function queryFindings(query?: string, repos?: string[], tags?: string[], includeExpired = true): DbFinding[] {
  let sql = 'SELECT * FROM findings WHERE 1=1';
  const params: unknown[] = [];

  if (!includeExpired) {
    sql += ' AND expires_at > ?';
    params.push(new Date().toISOString());
  }
  if (query) {
    sql += ' AND (finding LIKE ? OR tags LIKE ?)';
    params.push(`%${query}%`, `%${query}%`);
  }
  if (repos?.length) {
    sql += ` AND (${repos.map(() => 'repos LIKE ?').join(' OR ')})`;
    repos.forEach(r => params.push(`%${r}%`));
  }
  if (tags?.length) {
    sql += ` AND (${tags.map(() => 'tags LIKE ?').join(' AND ')})`;
    tags.forEach(t => params.push(`%"${t}"%`));
  }

  sql += ' ORDER BY timestamp DESC';
  return db.prepare(sql).all(...params) as DbFinding[];
}
