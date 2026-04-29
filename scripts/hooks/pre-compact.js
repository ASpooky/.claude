const path = require('path');
const { SESSIONS_DIR, ensureDir, getDateTimeString, getTimeString, findFiles, appendFile, log } = require('../lib/utils');

ensureDir(SESSIONS_DIR);

const compactionLog = path.join(SESSIONS_DIR, 'compaction-log.txt');
appendFile(compactionLog, `[${getDateTimeString()}] Context compaction triggered\n`);

const sessions = findFiles(SESSIONS_DIR, '*.tmp');
if (sessions.length > 0) {
  appendFile(sessions[0].path, `\n---\n**[Compaction: ${getTimeString()}]** コンテキストが圧縮されました\n`);
}

log('[pre-compact] 圧縮前の状態を保存しました');
process.exit(0);
