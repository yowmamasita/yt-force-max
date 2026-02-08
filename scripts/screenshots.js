const { chromium } = require('@playwright/test');
const path = require('path');
const fs = require('fs');

const EXTENSION_PATH = path.resolve(__dirname, '..', 'extension');
const OUT = path.resolve(__dirname, '..', 'dist');

async function main() {
  fs.mkdirSync(OUT, { recursive: true });

  const context = await chromium.launchPersistentContext('', {
    headless: false,
    args: [
      `--disable-extensions-except=${EXTENSION_PATH}`,
      `--load-extension=${EXTENSION_PATH}`,
      '--no-first-run',
      '--disable-gpu',
    ],
    viewport: { width: 1920, height: 1080 },
  });

  // Screenshot 1: Popup rendered in a standalone page
  // We load the popup HTML directly in a data: URL wrapper to avoid
  // chrome-extension:// screenshot restrictions
  const popupPage = await context.newPage();
  const popupCss = fs.readFileSync(path.join(EXTENSION_PATH, 'popup/popup.css'), 'utf-8');
  const popupHtml = fs.readFileSync(path.join(EXTENSION_PATH, 'popup/popup.html'), 'utf-8');

  // Build a self-contained page with the popup centered on a dark background
  const wrappedHtml = `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<style>
  body {
    margin: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    min-height: 100vh;
    background: #181818;
  }
  .popup-frame {
    border-radius: 12px;
    overflow: hidden;
    box-shadow: 0 8px 32px rgba(0,0,0,0.5);
    width: 280px;
  }
  ${popupCss}
</style>
</head>
<body>
  <div class="popup-frame">
    <div class="container" style="padding: 16px;">
      <h1 style="font-size: 16px; font-weight: 600; margin-bottom: 14px; color: #fff;">YT Force Max</h1>
      <div class="setting" style="margin-bottom: 12px;">
        <label for="quality" style="display: block; font-size: 12px; color: #9aa0a6; margin-bottom: 4px;">Preferred Quality</label>
        <select id="quality" style="width: 100%; padding: 6px 8px; background: #303134; border: 1px solid #5f6368; border-radius: 4px; color: #e8eaed; font-size: 13px;">
          <option value="max" selected>Max (highest available)</option>
          <option value="hd2160">2160p (4K)</option>
          <option value="hd1440">1440p</option>
          <option value="hd1080">1080p</option>
          <option value="hd720">720p</option>
          <option value="large">480p</option>
          <option value="medium">360p</option>
          <option value="small">240p</option>
          <option value="tiny">144p</option>
        </select>
      </div>
      <div class="setting" style="margin-bottom: 12px;">
        <label class="toggle" style="display: flex; align-items: center; gap: 8px; color: #e8eaed; font-size: 13px;">
          <input type="checkbox" id="theatre" checked style="accent-color: #8ab4f8; width: 16px; height: 16px;">
          <span>Theatre mode</span>
        </label>
      </div>
      <div class="setting" style="margin-bottom: 12px;">
        <label class="toggle" style="display: flex; align-items: center; gap: 8px; color: #e8eaed; font-size: 13px;">
          <input type="checkbox" id="preferPremium" checked style="accent-color: #8ab4f8; width: 16px; height: 16px;">
          <span>Premium enhanced bitrate</span>
        </label>
      </div>
      <button id="info-btn" style="width: 100%; padding: 8px; margin-top: 4px; background: #303134; border: 1px solid #5f6368; border-radius: 4px; color: #8ab4f8; font-size: 13px;">Show Playback Info</button>
    </div>
  </div>
</body>
</html>`;

  await popupPage.setContent(wrappedHtml);
  await popupPage.waitForTimeout(500);
  await popupPage.screenshot({ path: path.join(OUT, 'screenshot-popup.png') });
  console.log('Saved screenshot-popup.png');
  await popupPage.close();

  // Screenshot 2: YouTube video page with extension active
  const ytPage = await context.newPage();
  // Use Big Buck Bunny — public 4K video, no age gate
  await ytPage.goto('https://www.youtube.com/watch?v=aqz-KE-bpKQ', { waitUntil: 'domcontentloaded', timeout: 30000 });

  // Dismiss any consent/cookie dialogs
  for (const label of ['Accept all', 'Reject all', 'No thanks', 'Dismiss', 'Not now']) {
    try {
      await ytPage.locator(`button:has-text("${label}")`).first().click({ timeout: 2000 });
      await ytPage.waitForTimeout(1000);
    } catch {}
  }

  // Wait for video player to load
  await ytPage.waitForSelector('#movie_player', { timeout: 15000 }).catch(() => {});
  await ytPage.waitForTimeout(5000);

  // Click play if paused
  try {
    const paused = await ytPage.evaluate(() => {
      const player = document.getElementById('movie_player');
      return player?.classList?.contains('paused-mode');
    });
    if (paused) {
      await ytPage.locator('.ytp-play-button').click({ timeout: 3000 });
      await ytPage.waitForTimeout(3000);
    }
  } catch {}

  // Wait for quality to settle at max
  await ytPage.waitForTimeout(5000);

  // Open "Stats for nerds" via right-click context menu on the player
  await ytPage.evaluate(() => {
    const player = document.getElementById('movie_player');
    if (player?.getStatsForNerds) {
      // Direct API call to show stats overlay
      player.getStatsForNerds();
    }
  });

  // Fallback: try right-click menu approach
  try {
    const statsVisible = await ytPage.locator('.html5-video-info-panel').isVisible();
    if (!statsVisible) {
      // Right-click the video to get context menu
      await ytPage.locator('#movie_player video').click({ button: 'right', timeout: 3000 });
      await ytPage.waitForTimeout(500);
      // Click "Stats for nerds" in the context menu
      await ytPage.locator('.ytp-menuitem:has-text("Stats for nerds")').click({ timeout: 3000 });
    }
  } catch {}

  await ytPage.waitForTimeout(2000);

  await ytPage.screenshot({ path: path.join(OUT, 'screenshot-youtube-stats.png') });
  console.log('Saved screenshot-youtube-stats.png');

  // Close stats for nerds
  await ytPage.evaluate(() => {
    const closeBtn = document.querySelector('.html5-video-info-panel-close');
    if (closeBtn) closeBtn.click();
  });
  await ytPage.waitForTimeout(500);

  // Screenshot 3: Quality options panel open
  // Click the settings gear
  await ytPage.locator('.ytp-settings-button').click({ timeout: 5000 });
  await ytPage.waitForTimeout(500);
  // Click "Quality" menu item
  await ytPage.locator('.ytp-menuitem:has-text("Quality")').click({ timeout: 5000 });
  await ytPage.waitForTimeout(1000);

  await ytPage.screenshot({ path: path.join(OUT, 'screenshot-youtube-quality.png') });
  console.log('Saved screenshot-youtube-quality.png');
  await ytPage.close();

  await context.close();
  console.log('Done!');
}

main().catch((e) => { console.error(e); process.exit(1); });
