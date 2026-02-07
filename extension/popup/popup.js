(function () {
  'use strict';

  const DEFAULTS = {
    quality: 'max',
    theatre: true,
    preferPremium: true,
  };

  const qualityEl = document.getElementById('quality');
  const theatreEl = document.getElementById('theatre');
  const premiumEl = document.getElementById('preferPremium');
  const infoBtn = document.getElementById('info-btn');
  const infoOutput = document.getElementById('info-output');

  // ── Load current settings ───────────────────────────────────────
  chrome.storage.local.get(DEFAULTS, (items) => {
    qualityEl.value = items.quality;
    theatreEl.checked = items.theatre;
    premiumEl.checked = items.preferPremium;
  });

  // ── Save on change ──────────────────────────────────────────────
  qualityEl.addEventListener('change', () => {
    chrome.storage.local.set({ quality: qualityEl.value });
  });

  theatreEl.addEventListener('change', () => {
    chrome.storage.local.set({ theatre: theatreEl.checked });
  });

  premiumEl.addEventListener('change', () => {
    chrome.storage.local.set({ preferPremium: premiumEl.checked });
  });

  // ── Playback info ───────────────────────────────────────────────
  infoBtn.addEventListener('click', async () => {
    infoOutput.classList.remove('hidden');
    infoOutput.textContent = 'Fetching...';

    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      if (!tab?.id) {
        infoOutput.textContent = 'No active tab found.';
        return;
      }

      chrome.tabs.sendMessage(tab.id, { type: 'GET_PLAYBACK_INFO' }, (info) => {
        if (chrome.runtime.lastError) {
          infoOutput.textContent = 'Not on a YouTube page or extension not loaded.';
          return;
        }
        if (!info || info.error) {
          infoOutput.textContent = info?.error ?? 'No info available.';
          return;
        }
        infoOutput.textContent = formatInfo(info);
      });
    } catch (err) {
      infoOutput.textContent = 'Error: ' + err.message;
    }
  });

  function formatInfo(info) {
    let out = '── Current Playback ──\n';
    out += `Quality: ${info.quality}\n`;
    out += `Itag: ${info.itag ?? '?'}`;
    if (info.itagInfo) {
      out += ` → ${info.itagInfo.codec} ${info.itagInfo.res ?? ''}`;
      if (info.itagInfo.fps) out += ` ${info.itagInfo.fps}fps`;
      if (info.itagInfo.hdr) out += ' HDR';
      if (info.itagInfo.premium) out += ' [PREMIUM]';
    }
    out += `\nResolution: ${info.resolution}`;
    out += `\nBandwidth: ${info.bandwidth}`;

    if (info.qualityData?.length) {
      out += '\n\n── Available Qualities ──\n';
      for (const q of info.qualityData) {
        out += `${q.qualityLabel} (${q.quality})`;
        if (q.formatId) out += ` — itag ${q.formatId}`;
        if (q.codec) out += ` [${q.codec}]`;
        if (q.premium) out += ` ★ ${q.premiumText}`;
        out += '\n';
      }
    }

    out += '\n── Settings ──\n';
    out += `Quality: ${info.settings.quality}\n`;
    out += `Theatre: ${info.settings.theatre ? 'ON' : 'OFF'}\n`;
    out += `Premium: ${info.settings.preferPremium ? 'ON' : 'OFF'}`;

    return out;
  }
})();
