// @ts-check
const { test, expect, chromium } = require('@playwright/test');
const path = require('path');
const fs = require('fs');

const EXTENSION_PATH = path.resolve(__dirname, '..', 'extension');
const SCREENSHOTS_DIR = path.resolve(__dirname, '..', 'test-results');
const COOKIES_PATH = path.resolve(
  process.env.HOME || '/home/ben',
  'Downloads/www.youtube.com_cookies.txt'
);

// ── 4K test video (public, known 4K): Big Buck Bunny ──
const VIDEO_4K = 'https://www.youtube.com/watch?v=aqz-KE-bpKQ';
// ── 1080p test video (for Premium enhanced bitrate test) ──
const VIDEO_1080 = 'https://www.youtube.com/watch?v=jNQXAC9IVRw';

/**
 * Parse Netscape cookie file into Playwright cookie objects
 */
function parseNetscapeCookies(filePath) {
  const text = fs.readFileSync(filePath, 'utf-8');
  const cookies = [];
  for (const line of text.split('\n')) {
    if (!line.trim() || line.startsWith('#')) continue;
    const parts = line.split('\t');
    if (parts.length < 7) continue;
    const [domain, , cookiePath, secure, expires, name, value] = parts;
    cookies.push({
      name,
      value,
      domain: domain.startsWith('.') ? domain : '.' + domain,
      path: cookiePath,
      secure: secure === 'TRUE',
      expires: parseInt(expires) || -1,
    });
  }
  return cookies;
}

/**
 * Launch Chrome with the extension loaded
 */
async function launchWithExtension(options = {}) {
  const isCI = !!process.env.CI;
  const context = await chromium.launchPersistentContext('', {
    headless: false,
    args: [
      `--disable-extensions-except=${EXTENSION_PATH}`,
      `--load-extension=${EXTENSION_PATH}`,
      '--no-first-run',
      '--disable-gpu',
      '--autoplay-policy=no-user-gesture-required',
      ...(isCI ? ['--no-sandbox', '--disable-dev-shm-usage', '--disable-setuid-sandbox'] : []),
    ],
    viewport: { width: 1920, height: 1080 },
    ...options,
  });

  // Get extension ID from service worker (MV3) or background page
  let extensionId;
  // For MV3 with no background, get ID from extensions page
  const extPage = await context.newPage();
  await extPage.goto('chrome://extensions/');
  // Extract extension ID via the extension manager
  extensionId = await extPage.evaluate(() => {
    // @ts-ignore
    const mgr = document.querySelector('extensions-manager');
    if (!mgr) return null;
    // @ts-ignore
    const items = mgr.shadowRoot?.querySelector('extensions-item-list');
    if (!items) return null;
    // @ts-ignore
    const item = items.shadowRoot?.querySelector('extensions-item');
    if (!item) return null;
    return item.id;
  });

  // Fallback: get from URL of any extension page
  if (!extensionId) {
    for (const page of context.pages()) {
      const url = page.url();
      const match = url.match(/chrome-extension:\/\/([a-z]+)/);
      if (match) {
        extensionId = match[1];
        break;
      }
    }
  }

  await extPage.close();

  return { context, extensionId };
}

/**
 * Save a debug screenshot
 */
async function saveScreenshot(page, name) {
  try {
    fs.mkdirSync(SCREENSHOTS_DIR, { recursive: true });
    await page.screenshot({
      path: path.join(SCREENSHOTS_DIR, `${name}.png`),
      fullPage: true,
    });
  } catch {
    // Ignore screenshot errors
  }
}

/**
 * Try to start playback if the player is paused/unstarted
 */
async function ensurePlayback(page) {
  try {
    // Click the big play button if visible
    const bigPlayBtn = page.locator('.ytp-large-play-button');
    if (await bigPlayBtn.isVisible({ timeout: 2000 })) {
      await bigPlayBtn.click();
    }
  } catch {
    // Ignore
  }
  try {
    // Also try to start via the player API
    await page.evaluate(() => {
      const p = document.getElementById('movie_player');
      p?.playVideo?.();
    });
  } catch {
    // Ignore
  }
}

/**
 * Wait for YouTube player to be ready on a page
 */
async function waitForPlayer(page, timeout = 20_000) {
  // First wait for the player element to exist
  await page.waitForSelector('#movie_player', { timeout });
  // Try to kick off playback
  await ensurePlayback(page);
  try {
    await page.waitForFunction(
      () => {
        const p = document.getElementById('movie_player');
        if (!p) return false;
        const levels = p.getAvailableQualityLevels?.();
        return levels && levels.length > 0 && levels[0] !== 'auto';
      },
      { timeout }
    );
  } catch (e) {
    await saveScreenshot(page, `waitForPlayer-fail-${Date.now()}`);
    throw e;
  }
}

/**
 * Get current playback quality from the player
 */
async function getQuality(page) {
  return page.evaluate(() => {
    const p = document.getElementById('movie_player');
    return p?.getPlaybackQuality?.() ?? null;
  });
}

/**
 * Get available quality levels
 */
async function getAvailableLevels(page) {
  return page.evaluate(() => {
    const p = document.getElementById('movie_player');
    return p?.getAvailableQualityLevels?.() ?? [];
  });
}

/**
 * Get video stats including itag
 */
async function getVideoStats(page) {
  return page.evaluate(() => {
    const p = document.getElementById('movie_player');
    return p?.getVideoStats?.() ?? {};
  });
}

/**
 * Dismiss YouTube consent dialog if present
 */
async function dismissConsent(page) {
  try {
    // YouTube consent dialog selectors vary by region
    const acceptBtn = page.locator(
      'button[aria-label="Accept all"], button[aria-label="Accept the use of cookies and other data for the purposes described"], tp-yt-paper-button.ytd-consent-bump-v2-lightbox:has-text("Accept all"), form[action*="consent"] button:has-text("Accept"), button:has-text("Reject all")'
    );
    if (await acceptBtn.first().isVisible({ timeout: 5000 })) {
      await acceptBtn.first().click();
      await page.waitForTimeout(1000);
    }
  } catch {
    // No consent dialog
  }
}

// ════════════════════════════════════════════════════════════════════
// Tests
// ════════════════════════════════════════════════════════════════════

test.describe('YouTube Force Max Quality Extension', () => {
  /** @type {import('@playwright/test').BrowserContext} */
  let context;
  let extensionId;

  test.beforeAll(async () => {
    const result = await launchWithExtension();
    context = result.context;
    extensionId = result.extensionId;
  });

  test.afterAll(async () => {
    await context?.close();
  });

  test('forces max quality on 4K video', async () => {
    const page = await context.newPage();

    await page.goto(VIDEO_4K, { waitUntil: 'domcontentloaded' });
    await dismissConsent(page);
    await saveScreenshot(page, 'after-goto-4k');
    await waitForPlayer(page);

    // Wait for extension to apply quality (retry loop)
    await page.waitForFunction(
      () => {
        const p = document.getElementById('movie_player');
        const q = p?.getPlaybackQuality?.();
        // Should be hd2160 or hd1440 (highest available)
        return q && (q === 'hd2160' || q === 'hd1440');
      },
      { timeout: 30_000 }
    );

    const quality = await getQuality(page);
    const levels = await getAvailableLevels(page);
    console.log(`Quality: ${quality}, Available: ${levels.join(', ')}`);

    // The quality should be the highest available (first in the list, excluding 'auto')
    const expected = levels.filter((l) => l !== 'auto')[0];
    expect(quality).toBe(expected);

    await page.close();
  });

  test('activates theatre mode', async () => {
    const page = await context.newPage();

    await page.goto(VIDEO_4K, { waitUntil: 'domcontentloaded' });
    await dismissConsent(page);
    await waitForPlayer(page);

    // Wait for theatre mode to be applied
    await page.waitForFunction(
      () => {
        const flexy = document.querySelector('ytd-watch-flexy');
        return flexy?.hasAttribute('theater');
      },
      { timeout: 30_000 }
    );

    const isTheatre = await page.evaluate(() => {
      return document.querySelector('ytd-watch-flexy')?.hasAttribute('theater') ?? false;
    });
    expect(isTheatre).toBe(true);

    await page.close();
  });

  test('popup settings persist and update player', async () => {
    // Open popup
    const popupUrl = extensionId
      ? `chrome-extension://${extensionId}/popup/popup.html`
      : null;

    test.skip(!popupUrl, 'Could not determine extension ID');

    const popupPage = await context.newPage();
    await popupPage.goto(popupUrl);

    // Change quality to 720p
    await popupPage.selectOption('#quality', 'hd720');
    // Disable theatre mode
    const theatreCheckbox = popupPage.locator('#theatre');
    if (await theatreCheckbox.isChecked()) {
      await theatreCheckbox.click();
    }

    // Verify storage was updated
    const storedQuality = await popupPage.evaluate(() => {
      return new Promise((resolve) => {
        chrome.storage.local.get('quality', (items) => resolve(items.quality));
      });
    });
    expect(storedQuality).toBe('hd720');

    const storedTheatre = await popupPage.evaluate(() => {
      return new Promise((resolve) => {
        chrome.storage.local.get('theatre', (items) => resolve(items.theatre));
      });
    });
    expect(storedTheatre).toBe(false);

    await popupPage.close();

    // Now open a video and verify 720p is applied
    const page = await context.newPage();
    await page.goto(VIDEO_4K, { waitUntil: 'domcontentloaded' });
    await dismissConsent(page);
    await waitForPlayer(page);

    await page.waitForFunction(
      () => {
        const p = document.getElementById('movie_player');
        const q = p?.getPlaybackQuality?.();
        return q === 'hd720';
      },
      { timeout: 30_000 }
    );

    expect(await getQuality(page)).toBe('hd720');

    // Note: We can't reliably assert theatre mode is off because YouTube
    // itself persists the theatre state. What we verify is that our extension
    // did NOT force it on (the setting was disabled). YouTube may still have
    // it on from the previous test where we clicked the button.

    await page.close();

    // Reset settings back to defaults
    const resetPage = await context.newPage();
    await resetPage.goto(popupUrl);
    await resetPage.selectOption('#quality', 'max');
    const theatreReset = resetPage.locator('#theatre');
    if (!(await theatreReset.isChecked())) {
      await theatreReset.click();
    }
    await resetPage.close();
  });

  test('handles SPA navigation', async () => {
    const page = await context.newPage();

    // Start on a video
    await page.goto(VIDEO_4K, { waitUntil: 'domcontentloaded' });
    await dismissConsent(page);
    await waitForPlayer(page);

    // SPA-navigate to a different video by clicking a sidebar suggestion
    // or by programmatically navigating via YouTube's SPA router
    await page.evaluate((url) => {
      // Trigger SPA navigation the same way YouTube does
      const a = document.createElement('a');
      a.href = url;
      a.click();
    }, VIDEO_1080);

    // Wait for the URL to change
    await page.waitForURL('**/watch**', { timeout: 15_000 });

    // Wait for the new video's player to be ready
    await waitForPlayer(page, 30_000);

    // Wait for quality to be forced on the new video
    await page.waitForFunction(
      () => {
        const p = document.getElementById('movie_player');
        const q = p?.getPlaybackQuality?.();
        return q && q !== 'auto' && q !== 'unknown';
      },
      { timeout: 30_000 }
    );

    const quality = await getQuality(page);
    const levels = await getAvailableLevels(page);
    const expected = levels.filter((l) => l !== 'auto')[0];
    console.log(`SPA nav - Quality: ${quality}, Expected: ${expected}`);
    expect(quality).toBe(expected);

    await page.close();
  });
});

// ════════════════════════════════════════════════════════════════════
// Premium tests (requires YouTube Premium cookies)
// ════════════════════════════════════════════════════════════════════

test.describe('Premium enhanced bitrate', () => {
  /** @type {import('@playwright/test').BrowserContext} */
  let context;
  let extensionId;
  const hasCookies = fs.existsSync(COOKIES_PATH);

  test.beforeAll(async () => {
    test.skip(!hasCookies, 'No YouTube cookies file found');

    const result = await launchWithExtension();
    context = result.context;
    extensionId = result.extensionId;

    // Add YouTube Premium cookies
    const cookies = parseNetscapeCookies(COOKIES_PATH);
    const page = await context.newPage();
    await page.goto('https://www.youtube.com/', { waitUntil: 'domcontentloaded' });
    await context.addCookies(cookies);
    await page.close();
  });

  test.afterAll(async () => {
    await context?.close();
  });

  test('selects Premium enhanced bitrate when available', async () => {
    test.skip(!hasCookies, 'No YouTube cookies file found');

    const page = await context.newPage();
    // Use a 1080p video where Premium enhanced bitrate is typically available
    await page.goto(VIDEO_1080, { waitUntil: 'domcontentloaded' });
    await waitForPlayer(page);

    // Wait for quality to be applied
    await page.waitForFunction(
      () => {
        const p = document.getElementById('movie_player');
        const q = p?.getPlaybackQuality?.();
        return q && q !== 'auto' && q !== 'unknown';
      },
      { timeout: 30_000 }
    );

    const stats = await getVideoStats(page);
    const qualityData = await page.evaluate(() => {
      const p = document.getElementById('movie_player');
      return p?.getAvailableQualityData?.() ?? [];
    });

    console.log(`Itag: ${stats.fmt}`);
    console.log(
      'Quality data:',
      JSON.stringify(qualityData.map((q) => ({
        quality: q.quality,
        formatId: q.formatId,
        premium: !!q.paygatedQualityDetails,
      })))
    );

    // Check if Premium itags are present and if one was selected
    const premiumItags = [356, 712, 721];
    const hasPremiumFormat = qualityData.some((q) => q.paygatedQualityDetails);

    if (hasPremiumFormat) {
      // The extension should have selected a Premium format
      expect(premiumItags).toContain(Number(stats.fmt));
      console.log(`Premium itag ${stats.fmt} selected!`);
    } else {
      console.log('No Premium formats available for this video/account');
    }

    await page.close();
  });
});
