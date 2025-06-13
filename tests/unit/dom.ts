import { searchHTML, printElement } from "../../src/tools/dom";

// Helper function to create mock shadow DOM
function createMockShadowDOM(
  hostElement: Element,
  innerHTML: string = "",
): ShadowRoot {
  const shadowRoot = hostElement.attachShadow({ mode: "open" });
  shadowRoot.innerHTML = innerHTML;
  return shadowRoot;
}

// Mock Puppeteer Page for testing
const createMockPage = (evaluateResult: any) => ({
  evaluate: jest.fn().mockImplementation((fn, ...args) => {
    return Promise.resolve(fn(...args));
  }),
});

// Mock console methods to reduce noise in tests
const originalConsole = global.console;
beforeAll(() => {
  global.console = {
    ...originalConsole,
    log: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    info: jest.fn(),
    debug: jest.fn(),
  };
});

afterAll(() => {
  global.console = originalConsole;
});

describe("DOM Tools", () => {
  beforeEach(() => {
    // Clear the DOM before each test
    document.body.innerHTML = "";
    document.head.innerHTML = "";
  });

  describe("searchHTML", () => {
    test("should find elements containing text content", async () => {
      document.body.innerHTML = `
        <div class="container">
          <h1>Welcome</h1>
          <p>Option 1 is available</p>
          <p>Option 2 is not</p>
        </div>
      `;

      const mockPage = createMockPage(null);
      const result = await searchHTML(mockPage as any, "Option 1");

      expect(result).toContain("Option 1 is available");
      expect(result).toContain('<div class="container">');
      expect(result).not.toContain("Option 2 is not");
    });

    test("should find elements by attribute values", async () => {
      document.body.innerHTML = `
        <div class="main">
          <select class="test-select" id="test-select">
            <option value="">Select an option</option>
            <option value="option1">Choice 1</option>
            <option value="option2">Choice 2</option>
          </select>
        </div>
      `;

      const mockPage = createMockPage(null);
      const result = await searchHTML(mockPage as any, "option1");

      expect(result).toContain('value="option1"');
      expect(result).toContain('<select class="test-select" id="test-select">');
    });

    test("should handle nested elements correctly", async () => {
      document.body.innerHTML = `
        <div class="outer">
          <div class="middle">
            <div class="inner">Target text</div>
          </div>
          <div class="sibling">Other content</div>
        </div>
      `;

      const mockPage = createMockPage(null);
      const result = await searchHTML(mockPage as any, "Target text");

      expect(result).toContain('<div class="outer">');
      expect(result).toContain('<div class="middle">');
      expect(result).toContain('<div class="inner">');
      expect(result).toContain("Target text");
      expect(result).toContain("[...]"); // Should show [...] for sibling without target
    });

    test("should skip script, style, and svg elements", async () => {
      document.body.innerHTML = `
        <div>
          <p>Visible content with target</p>
          <script>console.log('target should not be found');</script>
          <style>.target { color: red; }</style>
          <svg><text>target in svg</text></svg>
        </div>
      `;

      const mockPage = createMockPage(null);
      const result = await searchHTML(mockPage as any, "target");

      expect(result).toContain("Visible content with target");
      expect(result).not.toContain("console.log");
      expect(result).not.toContain("color: red");
      expect(result).not.toContain("target in svg");
    });

    test("should handle shadow DOM content", async () => {
      const hostElement = document.createElement("div");
      hostElement.id = "shadow-host";
      document.body.appendChild(hostElement);

      const shadowRoot = createMockShadowDOM(
        hostElement,
        `
        <div class="shadow-content">
          <p>Shadow DOM target text</p>
        </div>
      `,
      );

      const mockPage = createMockPage(null);
      const result = await searchHTML(mockPage as any, "Shadow DOM target");

      expect(result).toContain("shadow-content");
      expect(result).toContain("Shadow DOM target text");
    });

    test("should handle elements without target content", async () => {
      document.body.innerHTML = `
        <div class="container">
          <div class="has-target">Found it!</div>
          <div class="no-target">Nothing here</div>
          <div class="also-no-target">Still nothing</div>
        </div>
      `;

      const mockPage = createMockPage(null);
      const result = await searchHTML(mockPage as any, "Found it");

      expect(result).toContain("Found it!");
      expect(result).toContain("[...]"); // Should show [...] for elements without target
    });

    test("should be case insensitive", async () => {
      document.body.innerHTML = `
        <div>
          <p>UPPERCASE TARGET</p>
          <p>lowercase target</p>
          <p>MiXeD CaSe TaRgEt</p>
        </div>
      `;

      const mockPage = createMockPage(null);
      const result = await searchHTML(mockPage as any, "target");

      expect(result).toContain("UPPERCASE TARGET");
      expect(result).toContain("lowercase target");
      expect(result).toContain("MiXeD CaSe TaRgEt");
    });

    test("should handle empty body", async () => {
      document.body.innerHTML = "";

      const mockPage = createMockPage(null);
      const result = await searchHTML(mockPage as any, "anything");

      expect(result).toBe("<body>\n</body>");
    });

    test("should preserve proper indentation", async () => {
      document.body.innerHTML = `
        <div class="level1">
          <div class="level2">
            <div class="level3">Target content</div>
          </div>
        </div>
      `;

      const mockPage = createMockPage(null);
      const result = await searchHTML(mockPage as any, "Target content");

      const lines = result.split("\n");
      expect(lines[1]).toMatch(/^  <div/); // Level 1 - 2 spaces
      expect(lines[2]).toMatch(/^    <div/); // Level 2 - 4 spaces
      expect(lines[3]).toMatch(/^      <div/); // Level 3 - 6 spaces
    });
  });

  describe("printElement", () => {
    test("should return full HTML for matching element", async () => {
      document.body.innerHTML = `
        <select class="test-select" id="test-select">
          <option value="">Select an option</option>
          <option value="option1">Option 1</option>
          <option value="option2">Option 2</option>
          <option value="option3">Option 3</option>
        </select>
      `;

      const mockPage = createMockPage(null);
      const result = await printElement(mockPage as any, ".test-select");

      expect(result).toContain('<select class="test-select" id="test-select">');
      expect(result).toContain('<option value="">Select an option</option>');
      expect(result).toContain('<option value="option1">Option 1</option>');
      expect(result).toContain('<option value="option2">Option 2</option>');
      expect(result).toContain('<option value="option3">Option 3</option>');
      expect(result).toContain("</select>");
    });

    test("should handle nested elements", async () => {
      document.body.innerHTML = `
        <div class="container">
          <div class="header">
            <h1>Title</h1>
            <p>Description</p>
          </div>
          <div class="content">
            <span>Content text</span>
          </div>
        </div>
      `;

      const mockPage = createMockPage(null);
      const result = await printElement(mockPage as any, ".container");

      expect(result).toContain('<div class="container">');
      expect(result).toContain('<div class="header">');
      expect(result).toContain("<h1>Title</h1>");
      expect(result).toContain("<p>Description</p>");
      expect(result).toContain('<div class="content">');
      expect(result).toContain("<span>Content text</span>");
    });

    test("should handle shadow DOM content", async () => {
      const hostElement = document.createElement("div");
      hostElement.className = "shadow-host";
      document.body.appendChild(hostElement);

      const shadowRoot = createMockShadowDOM(
        hostElement,
        `
        <div class="shadow-content">
          <h4>Shadow Title</h4>
          <p>Shadow paragraph</p>
          <button class="shadow-button">Shadow Button</button>
        </div>
      `,
      );

      const mockPage = createMockPage(null);
      const result = await printElement(mockPage as any, ".shadow-host");

      expect(result).toContain('<div class="shadow-host">');
      expect(result).toContain('<div class="shadow-content">');
      expect(result).toContain("<h4>Shadow Title</h4>");
      expect(result).toContain("<p>Shadow paragraph</p>");
      expect(result).toContain(
        '<button class="shadow-button">Shadow Button</button>',
      );
    });

    test("should handle elements with attributes", async () => {
      document.body.innerHTML = `
        <input
          type="text"
          id="test-input"
          class="form-control"
          placeholder="Enter text"
          value="default value"
          data-testid="input-field"
        />
      `;

      const mockPage = createMockPage(null);
      const result = await printElement(mockPage as any, "#test-input");

      expect(result).toContain('type="text"');
      expect(result).toContain('id="test-input"');
      expect(result).toContain('class="form-control"');
      expect(result).toContain('placeholder="Enter text"');
      expect(result).toContain('value="default value"');
      expect(result).toContain('data-testid="input-field"');
    });

    test("should handle self-closing elements", async () => {
      document.body.innerHTML = `
        <div>
          <img src="test.jpg" alt="Test image" />
          <br />
          <input type="text" />
        </div>
      `;

      const mockPage = createMockPage(null);
      const result = await printElement(mockPage as any, "div");

      expect(result).toContain('<img src="test.jpg" alt="Test image"></img>');
      expect(result).toContain("<br></br>");
      expect(result).toContain('<input type="text"></input>');
    });

    test("should throw error for non-existent element", async () => {
      document.body.innerHTML = `<div>Some content</div>`;

      const mockPage = {
        evaluate: jest.fn().mockImplementation((fn, selector) => {
          // Simulate the actual browser behavior
          const element = document.querySelector(selector);
          if (!element) {
            throw new Error(`Element not found: ${selector}`);
          }
          return fn(selector);
        }),
      };

      await expect(
        printElement(mockPage as any, ".non-existent"),
      ).rejects.toThrow("Element not found: .non-existent");
    });

    test("should preserve proper indentation in nested elements", async () => {
      document.body.innerHTML = `
        <div class="level1">
          <div class="level2">
            <div class="level3">
              <span>Deep content</span>
            </div>
          </div>
        </div>
      `;

      const mockPage = createMockPage(null);
      const result = await printElement(mockPage as any, ".level1");

      const lines = result.split("\n");
      expect(lines[0]).toMatch(/^<div/); // Level 1 - no indent
      expect(lines[1]).toMatch(/^  <div/); // Level 2 - 2 spaces
      expect(lines[2]).toMatch(/^    <div/); // Level 3 - 4 spaces
      expect(lines[3]).toMatch(/^      <span/); // Span - 6 spaces
    });

    test("should handle mixed content (text and elements)", async () => {
      document.body.innerHTML = `
        <div class="mixed">
          Some text before
          <span>inline element</span>
          some text after
          <div>block element</div>
          final text
        </div>
      `;

      const mockPage = createMockPage(null);
      const result = await printElement(mockPage as any, ".mixed");

      expect(result).toContain("Some text before");
      expect(result).toContain("<span>inline element</span>");
      expect(result).toContain("some text after");
      expect(result).toContain("<div>block element</div>");
      expect(result).toContain("final text");
    });

    test("should handle elements with no content", async () => {
      document.body.innerHTML = `<div class="empty"></div>`;

      const mockPage = createMockPage(null);
      const result = await printElement(mockPage as any, ".empty");

      expect(result).toBe('<div class="empty"></div>');
    });
  });

  describe("Integration tests", () => {
    test("should work with realistic select element structure", async () => {
      document.body.innerHTML = `
        <body>
          <div class="main-content">
            <h1>Test Page</h1>
            <div class="test-elements">
              <h2>Form Elements</h2>
              <select class="test-select" id="test-select">
                <option value="">Select an option</option>
                <option value="option1">Option 1</option>
                <option value="option2">Option 2</option>
                <option value="option3">Option 3</option>
              </select>
            </div>
          </div>
        </body>
      `;

      const mockPage = createMockPage(null);

      // Test searchHTML
      const searchResult = await searchHTML(mockPage as any, "Option 1");
      expect(searchResult).toContain("<body>");
      expect(searchResult).toContain('<div class="main-content">');
      expect(searchResult).toContain('<div class="test-elements">');
      expect(searchResult).toContain(
        '<select class="test-select" id="test-select">',
      );
      expect(searchResult).toContain(
        '<option value="option1">Option 1</option>',
      );
      expect(searchResult).toContain("[...]"); // Should contain abbreviated sections

      // Test printElement
      const printResult = await printElement(mockPage as any, ".test-select");
      expect(printResult).toContain(
        '<select class="test-select" id="test-select">',
      );
      expect(printResult).toContain(
        '<option value="">Select an option</option>',
      );
      expect(printResult).toContain(
        '<option value="option1">Option 1</option>',
      );
      expect(printResult).toContain(
        '<option value="option2">Option 2</option>',
      );
      expect(printResult).toContain(
        '<option value="option3">Option 3</option>',
      );
      expect(printResult).toContain("</select>");
    });

    test("should handle complex shadow DOM scenarios", async () => {
      // Create main content
      document.body.innerHTML = `
        <div class="main">
          <div class="shadow-host" id="shadow-host">
            <p>This div contains a shadow DOM.</p>
          </div>
        </div>
      `;

      const shadowHost = document.getElementById("shadow-host")!;
      const shadowRoot = createMockShadowDOM(
        shadowHost,
        `
        <div class="shadow-wrapper">
          <h4>Shadow Content</h4>
          <p>Shadow paragraph with target keyword</p>
          <button class="shadow-btn">Shadow Button</button>
        </div>
      `,
      );

      const mockPage = createMockPage(null);

      // Test searchHTML finds shadow DOM content
      const searchResult = await searchHTML(mockPage as any, "target keyword");
      expect(searchResult).toContain("shadow-wrapper");
      expect(searchResult).toContain("Shadow paragraph with target keyword");

      // Test printElement includes shadow DOM
      const printResult = await printElement(mockPage as any, ".shadow-host");
      expect(printResult).toContain(
        '<div class="shadow-host" id="shadow-host">',
      );
      expect(printResult).toContain('<div class="shadow-wrapper">');
      expect(printResult).toContain("<h4>Shadow Content</h4>");
      expect(printResult).toContain(
        "<p>Shadow paragraph with target keyword</p>",
      );
      expect(printResult).toContain(
        '<button class="shadow-btn">Shadow Button</button>',
      );
    });
  });
});
