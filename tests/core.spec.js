// @ts-check
const { test, expect } = require('@playwright/test');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const ROOT = path.resolve(__dirname, '..');
const coreSource = fs.readFileSync(path.join(ROOT, 'src/core.js'), 'utf-8');

function loadCore() {
  // const/function declarations are block-scoped in vm.runInNewContext,
  // so we wrap the source to explicitly export the values we need.
  const wrapper = coreSource + `\n__exports = { ITAG_DB, QUALITY_LABELS, QUALITY_KEYS, createYTForceMax };`;
  const sandbox = { __exports: null };
  vm.runInNewContext(wrapper, sandbox);
  return sandbox.__exports;
}

test.describe('ITAG_DB', () => {
  const { ITAG_DB } = loadCore();
  const entries = Object.entries(ITAG_DB);

  test('has more than 40 entries', () => {
    expect(entries.length).toBeGreaterThan(40);
  });

  test('all keys are positive integers', () => {
    for (const [key] of entries) {
      const n = Number(key);
      expect(Number.isInteger(n) && n > 0, `itag ${key} is a positive integer`).toBe(true);
    }
  });

  test('every entry has codec and type', () => {
    for (const [key, val] of entries) {
      expect(val.codec, `itag ${key} has codec`).toBeTruthy();
      expect(val.type, `itag ${key} has type`).toBeTruthy();
    }
  });

  test('video entries have res field', () => {
    for (const [key, val] of entries) {
      if (val.type === 'video' || val.type === 'mux') {
        expect(val.res, `itag ${key} (${val.type}) has res`).toBeTruthy();
      }
    }
  });

  test('audio entries have bitrate field', () => {
    for (const [key, val] of entries) {
      if (val.type === 'audio') {
        expect(typeof val.bitrate, `itag ${key} has numeric bitrate`).toBe('number');
        expect(val.bitrate).toBeGreaterThan(0);
      }
    }
  });

  test('premium flags are only on expected itags', () => {
    const premiumItags = entries.filter(([, v]) => v.premium).map(([k]) => Number(k));
    // Known premium itags: 141, 356, 616, 712, 721, 774
    for (const itag of premiumItags) {
      expect([141, 356, 616, 712, 721, 774]).toContain(itag);
    }
  });

  test('HDR flags are correct', () => {
    const hdrEntries = entries.filter(([, v]) => v.hdr);
    expect(hdrEntries.length).toBeGreaterThan(0);
    for (const [key, val] of hdrEntries) {
      expect(['VP9.2', 'AV1'], `itag ${key} HDR codec`).toContain(val.codec);
    }
  });

  test('codecs are from expected set', () => {
    const expectedCodecs = new Set([
      'H.264', 'VP9', 'VP9.2', 'AV1',
      'AAC', 'HE-AAC', 'Opus', 'EC-3', 'AC-3',
    ]);
    for (const [key, val] of entries) {
      expect(expectedCodecs.has(val.codec), `itag ${key} codec "${val.codec}" is expected`).toBe(true);
    }
  });
});

test.describe('QUALITY_LABELS and QUALITY_KEYS', () => {
  const { QUALITY_LABELS, QUALITY_KEYS } = loadCore();

  test('correct order from max to tiny', () => {
    expect(QUALITY_KEYS[0]).toBe('max');
    expect(QUALITY_KEYS[QUALITY_KEYS.length - 1]).toBe('tiny');
  });

  test('descending resolution order', () => {
    const resolutionOrder = ['max', 'hd2160', 'hd1440', 'hd1080', 'hd720', 'large', 'medium', 'small', 'tiny'];
    expect(QUALITY_KEYS).toEqual(resolutionOrder);
  });

  test('every key has a label', () => {
    for (const key of QUALITY_KEYS) {
      expect(QUALITY_LABELS[key], `label for ${key}`).toBeTruthy();
    }
  });
});

test.describe('createYTForceMax', () => {
  const { createYTForceMax } = loadCore();

  test('exports expected API surface', () => {
    const engine = createYTForceMax(() => ({ quality: 'max', theatre: true, preferPremium: true }));
    const expectedKeys = [
      'applyWithRetries', 'hookPlayerEvents', 'isWatchPage',
      'forceQuality', 'forceTheatreMode', 'getPlaybackInfo',
      'ITAG_DB', 'QUALITY_LABELS', 'QUALITY_KEYS',
    ];
    for (const key of expectedKeys) {
      expect(key in engine, `engine has ${key}`).toBe(true);
    }
    expect(Object.keys(engine).length).toBe(expectedKeys.length);
  });
});
