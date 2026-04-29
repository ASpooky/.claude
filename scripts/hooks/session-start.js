const { spawnSync } = require('child_process');
const path = require('path');
const { SESSIONS_DIR, LEARNED_SKILLS_DIR, ensureDir, findFiles, readFile, log } = require('../lib/utils');

ensureDir(SESSIONS_DIR);
ensureDir(LEARNED_SKILLS_DIR);

const contextParts = [];

// Git repo detection + session branch
const gitRoot = spawnSync('git', ['rev-parse', '--show-toplevel'], { encoding: 'utf8' });
if (gitRoot.status === 0) {
  const currentBranch = spawnSync('git', ['rev-parse', '--abbrev-ref', 'HEAD'], { encoding: 'utf8' });
  const branch = currentBranch.status === 0 ? currentBranch.stdout.trim() : '';

  if (branch.startsWith('claude/session-')) {
    // Already on a session branch — resume
    contextParts.push(`このセッションは git branch \`${branch}\` で作業を再開します。`);
  } else {
    const statusResult = spawnSync('git', ['status', '--porcelain'], { encoding: 'utf8' });
    const isClean = statusResult.status === 0 && !statusResult.stdout.trim();

    if (isClean) {
      const now = new Date();
      const pad = (n) => String(n).padStart(2, '0');
      const ts = `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}-${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}`;
      const newBranch = `claude/session-${ts}`;
      const switchResult = spawnSync('git', ['checkout', '-b', newBranch], { encoding: 'utf8' });
      if (switchResult.status === 0) {
        log(`[session] ブランチを作成: ${newBranch}`);
        contextParts.push(`このセッションは git branch \`${newBranch}\` で作業します。作業完了後は PR を作成するか merge してください。`);
      } else {
        log(`[session] ブランチ作成失敗: ${switchResult.stderr.trim()}`);
      }
    } else {
      // Dirty working tree — don't switch, just report
      log(`[session] 未コミットの変更があるためブランチを切り替えません (${branch})`);
      contextParts.push(`このセッションは git branch \`${branch}\` で作業します（未コミットの変更あり）。`);
    }
  }
}

// Load most recent session as context
const recent = findFiles(SESSIONS_DIR, '*.tmp', { maxAge: 7 });
if (recent.length > 0) {
  log(`[session] 直近のセッション ${recent.length} 件 — 最新: ${path.basename(recent[0].path)}`);

  // Find best matching session: prefer same worktree (cwd)
  const cwd = process.cwd();
  let bestSession = null;
  for (const s of recent) {
    const content = readFile(s.path);
    if (!content) continue;
    const worktreeMatch = content.match(/\*\*Worktree:\*\*\s*(.+)$/m);
    if (worktreeMatch && worktreeMatch[1].trim() === cwd) {
      bestSession = { ...s, content };
      break;
    }
    if (!bestSession) bestSession = { ...s, content };
  }

  if (bestSession && bestSession.content && !bestSession.content.includes('[前回セッション情報]')) {
    contextParts.push(`前回のセッション (${path.basename(bestSession.path)}):\n\n${bestSession.content}`);
  }
}

const skills = findFiles(LEARNED_SKILLS_DIR, '*.md');
if (skills.length > 0) {
  log(`[session] 学習済みスキル ${skills.length} 件`);
}

const additionalContext = contextParts.join('\n\n');
if (additionalContext) {
  process.stdout.write(JSON.stringify({
    hookSpecificOutput: {
      hookEventName: 'SessionStart',
      additionalContext,
    },
  }));
} else {
  process.exit(0);
}
