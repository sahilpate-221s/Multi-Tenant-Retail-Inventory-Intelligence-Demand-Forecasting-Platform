import js from "@eslint/js";
import tseslint from "typescript-eslint";
import { dirname } from "node:path";
import { fileURLToPath } from "node:url";

const tsconfigRootDir = dirname(fileURLToPath(import.meta.url));

export default tseslint.config(
  { ignores: ["dist"] },
  {
    extends: [js.configs.recommended, ...tseslint.configs.recommended],
    files: ["**/*.ts"],
    languageOptions: {
      parserOptions: { tsconfigRootDir },
    },
    rules: {
      "@typescript-eslint/no-explicit-any": "warn",
      "@typescript-eslint/no-unused-vars": "warn",
    },
  },
);
