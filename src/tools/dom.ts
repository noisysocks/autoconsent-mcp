import { Page } from "puppeteer";

export async function searchHTML(page: Page, query: string): Promise<string> {
  return await page.evaluate((searchQuery: string) => {
    function elementContainsQuery(element: Element, query: string): boolean {
      // Check text content
      if (
        element.textContent &&
        element.textContent.toLowerCase().includes(query.toLowerCase())
      ) {
        return true;
      }

      // Check attributes
      for (const attr of Array.from(element.attributes)) {
        if (attr.value.toLowerCase().includes(query.toLowerCase())) {
          return true;
        }
      }

      return false;
    }

    function hasDescendantWithQuery(element: Element, query: string): boolean {
      // Check if element itself contains query
      if (elementContainsQuery(element, query)) {
        return true;
      }

      // Check shadow DOM
      if ((element as any).shadowRoot) {
        for (const child of Array.from((element as any).shadowRoot.children)) {
          if (hasDescendantWithQuery(child as Element, query)) {
            return true;
          }
        }
      }

      // Check iframe content
      if (element.tagName.toLowerCase() === "iframe") {
        try {
          const iframeDoc = (element as HTMLIFrameElement).contentDocument;
          if (
            iframeDoc &&
            iframeDoc.body &&
            hasDescendantWithQuery(iframeDoc.body, query)
          ) {
            return true;
          }
        } catch (e) {
          // Cross-origin iframe, can't access content
        }
      }

      // Check children recursively
      for (const child of Array.from(element.children)) {
        if (
          child.tagName.toLowerCase() === "script" ||
          child.tagName.toLowerCase() === "style" ||
          child.tagName.toLowerCase() === "svg"
        ) {
          continue;
        }

        if (hasDescendantWithQuery(child, query)) {
          return true;
        }
      }

      return false;
    }

    function serializeElement(
      element: Element,
      query: string,
      depth: number = 0,
    ): string {
      const tagName = element.tagName.toLowerCase();

      // Skip script, style, and svg tags
      if (tagName === "script" || tagName === "style" || tagName === "svg") {
        return "";
      }

      const indent = "  ".repeat(depth);

      // Get attributes
      let attributes = "";
      for (const attr of Array.from(element.attributes)) {
        attributes += ` ${attr.name}="${attr.value}"`;
      }

      const openTag = `${indent}<${tagName}${attributes}>`;

      // Check if this element or any descendant contains the query
      const hasQueryContent = hasDescendantWithQuery(element, query);

      if (!hasQueryContent) {
        // Don't show [...] for empty body
        if (tagName === "body" && element.children.length === 0) {
          return `${openTag}\n${indent}</${tagName}>`;
        }
        return `${openTag}\n${indent}  [...]\n${indent}</${tagName}>`;
      }

      let content = "";

      // Check if element has shadow DOM or complex content first
      const hasShadowDOM = !!(element as any).shadowRoot;
      const hasChildElements = Array.from(element.childNodes).some(
        (child) => child.nodeType === Node.ELEMENT_NODE,
      );

      // Check if element has only text content (no child elements or shadow DOM)
      const hasOnlyTextContent =
        !hasShadowDOM &&
        !hasChildElements &&
        Array.from(element.childNodes).every(
          (child) => child.nodeType === Node.TEXT_NODE,
        );

      if (hasOnlyTextContent) {
        // Use inline format for simple text elements
        const textContent = element.textContent?.trim();
        if (textContent) {
          return `${openTag}${textContent}</${tagName}>`;
        } else {
          return `${openTag}</${tagName}>`;
        }
      }

      // Process child nodes with indentation
      for (const child of Array.from(element.childNodes)) {
        if (child.nodeType === Node.TEXT_NODE) {
          const textContent = child.textContent?.trim();
          if (textContent) {
            content += `\n${indent}  ${textContent}`;
          }
        } else if (child.nodeType === Node.ELEMENT_NODE) {
          const childElement = child as Element;
          const childTagName = childElement.tagName.toLowerCase();

          // Skip script, style, and svg tags
          if (
            childTagName === "script" ||
            childTagName === "style" ||
            childTagName === "svg"
          ) {
            continue;
          }

          const childHasQuery = hasDescendantWithQuery(childElement, query);

          if (childHasQuery) {
            const serializedChild = serializeElement(
              childElement,
              query,
              depth + 1,
            );
            if (serializedChild) {
              content += "\n" + serializedChild;
            }
          } else {
            // Check if there are any siblings that do contain the query
            let hasSiblingWithQuery = false;
            for (const sibling of Array.from(element.children)) {
              if (
                sibling !== childElement &&
                hasDescendantWithQuery(sibling, query)
              ) {
                hasSiblingWithQuery = true;
                break;
              }
            }

            // Only show [...] if there are siblings with query content
            if (hasSiblingWithQuery) {
              content += `\n${indent}  [...]`;
            }
          }
        }
      }

      // Handle shadow DOM content
      if ((element as any).shadowRoot) {
        const shadowRoot = (element as any).shadowRoot;
        for (const child of Array.from(shadowRoot.children)) {
          const childElement = child as Element;
          if (
            childElement.tagName.toLowerCase() === "script" ||
            childElement.tagName.toLowerCase() === "style" ||
            childElement.tagName.toLowerCase() === "svg"
          ) {
            continue;
          }

          const childHasQuery = hasDescendantWithQuery(childElement, query);
          if (childHasQuery) {
            const serializedChild = serializeElement(
              childElement,
              query,
              depth + 1,
            );
            if (serializedChild) {
              content += "\n" + serializedChild;
            }
          }
        }
      }

      // Handle iframe content
      if (element.tagName.toLowerCase() === "iframe") {
        try {
          const iframeDoc = (element as HTMLIFrameElement).contentDocument;
          if (iframeDoc && iframeDoc.body) {
            const iframeHasQuery = hasDescendantWithQuery(
              iframeDoc.body,
              query,
            );
            if (iframeHasQuery) {
              const serializedIframe = serializeElement(
                iframeDoc.body,
                query,
                depth + 1,
              );
              if (serializedIframe) {
                content += "\n" + serializedIframe;
              }
            }
          }
        } catch (e) {
          // Cross-origin iframe, can't access content
        }
      }

      const closeTag = `${indent}</${tagName}>`;

      if (content) {
        return `${openTag}${content}\n${closeTag}`;
      } else {
        return `${openTag}\n${closeTag}`;
      }
    }

    // Start serialization from body element
    const body = document.body;
    if (!body) {
      return "";
    }

    return serializeElement(body, searchQuery);
  }, query);
}

export async function printElement(
  page: Page,
  selector: string,
): Promise<string> {
  return await page.evaluate((sel: string) => {
    function serializeFullElement(element: Element, depth: number = 0): string {
      const tagName = element.tagName.toLowerCase();
      const indent = "  ".repeat(depth);

      // Get attributes
      let attributes = "";
      for (const attr of Array.from(element.attributes)) {
        attributes += ` ${attr.name}="${attr.value}"`;
      }

      const openTag = `${indent}<${tagName}${attributes}>`;
      let content = "";

      // Check if element has shadow DOM or complex content first
      const hasShadowDOM = !!(element as any).shadowRoot;
      const hasChildElements = Array.from(element.childNodes).some(
        (child) => child.nodeType === Node.ELEMENT_NODE,
      );

      // Check if element has only text content (no child elements or shadow DOM)
      const hasOnlyTextContent =
        !hasShadowDOM &&
        !hasChildElements &&
        Array.from(element.childNodes).every(
          (child) => child.nodeType === Node.TEXT_NODE,
        );

      if (hasOnlyTextContent) {
        // Use inline format for simple text elements
        const textContent = element.textContent?.trim();
        if (textContent) {
          return `${openTag}${textContent}</${tagName}>`;
        } else {
          return `${openTag}</${tagName}>`;
        }
      }

      // Process child nodes with indentation
      for (const child of Array.from(element.childNodes)) {
        if (child.nodeType === Node.TEXT_NODE) {
          const textContent = child.textContent?.trim();
          if (textContent) {
            content += `\n${indent}  ${textContent}`;
          }
        } else if (child.nodeType === Node.ELEMENT_NODE) {
          const childElement = child as Element;
          const serializedChild = serializeFullElement(childElement, depth + 1);
          if (serializedChild) {
            content += "\n" + serializedChild;
          }
        }
      }

      // Handle shadow DOM content
      if ((element as any).shadowRoot) {
        const shadowRoot = (element as any).shadowRoot;
        for (const child of Array.from(shadowRoot.children)) {
          const serializedChild = serializeFullElement(
            child as Element,
            depth + 1,
          );
          if (serializedChild) {
            content += "\n" + serializedChild;
          }
        }
      }

      // Handle iframe content
      if (element.tagName.toLowerCase() === "iframe") {
        try {
          const iframeDoc = (element as HTMLIFrameElement).contentDocument;
          if (iframeDoc && iframeDoc.body) {
            const serializedIframe = serializeFullElement(
              iframeDoc.body,
              depth + 1,
            );
            if (serializedIframe) {
              content += "\n" + serializedIframe;
            }
          }
        } catch (e) {
          // Cross-origin iframe, can't access content
        }
      }

      const closeTag = `${indent}</${tagName}>`;

      if (content) {
        return `${openTag}${content}\n${closeTag}`;
      } else {
        return `${openTag}</${tagName}>`;
      }
    }

    const element = document.querySelector(sel);
    if (!element) {
      throw new Error(`Element not found: ${sel}`);
    }

    return serializeFullElement(element);
  }, selector);
}
