const { spawnSync } = require('child_process');

let data = '';
process.stdin.on('data', chunk => data += chunk);
process.stdin.on('end', () => {
  const result = spawnSync('git', ['diff', '--name-only', 'HEAD'], { encoding: 'utf8' });
  if (result.status === 0 && result.stdout.trim()) {
    const files = result.stdout.trim().split('\n').filter(Boolean);
    process.stderr.write(`[review] ${files.length} ファイルに変更があります。/review でレビューを実行することを検討してください。\n`);
  }

  process.stdout.write(data);
});
