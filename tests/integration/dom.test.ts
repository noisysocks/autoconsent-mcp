/**
 * Integration tests for DOM functions against real test site
 *
 * Prerequisites:
 * - Test server must be running on localhost:8080
 * - Start with: npm run serve-test-site
 *
 * These tests verify the searchHTML and printElement functions work correctly
 * with real HTML content including shadow DOM and complex structures.
 */

import puppeteer, { Browser, Page } from "puppeteer";
import { searchHTML, printElement } from "../../src/tools/dom";

const VIEWPORT_WIDTH = 1280;
const VIEWPORT_HEIGHT = 720;
const TEST_URL = "http://localhost:8080";

describe("DOM Functions Integration Tests", () => {
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
    await page.goto(TEST_URL, { waitUntil: "domcontentloaded" });
    // Wait for shadow DOM to be created
    await new Promise((resolve) => setTimeout(resolve, 1000));
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

  describe("searchHTML", () => {
    test("should find Option 1 in select element as specified in example", async () => {
      const result = await searchHTML(page, "Option 1");

      expect(result).toContain("<body>");
      expect(result).toContain("</body>");
      expect(result).toContain('<div class="main-content">');
      expect(result).toContain('<div class="test-elements">');
      expect(result).toContain('<select class="test-select" id="test-select">');
      expect(result).toContain('<option value="option1">Option 1</option>');
      expect(result).toContain("[...]");

      // Should not contain options that don't match
      expect(result).not.toContain('<option value="option2">Option 2</option>');
      expect(result).not.toContain('<option value="option3">Option 3</option>');

      // Verify structure matches expected example
      const lines = result
        .split("\n")
        .map((line) => line.trim())
        .filter((line) => line);
      expect(lines[0]).toBe("<body>");
      expect(lines[lines.length - 1]).toBe("</body>");
    }, 10000);

    test("should match exact format from specification example", async () => {
      const result = await searchHTML(page, "Option 1");

      // The result should contain the exact structure pattern from the spec
      expect(result).toMatch(/^<body>/);
      expect(result).toMatch(/<div class="main-content">/);
      expect(result).toMatch(/\[...\]/);
      expect(result).toMatch(/<div class="test-elements">/);
      expect(result).toMatch(/<select class="test-select" id="test-select">/);
      expect(result).toMatch(/<option value="option1">Option 1<\/option>/);
      expect(result).toMatch(/<\/select>/);
      expect(result).toMatch(/<\/div>/);
      expect(result).toMatch(/<\/body>$/);

      // Verify it follows the expected structure hierarchy
      const bodyIndex = result.indexOf("<body>");
      const mainContentIndex = result.indexOf('<div class="main-content">');
      const testElementsIndex = result.indexOf('<div class="test-elements">');
      const selectIndex = result.indexOf('<select class="test-select"');
      const optionIndex = result.indexOf(
        '<option value="option1">Option 1</option>',
      );

      expect(bodyIndex).toBeLessThan(mainContentIndex);
      expect(mainContentIndex).toBeLessThan(testElementsIndex);
      expect(testElementsIndex).toBeLessThan(selectIndex);
      expect(selectIndex).toBeLessThan(optionIndex);
    }, 10000);

    test("should find cookie banner elements", async () => {
      const result = await searchHTML(page, "Accept All");

      expect(result).toContain('<button class="cookie-button accept-all"');
      expect(result).toContain("Accept All");
      expect(result).toContain('<div class="cookie-banner"');
      expect(result).toContain("[...]");
    }, 10000);

    test("should find shadow DOM content", async () => {
      const result = await searchHTML(page, "Shadow DOM");

      expect(result).toContain("shadow-host");
      expect(result).toContain("Shadow DOM");
      expect(result).toContain("shadow-content");
    }, 10000);

    test("should handle case insensitive search", async () => {
      const result = await searchHTML(page, "OPTION 1");

      expect(result).toContain('<option value="option1">Option 1</option>');
    }, 10000);

    test("should find elements by attribute values", async () => {
      const result = await searchHTML(page, "option2");

      expect(result).toContain('value="option2"');
      expect(result).toContain("Option 2");
    }, 10000);

    test("should skip script and style content", async () => {
      const result = await searchHTML(page, "function");

      // Should not include script content even if it contains the search term
      expect(result).not.toContain("function acceptAllCookies");
      expect(result).not.toContain("console.log");
    }, 10000);

    test("should find nested elements correctly", async () => {
      const result = await searchHTML(page, "Manage Preferences");

      expect(result).toContain("cookie-buttons");
      expect(result).toContain("Manage Preferences");
      expect(result).toContain("[...]");
    }, 10000);

    test("should find text in headings", async () => {
      const result = await searchHTML(page, "Test Site");

      expect(result).toContain("<h1>");
      expect(result).toContain("Test Site");
    }, 10000);
  });

  describe("printElement", () => {
    test("should return complete select element as specified in example", async () => {
      const result = await printElement(page, ".test-select");

      expect(result).toBe(
        '<select class="test-select" id="test-select">\n' +
          '  <option value="">Select an option</option>\n' +
          '  <option value="option1">Option 1</option>\n' +
          '  <option value="option2">Option 2</option>\n' +
          '  <option value="option3">Option 3</option>\n' +
          "</select>",
      );
    }, 10000);

    test("should print cookie banner with all nested elements", async () => {
      const result = await printElement(page, ".cookie-banner");

      expect(result).toContain('<div class="cookie-banner"');
      expect(result).toContain('<div class="cookie-content">');
      expect(result).toContain('<div class="cookie-text">');
      expect(result).toContain('<div class="cookie-buttons">');
      expect(result).toContain("Accept All");
      expect(result).toContain("Reject All");
      expect(result).toContain("Manage Preferences");
    }, 10000);

    test("should print shadow DOM content", async () => {
      const result = await printElement(page, "#shadow-host");

      expect(result).toContain('<div class="shadow-host"');
      expect(result).toContain("This div contains a shadow DOM");
      expect(result).toContain("shadow-content");
      expect(result).toContain("Content inside Shadow DOM");
      expect(result).toContain("Shadow Button");
    }, 10000);

    test("should print button elements correctly", async () => {
      const result = await printElement(page, "#test-button");

      expect(result).toContain('<button class="test-button" id="test-button"');
      expect(result).toContain("onclick=\"showMessage('Button clicked!')\"");
      expect(result).toContain("Click Me");
    }, 10000);

    test("should handle elements with complex attributes", async () => {
      const result = await printElement(page, "#accept-all");

      expect(result).toContain('id="accept-all"');
      expect(result).toContain('class="cookie-button accept-all"');
      expect(result).toContain('onclick="acceptAllCookies()"');
      expect(result).toContain("Accept All");
    }, 10000);

    test("should print nested div structures", async () => {
      const result = await printElement(page, ".main-content");

      expect(result).toContain('<div class="main-content">');
      expect(result).toContain("<h1>");
      expect(result).toContain("Test Site for Autoconsent MCP Server");
      expect(result).toContain('<div class="test-elements">');
    }, 10000);

    test("should handle heading elements", async () => {
      const result = await printElement(page, "h1");

      expect(result).toBe("<h1>Test Site for Autoconsent MCP Server</h1>");
    }, 10000);

    test("should throw error for non-existent elements", async () => {
      await expect(printElement(page, ".non-existent-element")).rejects.toThrow(
        "Element not found: .non-existent-element",
      );
    }, 10000);

    test("should handle elements with mixed content", async () => {
      const result = await printElement(page, ".cookie-text");

      expect(result).toContain('<div class="cookie-text">');
      expect(result).toContain("<h3>We use cookies</h3>");
      expect(result).toContain("<p>");
      expect(result).toContain("This website uses cookies");
    }, 10000);
  });

  describe("Edge cases and error handling", () => {
    test("should handle searches with no results", async () => {
      const result = await searchHTML(page, "nonexistent-text-12345");

      expect(result).toContain("<body>");
      expect(result).toContain("</body>");
      expect(result).toContain("[...]");
    }, 10000);

    test("should handle special characters in search", async () => {
      const result = await searchHTML(page, "MCP Server");

      expect(result).toContain("MCP Server");
    }, 10000);

    test("should handle ID selectors", async () => {
      const result = await printElement(page, "#cookie-banner");

      expect(result).toContain('id="cookie-banner"');
    }, 10000);

    test("should handle class selectors", async () => {
      const result = await printElement(page, ".test-button");

      expect(result).toContain('class="test-button"');
    }, 10000);

    test("should handle attribute selectors", async () => {
      const result = await printElement(
        page,
        'button[onclick*="acceptAllCookies"]',
      );

      expect(result).toContain("acceptAllCookies");
    }, 10000);
  });

  describe("Performance and reliability", () => {
    test("should complete searchHTML within reasonable time", async () => {
      const startTime = Date.now();

      await searchHTML(page, "Test Site");

      const endTime = Date.now();
      const duration = endTime - startTime;

      // Should complete within 3 seconds
      expect(duration).toBeLessThan(3000);
    });

    test("should complete printElement within reasonable time", async () => {
      const startTime = Date.now();

      await printElement(page, ".main-content");

      const endTime = Date.now();
      const duration = endTime - startTime;

      // Should complete within 3 seconds
      expect(duration).toBeLessThan(3000);
    });

    test("should handle multiple concurrent searches", async () => {
      const searches = ["Option 1", "Accept All", "Test Site", "Shadow DOM"];

      const promises = searches.map((query) => searchHTML(page, query));
      const results = await Promise.all(promises);

      expect(results).toHaveLength(4);
      results.forEach((result) => {
        expect(result).toContain("<body>");
        expect(result).toContain("</body>");
      });
    }, 15000);

    test("should handle multiple concurrent element prints", async () => {
      const selectors = [
        ".test-select",
        "#test-button",
        ".cookie-banner",
        "h1",
      ];

      const promises = selectors.map((selector) =>
        printElement(page, selector),
      );
      const results = await Promise.all(promises);

      expect(results).toHaveLength(4);
      results.forEach((result) => {
        expect(result).toBeTruthy();
        expect(result.length).toBeGreaterThan(0);
      });
    }, 15000);
  });
});
