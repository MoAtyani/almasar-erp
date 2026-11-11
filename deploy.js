/**
 * deploy.js — Single-script build + Cloudflare Workers deploy
 *
 * Runs: node build-export.js  then  wrangler deploy
 * Avoids PowerShell's && operator which breaks when any stderr is written,
 * even for benign deprecation warnings from supabase/wrangler.
 */
const { spawnSync } = require('child_process');
const path = require('path');

// Same benign patterns as build-export.js
const BENIGN_STDERR = [
  /Node\.js \d+ and below are deprecated/,
  /Please upgrade to Node\.js/,
  /supabase\/supabase-js/,
  /supabase\/discussions/,
  /Wrangler.*out-of-date/,
  /Please update to the latest version/,
  /Run `npm install.*wrangler/,
  /After installation, run Wrangler/,
  /update available/,
];

function isBenign(line) {
  return BENIGN_STDERR.some(re => re.test(line));
}

function runFiltered(cmd, args, label) {
  console.log(`\n▶  ${label}`);
  console.log(`   ${cmd} ${args.join(' ')}\n`);

  const result = spawnSync(cmd, args, {
    stdio: ['inherit', 'inherit', 'pipe'],
    shell: process.platform === 'win32',
    encoding: 'utf8',
    cwd: __dirname,
  });

  if (result.stderr) {
    for (const line of result.stderr.split(/\r?\n/)) {
      if (line.trim() && !isBenign(line)) {
        process.stderr.write(line + '\n');
      }
    }
  }

  if (result.status !== 0) {
    console.error(`\n✗  ${label} failed (exit ${result.status})`);
    process.exit(result.status || 1);
  }

  console.log(`\n✓  ${label} succeeded`);
}

// Step 1: Static export (build-export.js already handles api backup/restore)
runFiltered('node', ['build-export.js'], 'Next.js static export');

// Step 2: Wrangler deploy
runFiltered('npx', ['wrangler', 'deploy'], 'Cloudflare Workers deploy');

console.log('\n🚀  Deployment complete!');
