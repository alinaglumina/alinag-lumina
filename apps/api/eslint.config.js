import js from "@eslint/js";
import tseslint from "typescript-eslint";
import globals from "globals";

// Lenient but meaningful: catches real bugs (undefined vars, unreachable code) without
// fighting the codebase's intentional use of `any`/non-null assertions in DB glue.
export default tseslint.config(
  { ignores: ["dist", "node_modules"] },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    languageOptions: { globals: { ...globals.node } },
    rules: {
      "@typescript-eslint/no-explicit-any": "off",
      "@typescript-eslint/no-non-null-assertion": "off",
      "@typescript-eslint/no-unused-vars": ["warn", { argsIgnorePattern: "^_", varsIgnorePattern: "^_" }],
      "no-empty": "off",
      "no-control-regex": "off",
    },
  }
);
