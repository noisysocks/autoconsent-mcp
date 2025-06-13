import { spawn, ChildProcess } from "child_process";
import { readFileSync } from "fs";
import { join } from "path";

describe("Autoconsent MCP Server Integration Tests", () => {
  let serverProcess: ChildProcess;
  let responseBuffer: string = "";
  let requestId = 1;

  const TEST_SITE_URL = "http://localhost:8080";

  beforeAll(async () => {
    // Build the project first
    const buildProcess = spawn("npm", ["run", "build"], {
      stdio: "inherit",
      cwd: process.cwd(),
    });

    await new Promise((resolve, reject) => {
      buildProcess.on("close", (code) => {
        if (code === 0) {
          resolve(void 0);
        } else {
          reject(new Error(`Build failed with code ${code}`));
        }
      });
    });

    // Start the MCP server
    serverProcess = spawn("node", ["dist/index.js"], {
      stdio: ["pipe", "pipe", "pipe"],
      cwd: process.cwd(),
    });

    // Buffer stdout data
    serverProcess.stdout?.on("data", (data) => {
      responseBuffer += data.toString();
    });

    serverProcess.stderr?.on("data", (data) => {
      console.error("Server stderr:", data.toString());
    });

    // Wait for server to start
    await new Promise((resolve) => setTimeout(resolve, 3000));
  });

  afterAll(async () => {
    if (serverProcess) {
      serverProcess.kill("SIGTERM");
      await new Promise((resolve) => setTimeout(resolve, 1000));
    }
  });

  function sendRequest(method: string, params: any = {}): Promise<any> {
    return new Promise((resolve, reject) => {
      const request = {
        jsonrpc: "2.0",
        id: requestId++,
        method,
        params,
      };

      const requestStr = JSON.stringify(request) + "\n";

      // Clear response buffer
      responseBuffer = "";

      // Set up timeout
      const timeout = setTimeout(() => {
        reject(new Error(`Request timeout for ${method}`));
      }, 15000);

      // Listen for response
      const checkResponse = () => {
        const lines = responseBuffer.split("\n").filter((line) => line.trim());

        for (const line of lines) {
          try {
            const response = JSON.parse(line);
            if (response.id === request.id) {
              clearTimeout(timeout);
              if (response.error) {
                reject(new Error(response.error.message || "Request failed"));
              } else {
                resolve(response.result);
              }
              return;
            }
          } catch (e) {
            // Not JSON, continue
          }
        }

        // Check again after a short delay
        setTimeout(checkResponse, 100);
      };

      // Send request
      serverProcess.stdin?.write(requestStr);

      // Start checking for response
      setTimeout(checkResponse, 100);
    });
  }

  describe("Basic server functionality", () => {
    it("should list all available tools", async () => {
      const tools = await sendRequest("tools/list");

      expect(tools).toBeDefined();
      expect(tools.tools).toBeInstanceOf(Array);
      expect(tools.tools.length).toBe(8);

      const toolNames = tools.tools.map((tool: any) => tool.name);
      expect(toolNames).toContain("navigate");
      expect(toolNames).toContain("screenshot");
      expect(toolNames).toContain("click");
      expect(toolNames).toContain("select");
      expect(toolNames).toContain("evaluate");
      expect(toolNames).toContain("search_html");
      expect(toolNames).toContain("print_element");
      expect(toolNames).toContain("test_rule");
    });

    it("should list available resources", async () => {
      const resources = await sendRequest("resources/list");

      expect(resources).toBeDefined();
      expect(resources.resources).toBeInstanceOf(Array);

      const resourceUris = resources.resources.map(
        (resource: any) => resource.uri,
      );
      expect(resourceUris).toContain("console://logs");
    });
  });

  describe("Navigation and basic browser operations", () => {
    it("should navigate to the test site", async () => {
      const result = await sendRequest("tools/call", {
        name: "navigate",
        arguments: {
          url: TEST_SITE_URL,
        },
      });

      expect(result).toBeDefined();
      expect(result.isError).toBe(false);
      expect(result.content[0].text).toContain(`Navigated to ${TEST_SITE_URL}`);
    });

    it("should take a screenshot", async () => {
      const result = await sendRequest("tools/call", {
        name: "screenshot",
        arguments: {
          name: "test-screenshot",
          width: 1280,
          height: 720,
        },
      });

      expect(result).toBeDefined();
      expect(result.isError).toBe(false);
      expect(result.content[0].text).toContain(
        "Screenshot 'test-screenshot' taken",
      );
      expect(result.content[1].type).toBe("image");
      expect(result.content[1].mimeType).toBe("image/png");
    });

    it("should execute JavaScript", async () => {
      const result = await sendRequest("tools/call", {
        name: "evaluate",
        arguments: {
          script: "document.title",
        },
      });

      expect(result).toBeDefined();
      expect(result.isError).toBe(false);
      expect(result.content[0].text).toContain("Test Site - Cookie Popup Demo");
    });
  });

  describe("DOM interaction tools", () => {
    beforeEach(async () => {
      // Ensure we're on the test site before each test
      await sendRequest("tools/call", {
        name: "navigate",
        arguments: { url: TEST_SITE_URL },
      });

      // Wait for page to load
      await new Promise((resolve) => setTimeout(resolve, 1000));
    });

    it("should verify button exists without clicking", async () => {
      // Check if button exists without clicking it (to avoid alert blocking)
      const checkResult = await sendRequest("tools/call", {
        name: "print_element",
        arguments: {
          selector: "#test-button",
        },
      });
      expect(checkResult.isError).toBe(false);
      expect(checkResult.content[0].text).toContain('id="test-button"');
      expect(checkResult.content[0].text).toContain("Click Me");
    });

    it("should click cookie banner buttons without alerts", async () => {
      // Test clicking cookie banner buttons which don't trigger alerts
      const result = await sendRequest("tools/call", {
        name: "click",
        arguments: {
          selector: "#accept-all",
        },
      });

      expect(result).toBeDefined();
      expect(result.isError).toBe(false);
      expect(result.content[0].text).toContain("Clicked: #accept-all");

      // Verify the banner is hidden
      const verifyResult = await sendRequest("tools/call", {
        name: "evaluate",
        arguments: {
          script:
            "document.getElementById('cookie-banner').classList.contains('hidden')",
        },
      });

      expect(verifyResult.isError).toBe(false);
      expect(verifyResult.content[0].text).toContain("true");
    });

    it("should select options", async () => {
      const result = await sendRequest("tools/call", {
        name: "select",
        arguments: {
          selector: "#test-select",
          value: "option1",
        },
      });

      expect(result).toBeDefined();
      expect(result.isError).toBe(false);
      expect(result.content[0].text).toContain(
        "Selected #test-select with: option1",
      );
    });

    it("should search HTML for specific content", async () => {
      const result = await sendRequest("tools/call", {
        name: "search_html",
        arguments: {
          query: "cookie",
        },
      });

      expect(result).toBeDefined();
      expect(result.isError).toBe(false);
      expect(result.content[0].text).toContain("cookie-banner");
      expect(result.content[0].text).toContain("We use cookies");
    });

    it("should print element HTML", async () => {
      const result = await sendRequest("tools/call", {
        name: "print_element",
        arguments: {
          selector: "#test-button",
        },
      });

      expect(result).toBeDefined();
      expect(result.isError).toBe(false);
      expect(result.content[0].text).toContain("<button");
      expect(result.content[0].text).toContain('id="test-button"');
      expect(result.content[0].text).toContain("Click Me");
    });
  });

  describe("Error handling", () => {
    it("should handle clicking non-existent elements", async () => {
      await sendRequest("tools/call", {
        name: "navigate",
        arguments: { url: TEST_SITE_URL },
      });

      const result = await sendRequest("tools/call", {
        name: "click",
        arguments: {
          selector: "#non-existent-element",
        },
      });

      expect(result).toBeDefined();
      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain("Failed to click");
    });

    it("should handle printing non-existent elements", async () => {
      await sendRequest("tools/call", {
        name: "navigate",
        arguments: { url: TEST_SITE_URL },
      });

      const result = await sendRequest("tools/call", {
        name: "print_element",
        arguments: {
          selector: "#non-existent-element",
        },
      });

      expect(result).toBeDefined();
      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain("Element not found");
    });
  });

  describe("Cookie banner workflow", () => {
    beforeEach(async () => {
      await sendRequest("tools/call", {
        name: "navigate",
        arguments: { url: TEST_SITE_URL },
      });

      // Wait for page to load
      await new Promise((resolve) => setTimeout(resolve, 1000));
    });

    it("should find and interact with cookie banner", async () => {
      // Search for cookie banner
      const searchResult = await sendRequest("tools/call", {
        name: "search_html",
        arguments: {
          query: "Accept All",
        },
      });

      expect(searchResult.isError).toBe(false);
      expect(searchResult.content[0].text).toContain("accept-all");

      // Click accept all button
      const clickResult = await sendRequest("tools/call", {
        name: "click",
        arguments: {
          selector: "#accept-all",
        },
      });

      expect(clickResult.isError).toBe(false);

      // Verify banner is hidden
      const verifyResult = await sendRequest("tools/call", {
        name: "evaluate",
        arguments: {
          script:
            "document.getElementById('cookie-banner').classList.contains('hidden')",
        },
      });

      expect(verifyResult.isError).toBe(false);
      expect(verifyResult.content[0].text).toContain("true");
    });
  });

  describe("Autoconsent rule testing", () => {
    it("should test a simple rule against the cookie banner", async () => {
      const testRule = {
        name: "test-cookie-banner",
        detectCmp: [
          {
            exists: "#cookie-banner",
          },
        ],
        detectPopup: [
          {
            visible: "#cookie-banner",
          },
        ],
        optOut: [
          {
            click: "#reject-all",
          },
        ],
        optIn: [
          {
            click: "#accept-all",
          },
        ],
      };

      const result = await sendRequest("tools/call", {
        name: "test_rule",
        arguments: {
          url: TEST_SITE_URL,
          rule: testRule,
        },
      });

      expect(result).toBeDefined();
      expect(result.isError).toBe(false);
      expect(result.content[0].text).toContain(
        'Test results for rule "test-cookie-banner"',
      );
      expect(result.content[0].text).toContain(TEST_SITE_URL);
    });
  });

  describe("Console and screenshot resources", () => {
    it("should capture and retrieve console logs", async () => {
      // Generate some console output
      await sendRequest("tools/call", {
        name: "navigate",
        arguments: { url: TEST_SITE_URL },
      });

      await sendRequest("tools/call", {
        name: "evaluate",
        arguments: {
          script: "console.log('Integration test log message'); 'done'",
        },
      });

      // Read console logs resource
      const logs = await sendRequest("resources/read", {
        uri: "console://logs",
      });

      expect(logs).toBeDefined();
      expect(logs.contents).toBeInstanceOf(Array);
      expect(logs.contents[0].mimeType).toBe("text/plain");
    });

    it("should store and retrieve screenshots", async () => {
      await sendRequest("tools/call", {
        name: "navigate",
        arguments: { url: TEST_SITE_URL },
      });

      // Take a screenshot
      await sendRequest("tools/call", {
        name: "screenshot",
        arguments: {
          name: "resource-test-screenshot",
        },
      });

      // List resources to confirm screenshot is available
      const resources = await sendRequest("resources/list");
      const resourceUris = resources.resources.map(
        (resource: any) => resource.uri,
      );
      expect(resourceUris).toContain("screenshot://resource-test-screenshot");

      // Read the screenshot resource
      const screenshot = await sendRequest("resources/read", {
        uri: "screenshot://resource-test-screenshot",
      });

      expect(screenshot).toBeDefined();
      expect(screenshot.contents).toBeInstanceOf(Array);
      expect(screenshot.contents[0].mimeType).toBe("image/png");
    });
  });
});
