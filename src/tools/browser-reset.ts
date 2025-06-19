import { Page } from "puppeteer";

export type BrowserResetOptions = {
  clearCookies?: boolean;
  clearCache?: boolean;
  clearLocalStorage?: boolean;
  clearSessionStorage?: boolean;
};

/**
 * Resets browser data including cookies, cache, localStorage, and sessionStorage
 */
export async function resetBrowserData(
  page: Page,
  options: BrowserResetOptions = {
    clearCookies: true,
    clearCache: true,
    clearLocalStorage: true,
    clearSessionStorage: true,
  },
): Promise<void> {
  const client = await page.target().createCDPSession();

  // Clear cookies
  if (options.clearCookies) {
    await client.send("Network.clearBrowserCookies");
  }

  // Clear browser cache
  if (options.clearCache) {
    await client.send("Network.clearBrowserCache");
  }

  // Clear localStorage and sessionStorage
  if (options.clearLocalStorage || options.clearSessionStorage) {
    await page.evaluate((opts) => {
      if (opts.clearLocalStorage && typeof localStorage !== "undefined") {
        localStorage.clear();
      }
      if (opts.clearSessionStorage && typeof sessionStorage !== "undefined") {
        sessionStorage.clear();
      }
    }, options);
  }
}
