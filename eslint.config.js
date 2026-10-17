const expoConfig = require("eslint-config-expo/flat");

module.exports = [
  ...expoConfig,
  {
    rules: {
      "react-hooks/set-state-in-effect": "off",
    },
  },
  {
    ignores: [
      "dist/**",
      ".expo/**",
      "node_modules/**",
      ".agents/**",
      "coverage/**",
      "test-results/**",
      "playwright-report/**",
    ],
  },
];
