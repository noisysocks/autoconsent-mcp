# Testing Guide

This project has two types of tests: unit tests and integration tests.

## Test Structure

```
tests/
├── unit/           # Fast, isolated unit tests
│   └── dom.ts      # Tests for DOM manipulation functions
└── integration/    # Slower tests that require running services
    ├── dom.test.ts        # Tests for DOM functions against real test site
    └── test-rule.test.ts  # Tests for rule testing functionality
```

## Running Tests

### Unit Tests
Unit tests are fast, isolated tests that don't require external services:

```bash
# Run unit tests only
npm run test:unit

# Run unit tests in watch mode
npm run test:watch

# Default test command runs unit tests
npm test
```

### Integration Tests
Integration tests require the test server to be running on localhost:8080:

```bash
# 1. Start the test server (in a separate terminal)
npm run serve-test-site

# 2. Run all integration tests
npm run test:integration

# Run specific integration test files
npm run test:integration -- --testPathPattern=dom.test.ts
npm run test:integration -- --testPathPattern=test-rule.test.ts

# Run integration tests in watch mode
npm run test:integration:watch
```

## Test Details

### Unit Tests (`tests/unit/dom.ts`)
Tests the DOM manipulation functions:
- `searchHTML()` - Finding elements containing search queries
- `printElement()` - Extracting full HTML for elements
- Shadow DOM support
- Error handling
- Formatting and indentation

**Coverage:** 20 test cases covering various scenarios including shadow DOM, iframes, error cases, and complex nested structures.

### Integration Tests

#### DOM Integration Tests (`tests/integration/dom.test.ts`)
Tests the DOM manipulation functions against the real test site:
- `searchHTML()` functionality with real HTML content
- `printElement()` functionality with complex structures
- Shadow DOM handling in real browser environment
- Error handling and edge cases
- Performance characteristics
- Concurrent operations

**Coverage:** 26 test cases covering searchHTML and printElement with real browser automation.

#### Rule Testing Integration Tests (`tests/integration/test-rule.test.ts`)
Tests the rule testing functionality with real browser automation:
- CMP detection and popup finding
- Opt-out and opt-in actions
- Error handling with invalid rules
- Performance characteristics
- Different viewport sizes
- Concurrent test execution

**Coverage:** 11 test cases covering the complete rule testing workflow.

## Prerequisites

### For Unit Tests
- No external dependencies required
- Tests run in jsdom environment

### For Integration Tests
- Test server must be running on `http://localhost:8080`
- Uses real Puppeteer browser automation
- Requires the autoconsent library integration

## Configuration

- **Unit tests:** `jest.config.js` - jsdom environment, fast execution
- **Integration tests:** `jest.integration.config.js` - node environment, longer timeouts

## Writing New Tests

### Unit Tests
Add to `tests/unit/` directory. Use jsdom environment for DOM manipulation testing.

### Integration Tests
Add to `tests/integration/` directory. Ensure tests:
1. Check server availability in `beforeAll`
2. Use appropriate timeouts (15-30 seconds)
3. Clean up browser resources
4. Handle async operations properly

## Continuous Integration

The default `npm test` command runs unit tests only for fast feedback. Integration tests should be run separately in CI with the test server set up.