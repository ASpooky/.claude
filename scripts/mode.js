#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const os = require('os');
const crypto = require('crypto');
const { spawnSync } = require('child_process');

const CLAUDE_DIR = path.join(os.homedir(), '.claude');
const PROFILES_DIR = path.join(CLAUDE_DIR, 'profiles');

// プロジェクトの .claude/ があればそこ、なければグローバルにフォールバック
function resolveLocalDir() {
  const gitRoot = spawnSync('git', ['rev-parse', '--show-toplevel'], { encoding: 'utf8' });
  if (gitRoot.status === 0) {
    const root = gitRoot.stdout.trim();
    // ~/.claude is the global config dir itself — don't nest .claude inside it
    if (path.resolve(root) === path.resolve(CLAUDE_DIR)) return CLAUDE_DIR;
    const projectClaudeDir = path.join(root, '.claude');
    if (!fs.existsSync(projectClaudeDir)) fs.mkdirSync(projectClaudeDir, { recursive: true });
    return projectClaudeDir;
  }
  return CLAUDE_DIR;
}

const LOCAL_DIR = resolveLocalDir();
const ACTIVE_FILE = path.join(LOCAL_DIR, '.active-modes.json');
const SETTINGS_LOCAL = path.join(LOCAL_DIR, 'settings.local.json');

const readJSON = (p, def = {}) => { try { return JSON.parse(fs.readFileSync(p, 'utf8')); } catch { return def; } };
const writeJSON = (p, d) => fs.writeFileSync(p, JSON.stringify(d, null, 2) + '\n');

function listProfiles() {
  return fs.readdirSync(PROFILES_DIR).filter(f => f.endsWith('.json')).map(f => f.replace('.json', ''));
}

function mergeProfiles(active) {
  const merged = {};
  for (const name of active) {
    const p = readJSON(path.join(PROFILES_DIR, `${name}.json`));
    // hooks: concatenate per event
    for (const [event, hooks] of Object.entries(p.hooks || {})) {
      merged.hooks ??= {};
      merged.hooks[event] = [...(merged.hooks[event] ?? []), ...hooks];
    }
    // permissions: concatenate allow/deny
    for (const key of ['allow', 'deny']) {
      if (p.permissions?.[key]) {
        merged.permissions ??= {};
        merged.permissions[key] = [...(merged.permissions[key] ?? []), ...p.permissions[key]];
      }
    }
    // mcpServers: last wins
    if (p.mcpServers) merged.mcpServers = { ...merged.mcpServers, ...p.mcpServers };
  }
  return merged;
}

function apply(active) {
  writeJSON(ACTIVE_FILE, active);
  writeJSON(SETTINGS_LOCAL, mergeProfiles(active));
  console.log(`active: [${active.join(', ') || 'none'}]`);
  console.log(`→ ${SETTINGS_LOCAL} を更新しました`);
}

const [flag, name] = process.argv.slice(2);

// list
if (!flag || flag === 'list') {
  const active = readJSON(ACTIVE_FILE, []);
  console.log(`active: [${active.join(', ') || 'none'}]\n`);
  for (const n of listProfiles()) {
    const desc = readJSON(path.join(PROFILES_DIR, `${n}.json`)).description ?? '';
    const mark = active.includes(n) ? ' ✓' : '  ';
    console.log(`${mark} ${n.padEnd(12)} ${desc}`);
  }
  process.exit(0);
}

// --reviewed: レビュー済みフラグをカレントリポジトリに立てる
if (flag === '--reviewed') {
  const gitRoot = spawnSync('git', ['rev-parse', '--show-toplevel'], { encoding: 'utf8' });
  if (gitRoot.status !== 0) {
    console.error('git リポジトリが見つかりません');
    process.exit(1);
  }
  const repoHash = crypto.createHash('md5').update(gitRoot.stdout.trim()).digest('hex').slice(0, 8);
  const sessionsDir = path.join(CLAUDE_DIR, 'sessions');
  if (!fs.existsSync(sessionsDir)) fs.mkdirSync(sessionsDir, { recursive: true });
  const flagFile = path.join(sessionsDir, `review-cleared-${repoHash}.flag`);
  fs.writeFileSync(flagFile, new Date().toISOString());
  console.log(`review 済みフラグを設定しました (${path.basename(gitRoot.stdout.trim())})`);
  process.exit(0);
}

if (!['--preset', '--add', '--delete'].includes(flag)) {
  console.error(`unknown flag: ${flag}`);
  process.exit(1);
}

if (!name) {
  console.error(`${flag} requires a profile name`);
  process.exit(1);
}

if (flag !== '--delete' && !fs.existsSync(path.join(PROFILES_DIR, `${name}.json`))) {
  console.error(`profile not found: ${name}`);
  console.error(`available: ${listProfiles().join(', ')}`);
  process.exit(1);
}

let active = readJSON(ACTIVE_FILE, []);

if (flag === '--preset')      active = [name];
else if (flag === '--add')    active = active.includes(name) ? active : [...active, name];
else if (flag === '--delete') active = active.filter(m => m !== name);

apply(active);

// コンテキストファイルの適用を Claude に促す
const ctx = path.join(CLAUDE_DIR, 'contexts', `${name}.md`);
if (flag === '--add' && fs.existsSync(ctx)) {
  console.log(`\ncontext: ~/.claude/contexts/${name}.md を読み込んでセッションに適用してください`);
}
