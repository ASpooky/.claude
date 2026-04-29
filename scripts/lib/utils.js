const path = require('path');
const fs = require('fs');
const os = require('os');

const CLAUDE_DIR = path.join(os.homedir(), '.claude');
const SESSIONS_DIR = path.join(CLAUDE_DIR, 'sessions');
const LEARNED_SKILLS_DIR = path.join(CLAUDE_DIR, 'skills', 'learned');

const ensureDir = (dir) => { if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true }); };
const log = (msg) => process.stderr.write(msg + '\n');
const readFile = (p) => { try { return fs.readFileSync(p, 'utf8'); } catch { return null; } };
const writeFile = (p, c) => fs.writeFileSync(p, c, 'utf8');
const appendFile = (p, c) => fs.appendFileSync(p, c, 'utf8');
const replaceInFile = (p, pattern, replacement) => {
  const c = readFile(p);
  if (!c) return false;
  writeFile(p, c.replace(pattern, replacement));
  return true;
};

const getDateString = () => new Date().toISOString().slice(0, 10);
const getTimeString = () => new Date().toLocaleTimeString('ja-JP');
const getDateTimeString = () => new Date().toISOString().replace('T', ' ').slice(0, 19);

const findFiles = (dir, pattern, opts = {}) => {
  if (!fs.existsSync(dir)) return [];
  const re = new RegExp('^' + pattern.replace('.', '\\.').replace('*', '.*') + '$');
  const now = Date.now();
  return fs.readdirSync(dir)
    .filter(f => re.test(f))
    .map(f => ({ path: path.join(dir, f), mtime: fs.statSync(path.join(dir, f)).mtimeMs }))
    .filter(f => !opts.maxAge || (now - f.mtime) < opts.maxAge * 86400000)
    .sort((a, b) => b.mtime - a.mtime);
};

const countInFile = (filePath, pattern) => {
  const c = readFile(filePath);
  return c ? (c.match(pattern) || []).length : 0;
};

module.exports = {
  CLAUDE_DIR, SESSIONS_DIR, LEARNED_SKILLS_DIR,
  ensureDir, log, readFile, writeFile, appendFile, replaceInFile,
  getDateString, getTimeString, getDateTimeString,
  findFiles, countInFile,
};
