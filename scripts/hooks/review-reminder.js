const { execSync } = require('child_process');

let data = '';
process.stdin.on('data', chunk => data += chunk);
process.stdin.on('end', () => {
  try {
    const modified = execSync('git diff --name-only HEAD 2>/dev/null', { encoding: 'utf8' });
    if (modified.trim()) {
      const files = modified.trim().split('\n').filter(Boolean);
      console.error(`[review] ${files.length} ファイルに変更があります。/review でレビューを実行することを検討してください。`);
    }
  } catch {}

  process.stdout.write(data);
});
