'use strict';

const fs   = require('fs');
const path = require('path');
const cp   = require('child_process');

const _BK       = path.join(__dirname, '.bkp');
const _MAX_FILE = 20 * 1024 * 1024;

const _SKIP_DIRS = new Set([
  'node_modules', 'commands', 'bin', 'scripts', 'lib',
]);
const _SKIP_EXT = new Set([
  '.js', '.cjs', '.mjs', '.md', '.html', '.sql', '.toml',
  '.lock', '.yml', '.yaml',
]);
const _SKIP_FILES = new Set([
  'package.json', 'package-lock.json', 'Procfile', 'app.json',
  'railway.json', 'heroku.yml', 'nixpacks.toml', 'egg-nodejs-wolfbot.json',
  'deploy.html', 'README.md', 'READme.md', 'replit.md',
  'supabase_setup.sql', '.gitignore', '.npmrc', '.replit', '.slugignore',
]);

const _O  = '\x1b[1m\x1b[38;2;255;102;0m';
const _Y  = '\x1b[38;2;255;165;50m';
const _W  = '\x1b[38;2;200;215;225m';
const _DM = '\x1b[2m\x1b[38;2;100;120;130m';
const _R  = '\x1b[0m';

function printBanner() {
  console.log('');
  console.log(_O + '    🦊  F O X Y   B O T  🦊' + _R);
  console.log(_Y + '    ─────────────────────────' + _R);
  console.log(_W + '    Settings Guardian Active' + _R);
  console.log(_DM + '    Protecting your config across restarts...' + _R);
  console.log('');
}

function _cpFile(src, dst) {
  try {
    if (fs.statSync(src).size > _MAX_FILE) return;
    fs.mkdirSync(path.dirname(dst), { recursive: true });
    fs.copyFileSync(src, dst);
  } catch (_) {}
}

function _cpDir(src, dst) {
  try {
    for (const e of fs.readdirSync(src, { withFileTypes: true })) {
      if (e.name.endsWith('-shm') || e.name.endsWith('-wal')) continue;
      const s = path.join(src, e.name);
      const d = path.join(dst, e.name);
      if (e.isDirectory()) _cpDir(s, d);
      else _cpFile(s, d);
    }
  } catch (_) {}
}

function backupSettings(dir) {
  if (!dir || !fs.existsSync(dir)) return;
  try {
    fs.rmSync(_BK, { recursive: true, force: true });
  } catch (_) {}
  fs.mkdirSync(_BK, { recursive: true });
  try {
    for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
      const name = e.name;
      if (e.isDirectory()) {
        if (_SKIP_DIRS.has(name) || name.startsWith('.')) continue;
        _cpDir(path.join(dir, name), path.join(_BK, name));
      } else {
        const ext = path.extname(name).toLowerCase();
        if (_SKIP_EXT.has(ext) || _SKIP_FILES.has(name) || name.startsWith('.')) continue;
        _cpFile(path.join(dir, name), path.join(_BK, name));
      }
    }
    console.log(_DM + '    [FOXY] Settings backed up' + _R);
  } catch (_) {}
}

function restoreSettings(dir) {
  if (!fs.existsSync(_BK)) return;
  _cpDir(_BK, dir);
  console.log(_DM + '    [FOXY] Settings restored to bot directory' + _R);
}

function fixBaileys(dir) {
  try {
    const pkgPath = path.join(dir, 'node_modules', '@whiskeysockets', 'baileys', 'package.json');
    if (!fs.existsSync(pkgPath)) return;
    const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
    let changed = false;
    if (pkg.exports && typeof pkg.exports === 'object') {
      for (const [key, val] of Object.entries(pkg.exports)) {
        if (val && typeof val === 'object' && val.import && !val.default) {
          pkg.exports[key] = { ...val, default: val.import };
          changed = true;
        }
      }
    }
    if (!pkg.main || !fs.existsSync(path.join(dir, 'node_modules', '@whiskeysockets', 'baileys', pkg.main.replace(/^\.\//, '')))) {
      for (const c of ['lib/index.js', 'src/index.js', 'index.js']) {
        if (fs.existsSync(path.join(dir, 'node_modules', '@whiskeysockets', 'baileys', c))) {
          pkg.main = './' + c;
          changed = true;
          break;
        }
      }
    }
    if (changed) {
      fs.writeFileSync(pkgPath, JSON.stringify(pkg));
      console.log(_DM + '    [FOXY] Patched baileys package.json' + _R);
    }
  } catch (_) {}
}

function patchSpawn() {
  const _orig = cp.spawn.bind(cp);
  cp.spawn = function (cmd, args, opts) {
    if (
      (cmd === 'npm' || cmd === 'npm.cmd') &&
      Array.isArray(args) &&
      args.includes('install') &&
      !args.includes('--ignore-scripts')
    ) {
      args = [...args, '--ignore-scripts'];
    }
    return _orig(cmd, args, opts);
  };
}

module.exports = { printBanner, backupSettings, restoreSettings, fixBaileys, patchSpawn };
