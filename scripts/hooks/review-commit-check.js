const { spawnSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const os = require('os');
const crypto = require('crypto');

let data = '';
process.stdin.on('data', c => data += c);
process.stdin.on('end', () => {
  const input = JSON.parse(data);
  const cmd = input.tool_input?.command || '';

  if (!/git\s+commit/.test(cmd)) {
    process.stdout.write(data);
    return;
  }

  const gitRoot = spawnSync('git', ['rev-parse', '--show-toplevel'], { encoding: 'utf8' });
  if (gitRoot.status !== 0) {
    process.stdout.write(data);
    return;
  }

  const repoHash = crypto.createHash('md5').update(gitRoot.stdout.trim()).digest('hex').slice(0, 8);
  const flagFile = path.join(os.homedir(), '.claude', 'sessions', `review-cleared-${repoHash}.flag`);

  if (!fs.existsSync(flagFile)) {
    process.stderr.write('[review] レビューが未実施です。\n');
    process.stderr.write('[review] /review を実行してから /mode --reviewed でフラグを立ててください。\n');
    process.exit(1);
  }

  // フラグを消費してコミットを通す
  fs.unlinkSync(flagFile);
  process.stdout.write(data);
});
