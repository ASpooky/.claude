const path = require('path');
const fs = require('fs');
const { SESSIONS_DIR, ensureDir, getDateString, getTimeString, writeFile, replaceInFile, log } = require('../lib/utils');

ensureDir(SESSIONS_DIR);

const today = getDateString();
const sessionFile = path.join(SESSIONS_DIR, `${today}-session.tmp`);
const time = getTimeString();

if (fs.existsSync(sessionFile)) {
  replaceInFile(sessionFile, /\*\*Last Updated:\*\*.*/, `**Last Updated:** ${time}`);
  log(`[session] セッションファイルを更新: ${path.basename(sessionFile)}`);
} else {
  writeFile(sessionFile, `# Session: ${today}
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

process.exit(0);
