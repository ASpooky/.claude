import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { randomUUID } from 'crypto';
import { insertFinding, queryFindings, DbFinding } from './db.js';
import { getFileHash } from './git.js';

function addDays(date: Date, days: number): Date {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

function decorate(f: DbFinding) {
  const now = new Date();
  const expired = new Date(f.expires_at) < now;
  const files: Array<{ path: string; git_hash: string; repo: string }> = JSON.parse(f.files);

  const staleFiles = files
    .filter(file => file.git_hash)
    .map(file => {
      const current = getFileHash(file.path);
      return current && current !== file.git_hash
        ? { path: file.path, repo: file.repo, stored_hash: file.git_hash, current_hash: current }
        : null;
    })
    .filter(Boolean);

  const stale = staleFiles.length > 0;

  return {
    id: f.id,
    timestamp: f.timestamp,
    expires_at: f.expires_at,
    repos: JSON.parse(f.repos),
    files,
    finding: f.finding,
    tags: JSON.parse(f.tags),
    expired,
    stale,
    ...(stale && {
      stale_warning: 'このfindingは記録後にファイルが変更されています。参考程度に参照してください。',
      stale_files: staleFiles,
    }),
  };
}

function text(s: string) {
  return { content: [{ type: 'text' as const, text: s }] };
}

export function registerTools(server: McpServer): void {
  server.registerTool(
    'add_finding',
    {
      description: 'バグ調査の発見をキャッシュに記録する',
      inputSchema: {
        repos: z.array(z.string()).describe('関連リポジトリ名'),
        files: z.array(z.object({
          path: z.string().describe('ファイルの絶対パス'),
          repo: z.string().describe('どのリポジトリのファイルか'),
        })).describe('対象ファイル（git hashは自動取得）'),
        finding: z.string().describe('調査結果の本文'),
        tags: z.array(z.string()).describe('検索用タグ'),
      },
    },
    async ({ repos, files, finding, tags }) => {
      const now = new Date();
      const record = {
        id: randomUUID(),
        timestamp: now.toISOString(),
        expires_at: addDays(now, 30).toISOString(),
        repos,
        files: files.map(f => ({ ...f, git_hash: getFileHash(f.path) })),
        finding,
        tags,
      };
      insertFinding(record);
      return text(`Finding recorded. ID: ${record.id}`);
    }
  );

  server.registerTool(
    'search_findings',
    {
      description: '過去の調査結果をタグ・リポジトリ名・全文で検索する（TTL切れも expired: true で返す）',
      inputSchema: {
        query: z.string().optional().describe('全文検索（finding本文 + タグ対象）'),
        repos: z.array(z.string()).optional().describe('リポジトリ名でフィルタ'),
        tags: z.array(z.string()).optional().describe('タグでフィルタ'),
      },
    },
    async ({ query, repos, tags }) => {
      const results = queryFindings(query, repos, tags, true);
      if (!results.length) return text('No findings found.');
      return text(JSON.stringify(results.map(decorate), null, 2));
    }
  );

  server.registerTool(
    'list_findings',
    {
      description: '調査結果の一覧を返す',
      inputSchema: {
        repos: z.array(z.string()).optional().describe('リポジトリ名でフィルタ'),
        include_expired: z.boolean().optional().default(false).describe('TTL切れを含めるか'),
        include_stale: z.boolean().optional().default(true).describe('staleなfindingを含めるか'),
      },
    },
    async ({ repos, include_expired, include_stale }) => {
      const results = queryFindings(undefined, repos, undefined, include_expired ?? false);
      let decorated = results.map(decorate);
      if (!include_stale) decorated = decorated.filter(f => !f.stale);
      if (!decorated.length) return text('No findings found.');
      return text(JSON.stringify(decorated, null, 2));
    }
  );
}
