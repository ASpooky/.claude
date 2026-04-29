const fs = require('fs');

let data = '';
process.stdin.on('data', c => data += c);
process.stdin.on('end', () => {
  const input = JSON.parse(data);
  const filePath = input.tool_input?.file_path || '';

  if (/\.(ts|tsx|js|jsx|mjs|cjs)$/.test(filePath) && fs.existsSync(filePath)) {
    const lines = fs.readFileSync(filePath, 'utf8').split('\n');
    const hits = lines
      .map((text, i) => ({ line: i + 1, text }))
      .filter(({ text }) => /console\.log/.test(text));

    if (hits.length) {
      process.stderr.write(`[warn] console.log in ${filePath}:\n`);
      hits.slice(0, 5).forEach(({ line, text }) =>
        process.stderr.write(`  ${line}: ${text.trim()}\n`)
      );
    }
  }

  process.stdout.write(data);
});
