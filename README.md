# Autoconsent MCP

A Model Context Protocol server that provides browser automation capabilities specifically designed for creating and testing Autoconsent rules. This server enables LLMs to interact with web pages, inspect consent management platforms (CMPs), and test Autoconsent rules in a real browser environment.

> [!CAUTION]
> This server can access local files and local/internal IP addresses since it runs a browser on your machine. Exercise caution when using this MCP server to ensure this does not expose any sensitive data.

## Components

### Tools

- **navigate**
  - Navigate to any URL in the browser
  - Inputs:
    - `url` (string, required): URL to navigate to

- **screenshot**
  - Capture screenshots of the entire page or specific elements
  - Inputs:
    - `name` (string, required): Name for the screenshot
    - `width` (number, optional, default: 1280): Screenshot width
    - `height` (number, optional, default: 720): Screenshot height
    - `encoded` (boolean, optional): If true, capture the screenshot as a base64-encoded data URI (as text) instead of binary image content. Default false.

- **click**
  - Click elements on the page
  - Input: `selector` (string): CSS selector for element to click

- **select**
  - Select an element with SELECT tag
  - Inputs:
    - `selector` (string): CSS selector for element to select
    - `value` (string): Value to select

- **evaluate**
  - Execute JavaScript in the browser console
  - Input: `script` (string): JavaScript code to execute

- **search_html**
  - Outputs the HTML of elements that deeply contain the given search query. Elements that don't contain the given query are omitted using a [...] placeholder.
  - Input: `query` (string): Search query

- **print_element**
  - Outputs the full HTML of the given element
  - Input: `selector` (string): CSS selector

- **test_rule**
  - Tests the given Autoconsent rule on the given URL
  - Inputs:
    - `url` (string, required): URL to navigate to
    - `rule` (object, required): Autoconsent rule (AutoConsentCMPRule)

### Resources

The server provides access to two types of resources:

1. **Console Logs** (`console://logs`)
   - Browser console output in text format
   - Includes all console messages from the browser

2. **Screenshots** (`screenshot://`)
   - PNG images of captured screenshots
   - Accessible via the screenshot name specified during capture

## Installation and Setup

### Prerequisites

- Node.js (version 18 or higher)
- npm

### Setup

```bash
npm install
npm run build
```

### Running the Server

For development:
```bash
npm run dev
```

For production:
```bash
npm start
```

### Test Site

```bash
npm run serve-test-site
```

This starts a local HTTP server on port 8080 serving the `test-site` directory.

### Testing

```bash
npm run test:unit
npm run test:integration
```

Note that the integration tests require the test site to be running (see above).

## Configuration for Claude Desktop

Add the following to your Claude Desktop configuration:

```json
{
  "mcpServers": {
    "autoconsent-mcp": {
      "command": "node",
      "args": ["path/to/autoconsent-mcp/dist/index.js"]
    }
  }
}
```

## License

This MCP server is licensed under the ISC License. This means you are free to use, modify, and distribute the software, subject to the terms and conditions of the ISC License.
