// @ts-check
const { test, expect } = require('@playwright/test');
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const EXT = path.join(ROOT, 'extension');
const manifest = JSON.parse(fs.readFileSync(path.join(EXT, 'manifest.json'), 'utf-8'));
const pkg = JSON.parse(fs.readFileSync(path.join(ROOT, 'package.json'), 'utf-8'));

test.describe('Manifest validation', () => {
  test('manifest_version is 3 and required fields present', () => {
    expect(manifest.manifest_version).toBe(3);
    expect(manifest.name).toBeTruthy();
    expect(manifest.version).toBeTruthy();
    expect(manifest.description).toBeTruthy();
  });

  test('version matches package.json', () => {
    expect(manifest.version).toBe(pkg.version);
  });

  test('has storage permission', () => {
    expect(manifest.permissions).toContain('storage');
  });

  test('content scripts target youtube.com', () => {
    expect(manifest.content_scripts).toBeDefined();
    expect(manifest.content_scripts.length).toBeGreaterThan(0);
    for (const cs of manifest.content_scripts) {
      const hasYoutube = cs.matches.some((m) => m.includes('youtube.com'));
      expect(hasYoutube, 'content script matches youtube.com').toBe(true);
    }
  });

  test('all referenced files exist', () => {
    // Content script JS files
    for (const cs of manifest.content_scripts) {
      for (const js of cs.js) {
        const p = path.join(EXT, js);
        expect(fs.existsSync(p), `${js} exists`).toBe(true);
      }
    }
    // Popup HTML
    const popupPath = manifest.action?.default_popup;
    if (popupPath) {
      expect(fs.existsSync(path.join(EXT, popupPath)), `${popupPath} exists`).toBe(true);
    }
    // Icons
    const allIcons = {
      ...(manifest.action?.default_icon || {}),
      ...(manifest.icons || {}),
    };
    for (const [size, iconPath] of Object.entries(allIcons)) {
      expect(fs.existsSync(path.join(EXT, iconPath)), `icon ${size}: ${iconPath} exists`).toBe(true);
    }
  });

  test('page-script runs in MAIN world', () => {
    const mainWorldScript = manifest.content_scripts.find((cs) => cs.world === 'MAIN');
    expect(mainWorldScript, 'a content script with world: MAIN exists').toBeTruthy();
    expect(mainWorldScript.js).toBeDefined();
    expect(mainWorldScript.js.length).toBeGreaterThan(0);
  });

  test('Firefox gecko ID present', () => {
    expect(manifest.browser_specific_settings?.gecko?.id).toBeTruthy();
  });
});
