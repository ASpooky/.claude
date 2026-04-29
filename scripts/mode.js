#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const os = require('os');

const CLAUDE_DIR = path.join(os.homedir(), '.claude');
const PROFILES_DIR = path.join(CLAUDE_DIR, 'profiles');
const ACTIVE_FILE = path.join(CLAUDE_DIR, '.active-modes.json');
const SETTINGS_LOCAL = path.join(CLAUDE_DIR, 'settings.local.json');

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
  console.log(`→ ~/.claude/settings.local.json を更新しました`);
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
