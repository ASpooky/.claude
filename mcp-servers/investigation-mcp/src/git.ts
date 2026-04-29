import { execFileSync } from 'child_process';
import { dirname } from 'path';

const GIT_OPTS = { encoding: 'utf8' as const, stdio: ['pipe', 'pipe', 'pipe'] as ['pipe', 'pipe', 'pipe'] };

export function getRepoRoot(filePath: string): string | null {
  try {
    return execFileSync('git', ['-C', dirname(filePath), 'rev-parse', '--show-toplevel'], GIT_OPTS).trim();
  } catch {
    return null;
  }
}

export function getFileHash(filePath: string): string {
  try {
    const root = getRepoRoot(filePath);
    if (!root) return '';
    const rel = filePath.replace(root, '').replace(/^[/\\]/, '');
    return execFileSync('git', ['-C', root, 'log', '-1', '--format=%H', '--', rel], GIT_OPTS).trim();
  } catch {
    return '';
  }
}
