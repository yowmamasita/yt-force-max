(function () {
  'use strict';

  // ── Message protocol ───────────────────────────────────────────
  const MSG_PREFIX = 'YT_FORCE_MAX__';
  const MSG = {
    SETTINGS:      MSG_PREFIX + 'SETTINGS',
    READY:         MSG_PREFIX + 'READY',
    GET_INFO:      MSG_PREFIX + 'GET_INFO',
    PLAYBACK_INFO: MSG_PREFIX + 'PLAYBACK_INFO',
  };

  // @include core.js

  // ── Settings (updated from content script via postMessage) ──────
  let settings = {
    quality: 'max',
    theatre: true,
    preferPremium: true,
  };

  const engine = createYTForceMax(() => settings);

  // ── Listen for settings from content script ─────────────────────
  window.addEventListener('message', (e) => {
    if (e.source !== window || !e.data?.type) return;

    if (e.data.type === MSG.SETTINGS) {
      settings = { ...settings, ...e.data.settings };
      if (engine.isWatchPage()) engine.applyWithRetries();
    }

    if (e.data.type === MSG.GET_INFO) {
      window.postMessage({ type: MSG.PLAYBACK_INFO, info: engine.getPlaybackInfo() }, '*');
    }
  });

  // ── Initialization ───────────────────────────────────────────────
  if (engine.isWatchPage()) engine.applyWithRetries();

  document.addEventListener('yt-navigate-finish', () => {
    if (engine.isWatchPage()) {
      engine.applyWithRetries();
      engine.hookPlayerEvents();
    }
  });

  document.addEventListener('yt-page-data-updated', () => {
    if (engine.isWatchPage()) {
      engine.applyWithRetries();
      engine.hookPlayerEvents();
    }
  });

  // Signal readiness to content script
  window.postMessage({ type: MSG.READY }, '*');
})();
