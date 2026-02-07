const os = require('os');
const { execSync } = require('child_process');

if (os.platform() !== 'darwin') {
  console.error('Error: Safari extension conversion requires macOS with Xcode.');
  process.exit(1);
}

console.log('Building...');
execSync('node build.js', { cwd: __dirname, stdio: 'inherit' });

execSync(
  'xcrun safari-web-extension-converter extension/ --project-location dist/safari --no-open',
  { cwd: __dirname, stdio: 'inherit' }
);

console.log('\nSafari Xcode project created at dist/safari/');
console.log('Open it in Xcode to build and run.');
