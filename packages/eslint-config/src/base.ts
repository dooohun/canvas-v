import js from "@eslint/js";
import eslintConfigPrettier from "eslint-config-prettier";
// eslint-plugin-turbo ships no type declarations.
// eslint-disable-next-line @typescript-eslint/no-var-requires
import turboPlugin from "eslint-plugin-turbo";
import globals from "globals";
import tseslint from "typescript-eslint";
import type { Linter } from "eslint";

export const baseConfig: Linter.Config[] = [
  js.configs.recommended,
  ...tseslint.configs.recommended,
  eslintConfigPrettier,
  {
    plugins: {
      turbo: turboPlugin,
    },
    rules: {
      "turbo/no-undeclared-env-vars": "warn",
    },
  },
  {
    languageOptions: {
      globals: {
        ...globals.node,
      },
    },
  },
  {
    ignores: ["dist/**", "build/**", ".turbo/**", "node_modules/**"],
  },
];

export default baseConfig;
