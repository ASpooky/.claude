const { spawnSync } = require('child_process');
const fs = require('fs');
const path = require('path');

let data = '';
process.stdin.on('data', c => data += c);
process.stdin.on('end', () => {
  const input = JSON.parse(data);
  const filePath = input.tool_input?.file_path || '';

  if (!/\.(ts|tsx)$/.test(filePath) || !fs.existsSync(filePath)) {
    process.stdout.write(data);
    return;
  }

  // tsconfig.json をファイルから上向きに探す
  let dir = path.dirname(path.resolve(filePath));
  while (dir !== path.dirname(dir)) {
    if (fs.existsSync(path.join(dir, 'tsconfig.json'))) break;
    dir = path.dirname(dir);
  }
  if (!fs.existsSync(path.join(dir, 'tsconfig.json'))) {
    process.stdout.write(data);
    return;
  }

  const result = spawnSync('npx', ['tsc', '--noEmit'], { cwd: dir, encoding: 'utf8' });
  if (result.status !== 0) {
    const errors = result.stderr.split('\n')
      .filter(l => l.includes(path.basename(filePath)) && /error TS/.test(l))
      .slice(0, 5);
    if (errors.length) process.stderr.write(errors.join('\n') + '\n');
  }

  process.stdout.write(data);
});
