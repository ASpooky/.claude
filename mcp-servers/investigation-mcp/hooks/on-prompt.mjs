import Database from 'better-sqlite3';
import { join } from 'path';
import { homedir } from 'os';

const dbPath = join(homedir(), '.investigation-mcp', 'data', 'findings.db');

try {
  const db = new Database(dbPath, { readonly: true });
  const now = new Date().toISOString();

  const total = db.prepare(
    'SELECT COUNT(*) as count FROM findings WHERE expires_at > ?'
  ).get(now).count;

  if (total > 0) {
    process.stdout.write(
      `[Investigation Cache] ${total}件のfindingがキャッシュされています。` +
      `関連する調査を始める前に search_findings で確認してください。\n`
    );
  }

  db.close();
} catch {
  // DB未作成またはアクセス不可 — 無視
}
