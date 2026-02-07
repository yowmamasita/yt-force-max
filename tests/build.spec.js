// @ts-check
const { test, expect } = require('@playwright/test');
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const USERSCRIPT = path.join(ROOT, 'yt-force-max.user.js');
const PAGE_SCRIPT = path.join(ROOT, 'extension/src/page-script.js');

test.describe('Build process', () => {
  test.beforeAll(() => {
    execSync('node build.js', { cwd: ROOT, stdio: 'pipe' });
  });

  test('produces both output files and they are non-empty', () => {
    for (const f of [USERSCRIPT, PAGE_SCRIPT]) {
      expect(fs.existsSync(f), `${path.basename(f)} exists`).toBe(true);
      const stat = fs.statSync(f);
      expect(stat.size).toBeGreaterThan(0);
    }
  });

  test('output files contain core.js content', () => {
    const markers = ['ITAG_DB', 'createYTForceMax', 'QUALITY_LABELS'];
    for (const f of [USERSCRIPT, PAGE_SCRIPT]) {
      const content = fs.readFileSync(f, 'utf-8');
      for (const marker of markers) {
        expect(content, `${path.basename(f)} contains ${marker}`).toContain(marker);
      }
    }
  });

  test('no residual @include core.js marker in output', () => {
    for (const f of [USERSCRIPT, PAGE_SCRIPT]) {
      const content = fs.readFileSync(f, 'utf-8');
      expect(content).not.toContain('// @include core.js');
    }
  });

  test('userscript has valid Greasemonkey header', () => {
    const content = fs.readFileSync(USERSCRIPT, 'utf-8');
    expect(content).toContain('==UserScript==');
    expect(content).toContain('==/UserScript==');
    for (const tag of ['@name', '@version', '@match', '@grant']) {
      expect(content, `userscript contains ${tag}`).toMatch(new RegExp(`// ${tag}\\s+.+`));
    }
  });

  test('page-script contains message protocol constants', () => {
    const content = fs.readFileSync(PAGE_SCRIPT, 'utf-8');
    expect(content).toContain('MSG_PREFIX');
    expect(content).toContain('MSG');
    expect(content).toContain('YT_FORCE_MAX__');
  });

  test('build is idempotent', () => {
    const readBoth = () => [
      fs.readFileSync(USERSCRIPT, 'utf-8'),
      fs.readFileSync(PAGE_SCRIPT, 'utf-8'),
    ];
    const first = readBoth();
    execSync('node build.js', { cwd: ROOT, stdio: 'pipe' });
    const second = readBoth();
    expect(second[0]).toBe(first[0]);
    expect(second[1]).toBe(first[1]);
  });
});
