import js from "@eslint/js";
import tseslint from "typescript-eslint";
import noLiteralJsxText from "./eslint-rules/no-literal-jsx-text.js";

export default tseslint.config(
  {
    ignores: [
      "**/dist/**",
      "**/node_modules/**",
      "**/coverage/**",
      "docs/**",
      "openapi/**",
      "packages/api-client/src/generated/**",
    ],
  },
  js.configs.recommended,
  ...tseslint.configs.strict,
  {
    rules: {
      "@typescript-eslint/no-explicit-any": "error",
      "@typescript-eslint/ban-ts-comment": [
        "error",
        { "ts-expect-error": "allow-with-description", "ts-ignore": true },
      ],
    },
  },
  {
    // Texto visible solo desde los catálogos de @atrio/i18n (I18N-01). Las pruebas pueden
    // usar literales: no son texto que vea el usuario.
    files: ["**/*.tsx"],
    ignores: ["**/*.test.tsx"],
    plugins: { atrio: { rules: { "no-literal-jsx-text": noLiteralJsxText } } },
    rules: { "atrio/no-literal-jsx-text": "error" },
  },
);
