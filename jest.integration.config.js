module.exports = {
  preset: "ts-jest",
  testEnvironment: "node",
  roots: ["<rootDir>/tests/integration"],
  testMatch: ["**/tests/integration/**/*.test.ts"],
  transform: {
    "^.+\\.ts$": "ts-jest",
  },
  collectCoverageFrom: ["src/**/*.ts", "!src/**/*.d.ts"],
  moduleFileExtensions: ["ts", "js", "json"],
  verbose: true,
  testTimeout: 30000,
  setupFilesAfterEnv: [],
  displayName: "Integration Tests",
  testPathIgnorePatterns: ["/node_modules/", "/dist/"],
};
