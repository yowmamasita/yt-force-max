(function () {
  'use strict';

  const MSG_PREFIX = 'YT_FORCE_MAX__';
  const MSG = {
    SETTINGS:      MSG_PREFIX + 'SETTINGS',
    READY:         MSG_PREFIX + 'READY',
    GET_INFO:      MSG_PREFIX + 'GET_INFO',
    PLAYBACK_INFO: MSG_PREFIX + 'PLAYBACK_INFO',
  };

  const DEFAULTS = {
    quality: 'max',
    theatre: true,
    preferPremium: true,
  };

  // ── Push settings to page script ────────────────────────────────
  function pushSettings(settings) {
    window.postMessage({ type: MSG.SETTINGS, settings }, '*');
  }

  // ── Load and push initial settings ──────────────────────────────
  function init() {
    chrome.storage.local.get(DEFAULTS, (items) => {
      pushSettings(items);
    });
  }

  // If page script is already loaded, push immediately; also listen for its ready signal
  init();
  window.addEventListener('message', (e) => {
    if (e.source !== window || !e.data?.type) return;

    if (e.data.type === MSG.READY) {
      init();
    }

    // Relay playback info to popup via chrome.runtime
    if (e.data.type === MSG.PLAYBACK_INFO) {
      // Store latest info so popup can request it
      chrome.storage.local.set({ _playbackInfo: e.data.info });
    }
  });

  // ── Listen for storage changes (from popup) ─────────────────────
  chrome.storage.onChanged.addListener((changes, area) => {
    if (area !== 'local') return;

    const updated = {};
    for (const [key, { newValue }] of Object.entries(changes)) {
      if (key in DEFAULTS) {
        updated[key] = newValue;
      }
    }
    if (Object.keys(updated).length) {
      pushSettings(updated);
    }
  });

  // ── Handle playback info requests from popup ────────────────────
  chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
    if (msg.type === 'GET_PLAYBACK_INFO') {
      window.postMessage({ type: MSG.GET_INFO }, '*');

      // Wait for the page script to respond
      const handler = (e) => {
        if (e.source !== window || e.data?.type !== MSG.PLAYBACK_INFO) return;
        window.removeEventListener('message', handler);
        sendResponse(e.data.info);
      };
      window.addEventListener('message', handler);

      // Timeout after 2 seconds
      setTimeout(() => {
        window.removeEventListener('message', handler);
        sendResponse({ error: 'Timeout waiting for player info' });
      }, 2000);

      return true; // keep sendResponse channel open
    }
  });
})();
