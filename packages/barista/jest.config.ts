import type { Config } from "jest";

const config: Config = {
  preset: "ts-jest/presets/default-esm",
  testEnvironment: "node",
  extensionsToTreatAsEsm: [".ts"],
  moduleNameMapper: {
    "^(\\.{1,2}/.*)\\.js$": "$1",
    "^@specialist/core/(.*)$": "<rootDir>/../specialist/src/$1",
  },
  transform: {
    "^.+\\.tsx?$": [
      "ts-jest",
      {
        useESM: true,
        tsconfig: {
          allowJs: true,
          esModuleInterop: true,
          module: "NodeNext",
          moduleResolution: "NodeNext",
          rootDir: "../../",
        },
      },
    ],
  },
  testMatch: ["**/*.test.ts"],
  setupFilesAfterEnv: ["<rootDir>/jest.setup.ts"],
  rootDir: ".",
  moduleDirectories: ["node_modules", "src", "../specialist/src"],
  modulePathIgnorePatterns: ["dist"],
};

export default config;
