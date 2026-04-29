const { spawnSync } = require('child_process');
const fs = require('fs');

let data = '';
process.stdin.on('data', c => data += c);
process.stdin.on('end', () => {
  const input = JSON.parse(data);
  const filePath = input.tool_input?.file_path || '';

  if (/\.(ts|tsx|js|jsx|mjs|cjs)$/.test(filePath) && fs.existsSync(filePath)) {
    spawnSync('npx', ['prettier', '--write', filePath], { stdio: 'pipe', shell: true });
  }

  process.stdout.write(data);
});
