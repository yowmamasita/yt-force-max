// ==UserScript==
// @name         YouTube Force Max Quality + Theatre Mode
// @namespace    https://github.com/yowmamasita
// @version      1.3
// @description  Forces preferred quality (including Premium enhanced bitrate) and theatre mode on every YouTube video
// @match        *://www.youtube.com/*
// @run-at       document-idle
// @grant        GM_getValue
// @grant        GM_setValue
// @grant        GM_registerMenuCommand
// ==/UserScript==

(function () {
  'use strict';

  // ── Quality definitions ──────────────────────────────────────────
  // YouTube quality keys from highest to lowest.
  // "max" selects the best available, including Premium enhanced
  // bitrate variants when available (YouTube Premium required).
  const QUALITY_LABELS = {
    max: 'Max (highest available, prefers Premium enhanced bitrate)',
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

    const prefIndex = QUALITY_KEYS.indexOf(preferred);
    for (let i = prefIndex; i < QUALITY_KEYS.length; i++) {
      const level = QUALITY_KEYS[i];
      if (level !== 'max' && availableLevels.includes(level)) return level;
    }
    return availableLevels[availableLevels.length - 2]; // skip 'auto'
  }

  function getPremiumFormatId(player, quality) {
    if (!player.getAvailableQualityData) return undefined;
    const qualityData = player.getAvailableQualityData();
    // For "max", pick the first entry (highest); otherwise match the quality key.
    // Prefer Premium (enhanced bitrate) variants when multiple entries share
    // the same quality key.
    const matches = qualityData.filter((q) => q.quality === quality);
    const premium = matches.find((q) => q.paygatedQualityDetails);
    if (premium) return premium.formatId;
    return matches[0]?.formatId;
  }

  function forceQuality() {
    const player = document.getElementById('movie_player');
    if (!player || !player.getAvailableQualityLevels) return false;

    const levels = player.getAvailableQualityLevels();
    if (!levels.length || levels[0] === 'auto') return false;

    const target = getTargetQuality(levels);
    const current = player.getPlaybackQuality();

    if (!current || current === 'unknown') return false;

    const formatId = getPremiumFormatId(player, target);

    if (player.setPlaybackQualityRange) {
      if (formatId) {
        player.setPlaybackQualityRange(target, target, formatId);
      } else {
        player.setPlaybackQualityRange(target, target);
      }
    }
    if (player.setPlaybackQuality) {
      player.setPlaybackQuality(target);
    }

    // For Premium formats, we can't check by quality string alone since
    // both regular and Premium report the same quality key. Use stats
    // to verify when a formatId was requested.
    if (formatId && player.getVideoStats) {
      const stats = player.getVideoStats();
      return stats.fmt === formatId;
    }
    return current === target;
  }

  function forceTheatreMode() {
    if (!getConfig().theatre) return true;

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
