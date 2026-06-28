export default {
  testEnvironment: "node",
  transform: {},
  moduleNameMapper: {
    "^(\\.{1,2}/.*)\\.js$": "$1",
  },
  testMatch: ["**/tests/**/*.test.js"],
  collectCoverageFrom: [
    "controllers/**/*.js",
    "models/**/*.js",
    "routes/**/*.js",
    "services/**/*.js",
    "repositories/**/*.js",
    "utils/**/*.js",
    "!**/node_modules/**",
  ],
  coverageThreshold: {
    global: {
      statements: 65,
      branches: 55,
      functions: 70,
      lines: 68,
    },
  },
  setupFilesAfterEnv: ["<rootDir>/tests/setup/jest.setup.js"],
  testTimeout: 30000,
};