module.exports = {
  preset: "ts-jest",
  testEnvironment: "jsdom",
  roots: ["<rootDir>/src", "<rootDir>/tests/unit"],
  testMatch: ["**/tests/unit/**/*.ts", "**/__tests__/**/*.ts", "**/*.test.ts"],
  transform: {
    "^.+\\.ts$": "ts-jest",
  },
  collectCoverageFrom: ["src/**/*.ts", "!src/**/*.d.ts"],
  moduleFileExtensions: ["ts", "js", "json"],
  verbose: true,
  testTimeout: 30000,
  displayName: "Unit Tests",
  testPathIgnorePatterns: ["/node_modules/", "/dist/", "/tests/integration/"],
};
