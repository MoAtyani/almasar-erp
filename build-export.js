const { execSync, spawnSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const apiDir = path.join(__dirname, 'src', 'app', 'api');
const backupDir = path.join(__dirname, '__api_backup');

// Benign stderr patterns that must NOT cause a non-zero exit
const BENIGN_STDERR = [
  /Node\.js \d+ and below are deprecated/,
  /Please upgrade to Node\.js/,
  /supabase\/supabase-js/,
  /supabase\/discussions/,
  /Wrangler.*out-of-date/,
  /Please update to the latest version/,
  /Run `npm install.*wrangler/,
  /After installation, run Wrangler/,
];

function isBenign(line) {
  return BENIGN_STDERR.some(re => re.test(line));
}

/**
 * Run a command, forward stdout/stderr to our process, but suppress benign
 * warning lines from stderr so PowerShell does not treat them as errors.
 * Throws if the child exits with a non-zero code.
 */
function runFiltered(cmd, args) {
  const result = spawnSync(cmd, args, {
    stdio: ['inherit', 'inherit', 'pipe'],
    shell: true,
    encoding: 'utf8',
  });

  // Print stderr, skipping known-benign lines
  if (result.stderr) {
    const lines = result.stderr.split(/\r?\n/);
    for (const line of lines) {
      if (line.trim() && !isBenign(line)) {
        process.stderr.write(line + '\n');
      }
    }
  }

  if (result.status !== 0) {
    throw new Error(`Command failed with exit code ${result.status}: ${cmd} ${args.join(' ')}`);
  }
}

function copyDirSync(src, dest) {
  fs.mkdirSync(dest, { recursive: true });
  for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
    const s = path.join(src, entry.name);
    const d = path.join(dest, entry.name);
    if (entry.isDirectory()) copyDirSync(s, d);
    else fs.copyFileSync(s, d);
  }
}

function deleteDirSync(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, entry.name);
    if (entry.isDirectory()) deleteDirSync(p);
    else fs.unlinkSync(p);
  }
  fs.rmdirSync(dir);
}

let backed = false;
function restore() {
  if (backed && fs.existsSync(backupDir)) {
    if (!fs.existsSync(apiDir)) {
      copyDirSync(backupDir, apiDir);
    }
    deleteDirSync(backupDir);
    console.log('Restored src/app/api');
    backed = false;
  }
}

process.on('exit', restore);
process.on('SIGINT', () => { restore(); process.exit(1); });
process.on('uncaughtException', (err) => {
  console.error('Build error:', err);
  restore();
  process.exit(1);
});

try {
  if (fs.existsSync(apiDir)) {
    console.log('Backing up src/app/api...');
    copyDirSync(apiDir, backupDir);
    backed = true;
    deleteDirSync(apiDir);
    console.log('Removed src/app/api temporarily for static export');
  }
  console.log('Running next build...');
  // Use inherit for stdout so build progress prints live; filter stderr
  runFiltered('npx', ['next', 'build']);
  console.log('Build complete.');
} finally {
  restore();
}
