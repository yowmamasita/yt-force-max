// ==UserScript==
// @name         YouTube Force Max Quality + Theatre Mode
// @namespace    https://github.com/yowmamasita
// @version      2.0
// @description  Forces preferred quality (including Premium enhanced bitrate) and theatre mode on every YouTube video
// @author       Ben Adrian Sarmiento
// @match        *://www.youtube.com/*
// @run-at       document-idle
// @grant        GM_getValue
// @grant        GM_setValue
// @grant        GM_registerMenuCommand
// ==/UserScript==

(function () {
  'use strict';

  // @include core.js

  function getConfig() {
    return {
      quality: GM_getValue('quality', 'max'),
      theatre: GM_getValue('theatre', true),
      preferPremium: GM_getValue('preferPremium', true),
    };
  }

  const engine = createYTForceMax(getConfig);

  // ── Menu commands ────────────────────────────────────────────────
  GM_registerMenuCommand('Set preferred quality', () => {
    const current = GM_getValue('quality', 'max');
    const options = engine.QUALITY_KEYS.map(
      (k) => `${k === current ? '► ' : '  '}${k} — ${engine.QUALITY_LABELS[k]}`
    ).join('\n');
    const input = prompt(
      `Current quality: ${current}\n\nEnter a quality level:\n${options}`,
      current
    );
    if (input !== null && engine.QUALITY_KEYS.includes(input.trim())) {
      GM_setValue('quality', input.trim());
      alert(`Quality set to: ${input.trim()}`);
    } else if (input !== null) {
      alert(`Invalid quality "${input}". Valid options: ${engine.QUALITY_KEYS.join(', ')}`);
    }
  });

  GM_registerMenuCommand('Toggle theatre mode', () => {
    const current = GM_getValue('theatre', true);
    GM_setValue('theatre', !current);
    alert(`Theatre mode: ${!current ? 'ON' : 'OFF'}`);
  });

  GM_registerMenuCommand('Toggle Premium enhanced bitrate', () => {
    const current = GM_getValue('preferPremium', true);
    GM_setValue('preferPremium', !current);
    alert(
      `Premium enhanced bitrate: ${!current ? 'ON' : 'OFF'}\n\n` +
      (!current
        ? 'Will prefer Premium enhanced bitrate (itag 356/721) when available.\nRequires YouTube Premium.'
        : 'Will use standard bitrate even when Premium is available.')
    );
  });

  GM_registerMenuCommand('Show current playback info', () => {
    const info = engine.getPlaybackInfo();
    if (info.error) { alert(info.error); return; }

    const itagInfo = info.itagInfo;
    const config = getConfig();

    let msg = '── Current Playback ──\n';
    msg += `Quality: ${info.quality}\n`;
    msg += `Format ID (itag): ${info.itag ?? '?'}`;
    if (itagInfo) {
      msg += ` → ${itagInfo.codec} ${itagInfo.res ?? ''}`;
      if (itagInfo.fps) msg += ` ${itagInfo.fps}fps`;
      if (itagInfo.hdr) msg += ' HDR';
      if (itagInfo.premium) msg += ' [PREMIUM]';
      if (itagInfo.note) msg += ` (${itagInfo.note})`;
    }
    msg += `\nOptimal format: ${info.optimalFormat}`;
    msg += `\nResolution: ${info.resolution}`;
    msg += `\nBandwidth: ${info.bandwidth}`;

    msg += '\n\n── Available Qualities ──\n';
    for (const q of info.qualityData) {
      let line = `${q.qualityLabel} (${q.quality})`;
      if (q.formatId) {
        line += ` — itag ${q.formatId}`;
        if (q.codec) line += ` [${q.codec}]`;
      }
      if (q.premium) {
        line += ` ★ ${q.premiumText}`;
      }
      msg += line + '\n';
    }

    const premiumEntries = info.qualityData.filter((q) => q.premium);
    if (premiumEntries.length) {
      msg += '\n── Premium Formats ──\n';
      for (const pe of premiumEntries) {
        msg += `itag ${pe.formatId}: ${pe.qualityLabel}`;
        if (pe.codec) msg += ` — ${pe.codec}`;
        msg += ` (${pe.premiumText})\n`;
      }
    }

    msg += '\n── Settings ──\n';
    msg += `Preferred quality: ${config.quality}\n`;
    msg += `Theatre mode: ${config.theatre ? 'ON' : 'OFF'}\n`;
    msg += `Prefer Premium: ${config.preferPremium ? 'ON' : 'OFF'}\n`;

    alert(msg);
  });

  // ── Initialization ───────────────────────────────────────────────
  engine.applyWithRetries();

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
})();
