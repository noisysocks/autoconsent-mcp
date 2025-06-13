import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListResourcesRequestSchema,
  ListToolsRequestSchema,
  ReadResourceRequestSchema,
  CallToolResult,
  TextContent,
  ImageContent,
  Tool,
} from "@modelcontextprotocol/sdk/types.js";
import puppeteer, { Browser, Page } from "puppeteer";
import { searchHTML, printElement } from "./tools/dom";
import { testRule } from "./tools/test-rule";
import type { AutoConsentCMPRule } from "@duckduckgo/autoconsent";

// Define the tools
const TOOLS: Tool[] = [
  {
    name: "navigate",
    description: "Navigate to any URL in the browser",
    inputSchema: {
      type: "object",
      properties: {
        url: { type: "string", description: "URL to navigate to" },
      },
      required: ["url"],
    },
  },
  {
    name: "screenshot",
    description: "Capture screenshots of the entire page or specific elements",
    inputSchema: {
      type: "object",
      properties: {
        name: { type: "string", description: "Name for the screenshot" },
        width: {
          type: "number",
          description: "Width in pixels (default: 1280)",
        },
        height: {
          type: "number",
          description: "Height in pixels (default: 720)",
        },
        encoded: {
          type: "boolean",
          description:
            "If true, capture the screenshot as a base64-encoded data URI (as text) instead of binary image content. Default false.",
        },
      },
      required: ["name"],
    },
  },
  {
    name: "click",
    description: "Click elements on the page",
    inputSchema: {
      type: "object",
      properties: {
        selector: {
          type: "string",
          description: "CSS selector for element to click",
        },
      },
      required: ["selector"],
    },
  },
  {
    name: "select",
    description: "Select an element with SELECT tag",
    inputSchema: {
      type: "object",
      properties: {
        selector: {
          type: "string",
          description: "CSS selector for element to select",
        },
        value: { type: "string", description: "Value to select" },
      },
      required: ["selector", "value"],
    },
  },
  {
    name: "evaluate",
    description: "Execute JavaScript in the browser console",
    inputSchema: {
      type: "object",
      properties: {
        script: { type: "string", description: "JavaScript code to execute" },
      },
      required: ["script"],
    },
  },
  {
    name: "search_html",
    description:
      "Outputs the HTML of elements that deeply contain the given search query. Elements that don't contain the given query are omitted using a [...] placeholder.",
    inputSchema: {
      type: "object",
      properties: {
        query: { type: "string", description: "Search query" },
      },
      required: ["query"],
    },
  },
  {
    name: "print_element",
    description: "Outputs the full HTML of the given element",
    inputSchema: {
      type: "object",
      properties: {
        selector: { type: "string", description: "CSS selector" },
      },
      required: ["selector"],
    },
  },
  {
    name: "test_rule",
    description: "Tests the given Autoconsent rule on the given URL",
    inputSchema: {
      type: "object",
      properties: {
        url: { type: "string", description: "URL to navigate to" },
        rule: {
          type: "object",
          description: "Autoconsent rule (AutoConsentCMPRule)",
        },
      },
      required: ["url", "rule"],
    },
  },
];

// Global state
let browser: Browser | null = null;
let page: Page | null = null;
const consoleLogs: string[] = [];
const screenshots = new Map<string, string>();

async function ensureBrowser(): Promise<Page> {
  if (!browser || !browser.connected) {
    browser = await puppeteer.launch({
      headless: false,
      defaultViewport: { width: 1280, height: 720 },
    });

    const pages = await browser.pages();
    page = pages[0];

    page.on("console", (msg) => {
      const logEntry = `[${msg.type()}] ${msg.text()}`;
      consoleLogs.push(logEntry);
      server.notification({
        method: "notifications/resources/updated",
        params: { uri: "console://logs" },
      });
    });
  }

  return page!;
}

async function handleToolCall(
  name: string,
  args: any,
): Promise<CallToolResult> {
  const page = await ensureBrowser();

  switch (name) {
    case "navigate":
      await page.goto(args.url, { waitUntil: "domcontentloaded" });
      return {
        content: [
          {
            type: "text",
            text: `Navigated to ${args.url}`,
          },
        ],
        isError: false,
      };

    case "screenshot": {
      const width = args.width ?? 1280;
      const height = args.height ?? 720;
      const encoded = args.encoded ?? false;

      await page.setViewport({ width, height });

      const screenshot = await page.screenshot({
        encoding: "base64",
        fullPage: false,
      });

      if (!screenshot) {
        return {
          content: [
            {
              type: "text",
              text: "Screenshot failed",
            },
          ],
          isError: true,
        };
      }

      screenshots.set(args.name, screenshot as string);
      server.notification({
        method: "notifications/resources/list_changed",
      });

      return {
        content: [
          {
            type: "text",
            text: `Screenshot '${args.name}' taken at ${width}x${height}`,
          } as TextContent,
          encoded
            ? ({
                type: "text",
                text: `data:image/png;base64,${screenshot}`,
              } as TextContent)
            : ({
                type: "image",
                data: screenshot,
                mimeType: "image/png",
              } as ImageContent),
        ],
        isError: false,
      };
    }

    case "click":
      try {
        await page.click(args.selector);
        return {
          content: [
            {
              type: "text",
              text: `Clicked: ${args.selector}`,
            },
          ],
          isError: false,
        };
      } catch (error) {
        return {
          content: [
            {
              type: "text",
              text: `Failed to click ${args.selector}: ${(error as Error).message}`,
            },
          ],
          isError: true,
        };
      }

    case "select":
      try {
        await page.waitForSelector(args.selector);
        await page.select(args.selector, args.value);
        return {
          content: [
            {
              type: "text",
              text: `Selected ${args.selector} with: ${args.value}`,
            },
          ],
          isError: false,
        };
      } catch (error) {
        return {
          content: [
            {
              type: "text",
              text: `Failed to select ${args.selector}: ${(error as Error).message}`,
            },
          ],
          isError: true,
        };
      }

    case "evaluate":
      try {
        await page.evaluate(() => {
          (window as any).mcpHelper = {
            logs: [],
            originalConsole: { ...console },
          };

          ["log", "info", "warn", "error"].forEach((method) => {
            (console as any)[method] = (...args: any[]) => {
              (window as any).mcpHelper.logs.push(
                `[${method}] ${args.join(" ")}`,
              );
              ((window as any).mcpHelper.originalConsole as any)[method](
                ...args,
              );
            };
          });
        });

        const result = await page.evaluate(args.script);

        const logs = await page.evaluate(() => {
          Object.assign(console, (window as any).mcpHelper.originalConsole);
          const logs = (window as any).mcpHelper.logs;
          delete (window as any).mcpHelper;
          return logs;
        });

        return {
          content: [
            {
              type: "text",
              text: `Execution result:\n${JSON.stringify(result, null, 2)}\n\nConsole output:\n${logs.join("\n")}`,
            },
          ],
          isError: false,
        };
      } catch (error) {
        return {
          content: [
            {
              type: "text",
              text: `Script execution failed: ${(error as Error).message}`,
            },
          ],
          isError: true,
        };
      }

    case "search_html":
      try {
        const html = await searchHTML(page, args.query);
        return {
          content: [
            {
              type: "text",
              text: html,
            },
          ],
          isError: false,
        };
      } catch (error) {
        return {
          content: [
            {
              type: "text",
              text: `Failed to search HTML: ${(error as Error).message}`,
            },
          ],
          isError: true,
        };
      }

    case "print_element":
      try {
        const html = await printElement(page, args.selector);
        return {
          content: [
            {
              type: "text",
              text: html,
            },
          ],
          isError: false,
        };
      } catch (error) {
        return {
          content: [
            {
              type: "text",
              text: `Failed to print element: ${(error as Error).message}`,
            },
          ],
          isError: true,
        };
      }

    case "test_rule":
      try {
        if (!browser) {
          throw new Error("Browser not initialized");
        }

        const rule = args.rule as AutoConsentCMPRule;
        const results = await testRule(browser, args.url, rule);

        let output = `Test results for rule "${rule.name}" on ${args.url}:\n\n`;

        if (results.errors.length > 0) {
          output += `Errors:\n${results.errors.map((err) => JSON.stringify(err, null, 2)).join("\n")}\n\n`;
        }

        if (results.cmpDetectedMessage) {
          output += `CMP Detected: ${JSON.stringify(results.cmpDetectedMessage, null, 2)}\n\n`;
        }

        if (results.popupFoundMessage) {
          output += `Popup Found: ${JSON.stringify(results.popupFoundMessage, null, 2)}\n\n`;
        }

        if (results.optOutResultMessage) {
          output += `Opt-out Result: ${JSON.stringify(results.optOutResultMessage, null, 2)}\n\n`;
        }

        return {
          content: [
            {
              type: "text",
              text: output,
            },
          ],
          isError: false,
        };
      } catch (error) {
        return {
          content: [
            {
              type: "text",
              text: `Failed to test rule: ${(error as Error).message}`,
            },
          ],
          isError: true,
        };
      }

    default:
      return {
        content: [
          {
            type: "text",
            text: `Unknown tool: ${name}`,
          },
        ],
        isError: true,
      };
  }
}

const server = new Server(
  {
    name: "autoconsent-mcp",
    version: "1.0.0",
  },
  {
    capabilities: {
      resources: {},
      tools: {},
    },
  },
);

// Setup request handlers
server.setRequestHandler(ListResourcesRequestSchema, async () => ({
  resources: [
    {
      uri: "console://logs",
      mimeType: "text/plain",
      name: "Browser console logs",
    },
    ...Array.from(screenshots.keys()).map((name) => ({
      uri: `screenshot://${name}`,
      mimeType: "image/png",
      name: `Screenshot: ${name}`,
    })),
  ],
}));

server.setRequestHandler(ReadResourceRequestSchema, async (request) => {
  const uri = request.params.uri.toString();

  if (uri === "console://logs") {
    return {
      contents: [
        {
          uri,
          mimeType: "text/plain",
          text: consoleLogs.join("\n"),
        },
      ],
    };
  }

  if (uri.startsWith("screenshot://")) {
    const name = uri.split("://")[1];
    const screenshot = screenshots.get(name);
    if (screenshot) {
      return {
        contents: [
          {
            uri,
            mimeType: "image/png",
            blob: screenshot,
          },
        ],
      };
    }
  }

  throw new Error(`Resource not found: ${uri}`);
});

server.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools: TOOLS,
}));

server.setRequestHandler(CallToolRequestSchema, async (request) =>
  handleToolCall(request.params.name, request.params.arguments ?? {}),
);

async function runServer() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
}

runServer().catch(console.error);

process.stdin.on("close", () => {
  console.error("Autoconsent MCP Server closed");
  if (browser) {
    browser.close();
  }
  server.close();
});
