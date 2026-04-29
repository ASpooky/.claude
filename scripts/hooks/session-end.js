const { spawnSync } = require('child_process');
const path = require('path');
const fs = require('fs');
const { SESSIONS_DIR, ensureDir, getDateString, getTimeString, writeFile, replaceInFile, log } = require('../lib/utils');

ensureDir(SESSIONS_DIR);

const today = getDateString();
const sessionFile = path.join(SESSIONS_DIR, `${today}-session.tmp`);
const time = getTimeString();

// Metadata
const branchResult = spawnSync('git', ['rev-parse', '--abbrev-ref', 'HEAD'], { encoding: 'utf8' });
const branch = branchResult.status === 0 ? branchResult.stdout.trim() : 'unknown';
const worktree = process.cwd();
const projectName = path.basename(
  (spawnSync('git', ['rev-parse', '--show-toplevel'], { encoding: 'utf8' }).stdout || '').trim() || worktree
);

let stdinData = '';
process.stdin.on('data', c => stdinData += c);
process.stdin.on('end', () => {
  if (fs.existsSync(sessionFile)) {
    let content = fs.readFileSync(sessionFile, 'utf8');
    const upsert = (src, pattern, line) => {
      if (pattern.test(src)) return src.replace(pattern, line);
      // Insert after **Started:** line if it exists, otherwise after the heading
      return src.replace(/(\*\*Started:\*\*.*)/, `$1\n${line}`);
    };
    content = content.replace(/\*\*Last Updated:\*\*.*/, `**Last Updated:** ${time}`);
    content = upsert(content, /\*\*Branch:\*\*.*/, `**Branch:** ${branch}`);
    content = upsert(content, /\*\*Worktree:\*\*.*/, `**Worktree:** ${worktree}`);
    fs.writeFileSync(sessionFile, content, 'utf8');
    log(`[session] セッションファイルを更新: ${path.basename(sessionFile)}`);
  } else {
    writeFile(sessionFile, `# Session: ${today}
**Project:** ${projectName}
**Branch:** ${branch}
**Worktree:** ${worktree}
**Started:** ${time}
**Last Updated:** ${time}

---

## 進捗

### 完了
-

### 進行中
-

### 次回への申し送り
-
`);
    log(`[session] セッションファイルを作成: ${path.basename(sessionFile)}`);
  }

  process.stdout.write(stdinData);
});
