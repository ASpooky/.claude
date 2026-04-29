const fs = require('fs');
const { LEARNED_SKILLS_DIR, ensureDir, countInFile, log } = require('../lib/utils');

const MIN_MESSAGES = 10;

ensureDir(LEARNED_SKILLS_DIR);

const transcriptPath = process.env.CLAUDE_TRANSCRIPT_PATH;
if (!transcriptPath || !fs.existsSync(transcriptPath)) {
  process.exit(0);
}

const messageCount = countInFile(transcriptPath, /"type":"user"/g);
if (messageCount < MIN_MESSAGES) {
  log(`[evaluate] セッション短 (${messageCount} メッセージ) — スキップ`);
  process.exit(0);
}

log(`[evaluate] ${messageCount} メッセージのセッション — /retrospective でパターン抽出を検討してください`);
log(`[evaluate] 学習済みスキル保存先: ${LEARNED_SKILLS_DIR}`);

process.exit(0);
