const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const apiDir = path.join(__dirname, 'src', 'app', 'api');
const backupDir = path.join(__dirname, '__api_backup');

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
  console.log('Running npx next build...');
  execSync('npx next build', { stdio: 'inherit' });
} finally {
  restore();
}
