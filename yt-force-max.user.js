// ==UserScript==
// @name         YouTube Force Max Quality + Theatre Mode
// @namespace    https://github.com/yowmamasita
// @version      1.2
// @description  Forces preferred quality and theatre mode on every YouTube video
// @match        *://www.youtube.com/*
// @run-at       document-idle
// @grant        GM_getValue
// @grant        GM_setValue
// @grant        GM_registerMenuCommand
// ==/UserScript==

(function () {
  'use strict';

  // ── Configuration ────────────────────────────────────────────────
  // Quality options (highest to lowest):
  //   "max"     - always pick the highest available
  //   "hd2160"  - 4K
  //   "hd1440"  - 1440p
  //   "hd1080"  - 1080p
  //   "hd720"   - 720p
  //   "large"   - 480p
  //   "medium"  - 360p
  //   "small"   - 240p
  //   "tiny"    - 144p
  const QUALITY_LABELS = {
    max: 'Max (highest available)',
    hd2160: '2160p (4K)',
    hd1440: '1440p',
    hd1080: '1080p',
    hd720: '720p',
    large: '480p',
    medium: '360p',
    small: '240p',
    tiny: '144p',
  };
  const QUALITY_KEYS = Object.keys(QUALITY_LABELS);

  function getConfig() {
    return {
      quality: GM_getValue('quality', 'max'),
      theatre: GM_getValue('theatre', true),
    };
  }

  // ── Menu commands ────────────────────────────────────────────────
  GM_registerMenuCommand('Set preferred quality', () => {
    const current = GM_getValue('quality', 'max');
    const options = QUALITY_KEYS.map(
      (k) => `${k === current ? '► ' : '  '}${k} — ${QUALITY_LABELS[k]}`
    ).join('\n');
    const input = prompt(
      `Current quality: ${current}\n\nEnter a quality level:\n${options}`,
      current
    );
    if (input !== null && QUALITY_KEYS.includes(input.trim())) {
      GM_setValue('quality', input.trim());
      alert(`Quality set to: ${input.trim()}`);
    } else if (input !== null) {
      alert(`Invalid quality "${input}". Valid options: ${QUALITY_KEYS.join(', ')}`);
    }
  });

  GM_registerMenuCommand('Toggle theatre mode', () => {
    const current = GM_getValue('theatre', true);
    GM_setValue('theatre', !current);
    alert(`Theatre mode: ${!current ? 'ON' : 'OFF'}`);
  });

  // ── Core logic ───────────────────────────────────────────────────
  let activeInterval = null;

  function getTargetQuality(availableLevels) {
    const preferred = getConfig().quality;
    if (preferred === 'max') return availableLevels[0];

    // Find the preferred level, or the closest available one that's <= preferred
    const prefIndex = QUALITY_KEYS.indexOf(preferred);
    for (let i = prefIndex; i < QUALITY_KEYS.length; i++) {
      const level = QUALITY_KEYS[i];
      if (level !== 'max' && availableLevels.includes(level)) return level;
    }
    // Fallback: pick the lowest available
    return availableLevels[availableLevels.length - 2]; // skip 'auto'
  }

  function forceQuality() {
    const player = document.getElementById('movie_player');
    if (!player || !player.getAvailableQualityLevels) return false;

    const levels = player.getAvailableQualityLevels();
    if (!levels.length || levels[0] === 'auto') return false;

    const target = getTargetQuality(levels);
    const current = player.getPlaybackQuality();

    if (!current || current === 'unknown') return false;

    if (player.setPlaybackQualityRange) {
      player.setPlaybackQualityRange(target, target);
    }
    if (player.setPlaybackQuality) {
      player.setPlaybackQuality(target);
    }
    return current === target;
  }

  function forceTheatreMode() {
    if (!getConfig().theatre) return true; // skip if disabled

    const page = document.querySelector('ytd-watch-flexy');
    if (!page) return false;
    if (page.hasAttribute('theater')) return true;

    const theatreBtn = document.querySelector('.ytp-size-button');
    if (theatreBtn) {
      theatreBtn.click();
      return true;
    }
    return false;
  }

  function isWatchPage() {
    return window.location.pathname === '/watch';
  }

  function applyWithRetries() {
    if (activeInterval) clearInterval(activeInterval);

    let attempts = 0;
    let qualityDone = false;
    let theatreDone = false;

    activeInterval = setInterval(() => {
      if (!isWatchPage()) {
        clearInterval(activeInterval);
        activeInterval = null;
        return;
      }

      if (!qualityDone) qualityDone = forceQuality();
      if (!theatreDone) theatreDone = forceTheatreMode();

      attempts++;
      if ((qualityDone && theatreDone) || attempts > 60) {
        clearInterval(activeInterval);
        activeInterval = null;
      }
    }, 500);
  }

  function hookPlayerEvents() {
    const player = document.getElementById('movie_player');
    if (!player || player.__yt_force_hooked) return;
    player.__yt_force_hooked = true;

    player.addEventListener('onStateChange', (state) => {
      if (state === 1 || state === 3) {
        forceQuality();
      }
    });
  }

  // ── Initialization ───────────────────────────────────────────────
  applyWithRetries();

  document.addEventListener('yt-navigate-finish', () => {
    if (isWatchPage()) {
      applyWithRetries();
      hookPlayerEvents();
    }
  });

  document.addEventListener('yt-page-data-updated', () => {
    if (isWatchPage()) {
      applyWithRetries();
      hookPlayerEvents();
    }
  });
})();
