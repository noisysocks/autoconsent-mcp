import fs from "fs";
import { Browser, Frame, Page } from "puppeteer";
import type {
  AutoConsentCMPRule,
  ContentScriptMessage,
  ErrorMessage,
  DetectedMessage,
  FoundMessage,
  OptOutResultMessage,
} from "@duckduckgo/autoconsent";
import path from "path";

type TestRuleSettings = {
  viewportWidth?: number;
  viewportHeight?: number;
};

type TestRuleResults = {
  errors: ErrorMessage[];
  cmpDetectedMessage?: DetectedMessage;
  popupFoundMessage?: FoundMessage;
  optOutResultMessage?: OptOutResultMessage;
};

async function injectAutoconsent(page: Page | Frame) {
  const autoconsentPath = path.resolve(
    __dirname,
    "../../node_modules/@duckduckgo/autoconsent/dist/autoconsent.playwright.js",
  );
  const autoconsentScript = fs.readFileSync(autoconsentPath, "utf8");
  await page.evaluate(autoconsentScript);
}

export async function testRule(
  browser: Browser,
  url: string,
  rule: AutoConsentCMPRule,
  { viewportWidth = 1280, viewportHeight = 720 }: TestRuleSettings = {},
): Promise<TestRuleResults> {
  if (!browser.connected) {
    throw new Error("Browser is not connected");
  }

  const page = await browser.newPage();
  await page.setViewport({ width: viewportWidth, height: viewportHeight });

  const messages: ContentScriptMessage[] = [];

  async function messageCallback(message: ContentScriptMessage) {
    messages.push(message);

    switch (message.type) {
      case "init": {
        await page.evaluate(
          `autoconsentReceiveMessage(${JSON.stringify({
            type: "initResp",
            rules: {
              autoconsent: [rule],
            },
            config: {
              enabled: true,
              autoAction: "optOut",
              disabledCmps: [],
              enablePrehide: true,
              detectRetries: 20,
              enableCosmeticRules: true,
            },
          })})`,
        );
        break;
      }
      case "eval": {
        const result = await page.evaluate(message.code);
        await page.evaluate(
          `autoconsentReceiveMessage(${JSON.stringify({
            id: message.id,
            type: "evalResp",
            result: result,
          })})`,
        );
        break;
      }
    }
  }

  await page.exposeFunction("autoconsentSendMessage", messageCallback);

  await page.goto(url, {
    waitUntil: "domcontentloaded",
  });

  await injectAutoconsent(page);
  page.frames().forEach(injectAutoconsent);
  page.on("framenavigated", injectAutoconsent);

  await new Promise((resolve) => setTimeout(resolve, 5000));

  const results = {
    errors: messages.filter((msg) => msg.type === "autoconsentError"),
    cmpDetectedMessage: messages.find((msg) => msg.type === "cmpDetected"),
    popupFoundMessage: messages.find((msg) => msg.type === "popupFound"),
    optOutResultMessage: messages.find((msg) => msg.type === "optOutResult"),
  };

  await page.removeExposedFunction("autoconsentSendMessage");

  return results;
}
