const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Build first to ensure generated files are fresh
console.log('Building...');
execSync('node build.js', { cwd: __dirname, stdio: 'inherit' });

const manifest = JSON.parse(
  fs.readFileSync(path.join(__dirname, 'extension/manifest.json'), 'utf-8')
);
const version = manifest.version;
const distDir = path.join(__dirname, 'dist');
const zipName = `yt-force-max-v${version}.zip`;
const zipPath = path.join(distDir, zipName);

// Clean and recreate dist/
fs.rmSync(distDir, { recursive: true, force: true });
fs.mkdirSync(distDir);

// Try 7z, fall back to zip
let cmd;
try {
  execSync('7z --help', { stdio: 'ignore' });
  cmd = `7z a -tzip "${zipPath}" ./*`;
} catch {
  try {
    execSync('zip --help', { stdio: 'ignore' });
    cmd = `zip -r "${zipPath}" .`;
  } catch {
    console.error('Error: neither 7z nor zip found. Install one and retry.');
    process.exit(1);
  }
}

execSync(cmd, { cwd: path.join(__dirname, 'extension'), stdio: 'inherit' });

console.log(`\nCreated ${zipName}`);
console.log(`\nUpload at:`);
console.log(`  Chrome: https://chrome.google.com/webstore/devconsole`);
console.log(`  Firefox: https://addons.mozilla.org/en-US/developers/addons`);
