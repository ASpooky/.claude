const { execSync } = require('child_process');
const fs = require('fs');

let data = '';
process.stdin.on('data', chunk => data += chunk);
process.stdin.on('end', () => {
  const input = JSON.parse(data);
  const cmd = input.tool_input?.command || '';

  if (!/git\s+commit/.test(cmd)) {
    process.stdout.write(data);
    return;
  }

  const issues = [];

  // staged ファイルのチェック
  try {
    const staged = execSync('git diff --cached --name-only', { encoding: 'utf8' });
    const files = staged.trim().split('\n').filter(Boolean);

    for (const f of files) {
      if (!/\.(ts|tsx|js|jsx|mjs|cjs)$/.test(f)) continue;
      if (!fs.existsSync(f)) continue;
      const content = fs.readFileSync(f, 'utf8');
      if (/console\.log/.test(content)) issues.push(`  console.log 残存: ${f}`);
      if (/\bTODO\b/.test(content))    issues.push(`  TODO 残存: ${f}`);
      if (/\bFIXME\b/.test(content))   issues.push(`  FIXME 残存: ${f}`);
    }
  } catch {}

  // TypeScript チェック（tsconfig.json がある場合のみ）
  if (fs.existsSync('tsconfig.json')) {
    try {
      execSync('npx tsc --noEmit 2>&1', { stdio: 'pipe' });
    } catch (e) {
      const errors = (e.stdout || '').split('\n')
        .filter(l => /error TS/.test(l))
        .slice(0, 5);
      errors.forEach(l => issues.push(`  TypeScript: ${l.trim()}`));
    }
  }

  if (issues.length) {
    console.error('[strict] コミット前に以下の問題を解消してください:');
    issues.forEach(i => console.error(i));
    process.exit(1);
  }

  process.stdout.write(data);
});
