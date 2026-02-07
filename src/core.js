// ── YouTube itag format database ─────────────────────────────────
// Reverse-engineered format map. Premium itags (356, 721) require
// YouTube Premium. Itags 214, 216, 598, 599, 600 are Android-only.
// Itags 141, 774 are YouTube Music Premium-only.
const ITAG_DB = {
  // H.264 (avc1)
  18:  { codec: 'H.264', type: 'mux', res: '360p', fps: 30 },
  133: { codec: 'H.264', type: 'video', res: '240p', fps: 30 },
  134: { codec: 'H.264', type: 'video', res: '360p', fps: 30 },
  135: { codec: 'H.264', type: 'video', res: '480p', fps: 30 },
  136: { codec: 'H.264', type: 'video', res: '720p', fps: 30 },
  137: { codec: 'H.264', type: 'video', res: '1080p', fps: 30 },
  160: { codec: 'H.264', type: 'video', res: '144p', fps: 30 },
  214: { codec: 'H.264', type: 'video', res: '720p', fps: 1, note: 'storyboard (Android)' },
  216: { codec: 'H.264', type: 'video', res: '1080p', fps: 1, note: 'storyboard (Android)' },
  298: { codec: 'H.264', type: 'video', res: '720p', fps: 60 },
  299: { codec: 'H.264', type: 'video', res: '1080p', fps: 60 },
  // VP9
  278: { codec: 'VP9', type: 'video', res: '144p', fps: 30 },
  242: { codec: 'VP9', type: 'video', res: '240p', fps: 30 },
  243: { codec: 'VP9', type: 'video', res: '360p', fps: 30 },
  244: { codec: 'VP9', type: 'video', res: '480p', fps: 30 },
  247: { codec: 'VP9', type: 'video', res: '720p', fps: 30 },
  248: { codec: 'VP9', type: 'video', res: '1080p', fps: 30 },
  271: { codec: 'VP9', type: 'video', res: '1440p', fps: 30 },
  313: { codec: 'VP9', type: 'video', res: '2160p', fps: 30 },
  302: { codec: 'VP9', type: 'video', res: '720p', fps: 60 },
  303: { codec: 'VP9', type: 'video', res: '1080p', fps: 60 },
  308: { codec: 'VP9', type: 'video', res: '1440p', fps: 60 },
  315: { codec: 'VP9', type: 'video', res: '2160p', fps: 60 },
  598: { codec: 'VP9', type: 'video', res: '144p', fps: 12, note: 'preview (Android)' },
  // VP9.2 HDR (itags 330-337, sequential 144p-2160p @ 60fps)
  330: { codec: 'VP9.2', type: 'video', res: '144p', fps: 60, hdr: true },
  331: { codec: 'VP9.2', type: 'video', res: '240p', fps: 60, hdr: true },
  332: { codec: 'VP9.2', type: 'video', res: '360p', fps: 60, hdr: true },
  333: { codec: 'VP9.2', type: 'video', res: '480p', fps: 60, hdr: true },
  334: { codec: 'VP9.2', type: 'video', res: '720p', fps: 60, hdr: true },
  335: { codec: 'VP9.2', type: 'video', res: '1080p', fps: 60, hdr: true },
  336: { codec: 'VP9.2', type: 'video', res: '1440p', fps: 60, hdr: true },
  337: { codec: 'VP9.2', type: 'video', res: '2160p', fps: 60, hdr: true },
  // Premium VP9 enhanced bitrate
  356: { codec: 'VP9', type: 'video', res: '1080p', fps: 30, premium: true },
  // AV1 SDR (itags 394-401, sequential 144p-2160p)
  394: { codec: 'AV1', type: 'video', res: '144p', fps: 30 },
  395: { codec: 'AV1', type: 'video', res: '240p', fps: 30 },
  396: { codec: 'AV1', type: 'video', res: '360p', fps: 30 },
  397: { codec: 'AV1', type: 'video', res: '480p', fps: 30 },
  398: { codec: 'AV1', type: 'video', res: '720p', fps: 30 },
  399: { codec: 'AV1', type: 'video', res: '1080p', fps: 30 },
  400: { codec: 'AV1', type: 'video', res: '1440p', fps: 30 },
  401: { codec: 'AV1', type: 'video', res: '2160p', fps: 30 },
  402: { codec: 'AV1', type: 'video', res: '4320p', fps: 30, note: 'rare' },
  // AV1 HFR 60fps
  571: { codec: 'AV1', type: 'video', res: '4320p', fps: 60, note: 'ultra-high bitrate' },
  // AV1 HDR (itags 694-702, sequential 144p-4320p @ 60fps = SDR + 300)
  694: { codec: 'AV1', type: 'video', res: '144p', fps: 60, hdr: true },
  695: { codec: 'AV1', type: 'video', res: '240p', fps: 60, hdr: true },
  696: { codec: 'AV1', type: 'video', res: '360p', fps: 60, hdr: true },
  697: { codec: 'AV1', type: 'video', res: '480p', fps: 60, hdr: true },
  698: { codec: 'AV1', type: 'video', res: '720p', fps: 60, hdr: true },
  699: { codec: 'AV1', type: 'video', res: '1080p', fps: 60, hdr: true },
  700: { codec: 'AV1', type: 'video', res: '1440p', fps: 60, hdr: true },
  701: { codec: 'AV1', type: 'video', res: '2160p', fps: 60, hdr: true },
  702: { codec: 'AV1', type: 'video', res: '4320p', fps: 60, hdr: true },
  // Premium AV1 enhanced bitrate
  712: { codec: 'AV1', type: 'video', res: '1080p', fps: 60, premium: true, note: 'HFR Premium' },
  721: { codec: 'AV1', type: 'video', res: '1080p', fps: 30, premium: true },
  // Letterboxed (Dolby Vision content)
  779: { codec: 'VP9', type: 'video', res: '480p', fps: 24, note: 'letterboxed 1080x608' },
  780: { codec: 'VP9', type: 'video', res: '480p', fps: 24, note: 'letterboxed 1080x608' },
  788: { codec: 'AV1', type: 'video', res: '480p', fps: 24, note: 'letterboxed 1080x608' },
  // Audio — AAC
  139: { codec: 'HE-AAC', type: 'audio', bitrate: 48, note: 'Android low-q' },
  140: { codec: 'AAC', type: 'audio', bitrate: 128 },
  141: { codec: 'AAC', type: 'audio', bitrate: 256, premium: true, note: 'YT Music only' },
  // Audio — Opus
  249: { codec: 'Opus', type: 'audio', bitrate: 50 },
  250: { codec: 'Opus', type: 'audio', bitrate: 70 },
  251: { codec: 'Opus', type: 'audio', bitrate: 160 },
  599: { codec: 'HE-AAC', type: 'audio', bitrate: 30, note: 'Android ultralow' },
  600: { codec: 'Opus', type: 'audio', bitrate: 30, note: 'Android ultralow' },
  774: { codec: 'Opus', type: 'audio', bitrate: 256, premium: true, note: 'YT Music only' },
  // Audio — Surround
  256: { codec: 'HE-AAC', type: 'audio', bitrate: 192, note: '5.1 surround' },
  258: { codec: 'AAC', type: 'audio', bitrate: 384, note: '5.1 surround' },
  328: { codec: 'EC-3', type: 'audio', bitrate: 384, note: 'Dolby Digital+ 5.1' },
  380: { codec: 'AC-3', type: 'audio', bitrate: 384, note: 'Dolby Digital 5.1' },
  // HLS Premium
  616: { codec: 'VP9', type: 'video', res: '1080p', premium: true, note: 'HLS/M3U8 delivery' },
};

// ── Quality definitions ──────────────────────────────────────────
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

function createYTForceMax(getSettings) {
  let activeInterval = null;

  function getTargetQuality(availableLevels) {
    const preferred = getSettings().quality;
    if (preferred === 'max') return availableLevels[0];

    const prefIndex = QUALITY_KEYS.indexOf(preferred);
    for (let i = prefIndex; i < QUALITY_KEYS.length; i++) {
      const level = QUALITY_KEYS[i];
      if (level !== 'max' && availableLevels.includes(level)) return level;
    }
    return availableLevels[availableLevels.length - 2]; // skip 'auto'
  }

  function getFormatId(player, quality) {
    if (!player.getAvailableQualityData) return undefined;
    const config = getSettings();
    const qualityData = player.getAvailableQualityData();
    const matches = qualityData.filter((q) => q.quality === quality);

    if (config.preferPremium) {
      const premium = matches.find((q) => q.paygatedQualityDetails);
      if (premium) return premium.formatId;
    }

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

    const formatId = getFormatId(player, target);

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

    if (formatId && player.getVideoStats) {
      const stats = player.getVideoStats();
      return stats.fmt === formatId;
    }
    return current === target;
  }

  function forceTheatreMode() {
    if (!getSettings().theatre) return true;

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

  function getPlaybackInfo() {
    const player = document.getElementById('movie_player');
    if (!player) return { error: 'No player found' };

    const stats = player.getVideoStats?.() ?? {};
    const quality = player.getPlaybackQuality?.() ?? '?';
    const qualityData = player.getAvailableQualityData?.() ?? [];
    const itag = stats.fmt;
    const itagInfo = ITAG_DB[itag];

    return {
      quality,
      itag,
      itagInfo,
      resolution: `${stats.vw ?? '?'}x${stats.vh ?? '?'}`,
      bandwidth: stats.lbw ? (parseInt(stats.lbw) / 1e6).toFixed(1) + ' Mbps' : '?',
      optimalFormat: stats.optimal_format ?? '?',
      qualityData: qualityData.map((q) => ({
        quality: q.quality,
        qualityLabel: q.qualityLabel,
        formatId: q.formatId,
        codec: ITAG_DB[q.formatId]?.codec,
        premium: !!q.paygatedQualityDetails,
        premiumText: q.paygatedQualityDetails?.paygatedIndicatorText,
      })),
      settings: getSettings(),
    };
  }

  return {
    applyWithRetries,
    hookPlayerEvents,
    isWatchPage,
    forceQuality,
    forceTheatreMode,
    getPlaybackInfo,
    ITAG_DB,
    QUALITY_LABELS,
    QUALITY_KEYS,
  };
}
