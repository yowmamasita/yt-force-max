// @ts-check
const { test, expect } = require('@playwright/test');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const ROOT = path.resolve(__dirname, '..');

function readFile(rel) {
  return fs.readFileSync(path.join(ROOT, rel), 'utf-8');
}

function loadCore() {
  const src = readFile('src/core.js');
  const wrapper = src + `\n__exports = { ITAG_DB, QUALITY_LABELS, QUALITY_KEYS, createYTForceMax };`;
  const sandbox = { __exports: null };
  vm.runInNewContext(wrapper, sandbox);
  return sandbox.__exports;
}

test.describe('Cross-file consistency', () => {
  test('popup option values match core.js QUALITY_KEYS', () => {
    const { QUALITY_KEYS } = loadCore();
    const popupHtml = readFile('extension/popup/popup.html');

    // Extract option values from the quality select
    const valueMatches = [...popupHtml.matchAll(/<option\s+value="([^"]+)"/g)];
    const popupValues = valueMatches.map((m) => m[1]);

    expect(popupValues.length).toBe(QUALITY_KEYS.length);
    expect(popupValues).toEqual(QUALITY_KEYS);
  });

  test('popup option text matches core.js QUALITY_LABELS', () => {
    const { QUALITY_LABELS } = loadCore();
    const popupHtml = readFile('extension/popup/popup.html');

    // Extract option text content
    const optionMatches = [...popupHtml.matchAll(/<option\s+value="([^"]+)">([^<]+)<\/option>/g)];
    for (const [, value, text] of optionMatches) {
      expect(text, `label for ${value}`).toBe(QUALITY_LABELS[value]);
    }
  });

  test('MSG_PREFIX and MSG keys match between content-script.js and extension-page.js', () => {
    const contentScript = readFile('extension/src/content-script.js');
    const extensionPage = readFile('src/extension-page.js');

    // Extract MSG_PREFIX
    const prefixRe = /const MSG_PREFIX = '([^']+)'/;
    const csPrefix = contentScript.match(prefixRe)?.[1];
    const epPrefix = extensionPage.match(prefixRe)?.[1];
    expect(csPrefix).toBeTruthy();
    expect(csPrefix).toBe(epPrefix);

    // Extract MSG keys
    const msgKeysRe = /const MSG = \{([^}]+)\}/s;
    const extractKeys = (src) => {
      const block = src.match(msgKeysRe)?.[1] ?? '';
      return [...block.matchAll(/(\w+):/g)].map((m) => m[1]).sort();
    };
    expect(extractKeys(contentScript)).toEqual(extractKeys(extensionPage));
  });

  test('DEFAULTS blocks match between popup.js and content-script.js', () => {
    const popupJs = readFile('extension/popup/popup.js');
    const contentScript = readFile('extension/src/content-script.js');

    const defaultsRe = /const DEFAULTS = \{([^}]+)\}/s;

    const extractDefaults = (src) => {
      const block = src.match(defaultsRe)?.[1] ?? '';
      // Normalize whitespace for comparison
      return block.replace(/\s+/g, ' ').trim();
    };

    expect(extractDefaults(popupJs)).toBe(extractDefaults(contentScript));
  });

  test('source templates still contain // @include core.js marker', () => {
    const templates = ['src/extension-page.js', 'src/userscript-head.js'];
    for (const tpl of templates) {
      const content = readFile(tpl);
      expect(content, `${tpl} contains @include marker`).toContain('// @include core.js');
    }
  });
});
