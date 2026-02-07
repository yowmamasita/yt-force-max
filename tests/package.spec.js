// @ts-check
const { test, expect } = require('@playwright/test');
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const DIST = path.join(ROOT, 'dist');
const manifest = JSON.parse(
  fs.readFileSync(path.join(ROOT, 'extension/manifest.json'), 'utf-8')
);

test.describe('Package process', () => {
  let zipName;
  let zipPath;
  let fileList;

  test.beforeAll(() => {
    execSync('node package.js', { cwd: ROOT, stdio: 'pipe' });
    zipName = `yt-force-max-v${manifest.version}.zip`;
    zipPath = path.join(DIST, zipName);

    // List zip contents — try 7z, fall back to unzip
    let raw;
    try {
      raw = execSync(`7z l "${zipPath}"`, { encoding: 'utf-8' });
      // 7z output: parse filenames from the table (lines after "---" header)
      const lines = raw.split('\n');
      const sepIndices = [];
      lines.forEach((l, i) => { if (/^-{5,}/.test(l.trim())) sepIndices.push(i); });
      if (sepIndices.length >= 2) {
        fileList = lines
          .slice(sepIndices[0] + 1, sepIndices[1])
          .map((l) => l.trim().split(/\s+/).pop())
          .filter(Boolean);
      } else {
        fileList = [];
      }
    } catch {
      raw = execSync(`unzip -l "${zipPath}"`, { encoding: 'utf-8' });
      // unzip -l output: "  Length  Date  Time  Name" — name is last column
      fileList = raw
        .split('\n')
        .filter((l) => /^\s*\d+/.test(l) && !l.includes('----'))
        .map((l) => l.trim().split(/\s+/).slice(3).join(' '))
        .filter(Boolean);
    }
  });

  test('zip created in dist/ with correct name', () => {
    expect(fs.existsSync(zipPath), 'zip file exists').toBe(true);
    expect(zipName).toContain(manifest.version);
  });

  test('contains required files', () => {
    const required = [
      'manifest.json',
      'popup/popup.html',
      'popup/popup.js',
      'src/content-script.js',
      'src/page-script.js',
    ];
    for (const req of required) {
      const found = fileList.some((f) => f.includes(req) || f.endsWith(req));
      expect(found, `zip contains ${req}`).toBe(true);
    }
  });

  test('contains icon files', () => {
    const icons = ['icon16.png', 'icon48.png', 'icon128.png'];
    for (const icon of icons) {
      const found = fileList.some((f) => f.includes(icon));
      expect(found, `zip contains ${icon}`).toBe(true);
    }
  });

  test('no dev files in zip', () => {
    const devPatterns = ['node_modules', '.spec.js', 'test-results', '.git'];
    for (const pattern of devPatterns) {
      const found = fileList.some((f) => f.includes(pattern));
      expect(found, `zip should not contain ${pattern}`).toBe(false);
    }
  });
});
