import js from "@eslint/js";
import tseslint from "typescript-eslint";

export default tseslint.config(
  { ignores: ["**/dist/**", "**/node_modules/**", "**/coverage/**", "docs/**", "openapi/**"] },
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
    files: ["**/*.tsx"],
    rules: {
      // i18n/no-literal-string rule will be enabled when react components are added
      // This rule prevents literal strings in JSX - use <FormattedMessage> or useIntl()
    },
  },
);
