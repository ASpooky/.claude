const path = require('path');
const { SESSIONS_DIR, LEARNED_SKILLS_DIR, ensureDir, findFiles, log } = require('../lib/utils');

ensureDir(SESSIONS_DIR);
ensureDir(LEARNED_SKILLS_DIR);

const recent = findFiles(SESSIONS_DIR, '*.tmp', { maxAge: 7 });
if (recent.length > 0) {
  log(`[session] 直近のセッション ${recent.length} 件 — 最新: ${path.basename(recent[0].path)}`);
}

const skills = findFiles(LEARNED_SKILLS_DIR, '*.md');
if (skills.length > 0) {
  log(`[session] 学習済みスキル ${skills.length} 件: ${LEARNED_SKILLS_DIR}`);
}

process.exit(0);
