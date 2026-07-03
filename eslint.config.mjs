import js from "@eslint/js";
import tseslint from "typescript-eslint";
import prettier from "eslint-config-prettier";
import globals from "globals";

export default tseslint.config(
  {
    ignores: ["dist/**", "node_modules/**", "web-ext-artifacts/**", "**/*.map"],
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: ["src/**/*.ts", "test/**/*.ts"],
    languageOptions: {
      globals: { ...globals.browser, ...globals.webextensions },
    },
    rules: {
      // The extension bridges to untyped browser and page APIs and uses test
      // doubles, where `any` at the boundary is intentional and clearer than
      // fighting the type system. Structured types live in src/core/types.ts.
      "@typescript-eslint/no-explicit-any": "off",
      "@typescript-eslint/no-unused-vars": [
        "error",
        { argsIgnorePattern: "^_", varsIgnorePattern: "^_" },
      ],
      "no-empty": ["error", { allowEmptyCatch: true }],
    },
  },
  {
    files: ["*.mjs", "scripts/**/*.mjs"],
    languageOptions: {
      globals: { ...globals.node },
    },
  },
  prettier,
);
