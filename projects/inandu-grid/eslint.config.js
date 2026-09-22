// @ts-check
const { defineConfig } = require("eslint/config");
const rootConfig = require("../../eslint.config.js");

module.exports = defineConfig([
  ...rootConfig,
  {
    files: ["**/*.ts"],
    rules: {
      "@angular-eslint/directive-selector": [
        "error",
        {
          type: "attribute",
          prefix: "inandu",
          style: "camelCase",
        },
      ],
      "@angular-eslint/component-selector": [
        "error",
        {
          type: "element",
          prefix: "inandu",
          style: "kebab-case",
        },
      ],
    },
  },
  {
    files: ["**/*.html"],
    rules: {},
  },
  {
    // Test-harness components intentionally use non-OnPush change detection to exercise the
    // library's default (non-OnPush) behavior — that's a legitimate test concern here, not a
    // production code smell the rule is meant to catch.
    files: ["**/*.spec.ts"],
    rules: {
      "@angular-eslint/prefer-on-push-component-change-detection": "off",
    },
  },
]);
