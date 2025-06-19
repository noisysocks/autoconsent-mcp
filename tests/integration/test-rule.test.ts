/**
 * Integration tests for rule testing functionality
 *
 * Prerequisites:
 * - Test server must be running on localhost:8080
 * - Start with: npm run serve-test-site
 *
 * These tests verify the testRule function works correctly with real browser
 * automation and the autoconsent library. They test:
 * - CMP detection
 * - Popup detection
 * - Opt-out/opt-in actions
 * - Error handling
 * - Different viewport sizes
 * - Performance characteristics
 */

import puppeteer, { Browser, Page } from "puppeteer";
import { testRule } from "../../src/tools/test-rule";

const VIEWPORT_WIDTH = 1280;
const VIEWPORT_HEIGHT = 720;

const TEST_URL = "http://localhost:8080";

const TEST_RULE = {
  name: "test-cookie-banner",
  detectCmp: [{ exists: "#cookie-banner" }],
  detectPopup: [{ visible: "#cookie-banner" }],
  optOut: [{ click: "#reject-all" }],
  optIn: [{ click: "#accept-all" }],
};

describe("Rule Integration Tests", () => {
  let browser: Browser;
  let page: Page;

  beforeAll(async () => {
    // Check if localhost:8080 is accessible
    try {
      const testPage = await puppeteer
        .launch({ headless: true })
        .then((b) => b.newPage());
      await testPage.goto(TEST_URL, { timeout: 5000 });
      await testPage.close();
      await (await testPage.browser()).close();
    } catch (error) {
      throw new Error(
        `Test server not accessible at ${TEST_URL}. Please start the test server with: npm run serve-test-site`,
      );
    }

    browser = await puppeteer.launch({
      headless: true,
      defaultViewport: {
        width: VIEWPORT_WIDTH,
        height: VIEWPORT_HEIGHT,
      },
    });
  });

  beforeEach(async () => {
    page = await browser.newPage();
  });

  afterEach(async () => {
    if (page) {
      await page.close();
    }
  });

  afterAll(async () => {
    if (browser) {
      await browser.close();
    }
  });

  describe("testRule", () => {
    test("should detect CMP and popup on test site", async () => {
      const results = await testRule(page, TEST_URL, TEST_RULE, {
        viewportWidth: VIEWPORT_WIDTH,
        viewportHeight: VIEWPORT_HEIGHT,
      });

      expect(results).toBeDefined();
      expect(results.errors).toBeDefined();
      expect(Array.isArray(results.errors)).toBe(true);

      // The cookie banner should be detected
      expect(results.cmpDetectedMessage).toBeDefined();
      expect(results.cmpDetectedMessage?.type).toBe("cmpDetected");

      // The popup should be found
      expect(results.popupFoundMessage).toBeDefined();
      expect(results.popupFoundMessage?.type).toBe("popupFound");
    }, 15000);

    test("should handle opt-out action", async () => {
      const results = await testRule(page, TEST_URL, TEST_RULE, {
        viewportWidth: VIEWPORT_WIDTH,
        viewportHeight: VIEWPORT_HEIGHT,
      });

      expect(results).toBeDefined();

      // Should have an opt-out result
      expect(results.optOutResultMessage).toBeDefined();
      expect(results.optOutResultMessage?.type).toBe("optOutResult");
    }, 15000);

    test("should handle different viewport sizes", async () => {
      const smallViewport = { viewportWidth: 800, viewportHeight: 600 };

      const results = await testRule(page, TEST_URL, TEST_RULE, smallViewport);

      expect(results).toBeDefined();
      expect(results.errors).toBeDefined();
      expect(Array.isArray(results.errors)).toBe(true);
    }, 15000);

    test("should handle invalid URL gracefully", async () => {
      const invalidUrl = "http://invalid-url-that-does-not-exist";

      await expect(
        testRule(page, invalidUrl, TEST_RULE, {
          viewportWidth: VIEWPORT_WIDTH,
          viewportHeight: VIEWPORT_HEIGHT,
        }),
      ).rejects.toThrow();
    }, 15000);

    test("should handle custom rule configurations", async () => {
      const customRule = {
        name: "custom-test-rule",
        detectCmp: [{ exists: "#cookie-banner" }],
        detectPopup: [{ visible: "#cookie-banner" }],
        optOut: [{ click: "#accept-all" }], // Different action
        optIn: [{ click: "#reject-all" }],
      };

      const results = await testRule(page, TEST_URL, customRule, {
        viewportWidth: VIEWPORT_WIDTH,
        viewportHeight: VIEWPORT_HEIGHT,
      });

      expect(results).toBeDefined();
      expect(results.cmpDetectedMessage).toBeDefined();
    }, 15000);

    test("should collect error messages when rule fails", async () => {
      const invalidRule = {
        name: "invalid-rule",
        detectCmp: [{ exists: "#non-existent-element" }],
        detectPopup: [{ visible: "#non-existent-popup" }],
        optOut: [{ click: "#non-existent-button" }],
        optIn: [{ click: "#non-existent-accept" }],
      };

      const results = await testRule(page, TEST_URL, invalidRule, {
        viewportWidth: VIEWPORT_WIDTH,
        viewportHeight: VIEWPORT_HEIGHT,
      });

      expect(results).toBeDefined();
      expect(results.errors).toBeDefined();

      // Should not detect CMP with invalid selectors
      expect(results.cmpDetectedMessage).toBeUndefined();
      expect(results.popupFoundMessage).toBeUndefined();
    }, 15000);
  });

  describe("Rule validation", () => {
    test("should work with minimal rule configuration", async () => {
      const minimalRule = {
        name: "minimal-rule",
        detectCmp: [{ exists: "#cookie-banner" }],
        detectPopup: [{ visible: "#cookie-banner" }],
        optOut: [{ click: "#reject-all" }],
        optIn: [{ click: "#accept-all" }],
      };

      const results = await testRule(page, TEST_URL, minimalRule);

      expect(results).toBeDefined();
      expect(results.cmpDetectedMessage).toBeDefined();
    }, 15000);

    test("should handle complex rule with multiple steps", async () => {
      const complexRule = {
        name: "complex-rule",
        detectCmp: [
          { exists: "#cookie-banner" },
          { visible: "#cookie-banner" },
        ],
        detectPopup: [
          { visible: "#cookie-banner" },
          { exists: ".cookie-content" },
        ],
        optOut: [
          { click: "#manage-preferences" },
          { waitForThenClick: ".reject-all" },
        ],
        optIn: [{ click: "#accept-all" }],
      };

      const results = await testRule(page, TEST_URL, complexRule);

      expect(results).toBeDefined();
      // Complex rules might have different behavior
      expect(results.errors).toBeDefined();
    }, 20000);
  });

  describe("Performance and reliability", () => {
    test("should complete within reasonable time", async () => {
      const startTime = Date.now();

      await testRule(page, TEST_URL, TEST_RULE);

      const endTime = Date.now();
      const duration = endTime - startTime;

      // Should complete within 10 seconds
      expect(duration).toBeLessThan(10000);
    });

    test("should handle multiple concurrent tests", async () => {
      const pages = await Promise.all(
        Array(3)
          .fill(null)
          .map(() => browser.newPage()),
      );

      const promises = pages.map((testPage) =>
        testRule(testPage, TEST_URL, TEST_RULE, {
          viewportWidth: VIEWPORT_WIDTH,
          viewportHeight: VIEWPORT_HEIGHT,
        }),
      );

      const results = await Promise.all(promises);

      // Clean up test pages
      await Promise.all(pages.map((testPage) => testPage.close()));

      expect(results).toHaveLength(3);
      results.forEach((result) => {
        expect(result).toBeDefined();
        expect(result.errors).toBeDefined();
      });
    }, 30000);
  });
});
