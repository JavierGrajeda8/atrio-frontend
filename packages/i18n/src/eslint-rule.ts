/**
 * ESLint rule to prevent literal strings in JSX
 * Enforces the use of <FormattedMessage> or useIntl() for all user-visible text
 */

import type { Rule } from "eslint";

// ts-expect-error - ESTree JSX types not directly exported
const rule: Rule.RuleModule = {
  meta: {
    type: "problem",
    docs: {
      description: "disallow literal strings in JSX",
      category: "Best Practices",
      recommended: true,
    },
    schema: [],
  },
  create(context) {
    return {
      JSXText(node: unknown) {
        const jsxNode = node as { value: string };
        const text = jsxNode.value.trim();

        // Skip empty or whitespace-only text
        if (!text) return;

        // Skip common whitespace nodes (newlines between tags)
        if (/^\s*\n\s*$/.test(jsxNode.value)) return;

        // Skip single punctuation
        if (/^[.,!?;:\-–—]$/.test(text)) return;

        // Report the error
        context.report({
          node: node as Rule.Node,
          message:
            "Literal text in JSX is not allowed. Use <FormattedMessage> or useIntl() from react-intl instead.",
        });
      },
      JSXAttribute(node: unknown) {
        const jsxAttr = node as {
          name?: { name?: string };
          value?: { type: string; value?: string };
        };

        // Check for string literals in common text attributes
        const attrName = jsxAttr.name?.name;
        if (
          attrName &&
          (attrName === "alt" ||
            attrName === "title" ||
            attrName === "placeholder" ||
            attrName === "aria-label")
        ) {
          if (jsxAttr.value?.type === "Literal" && typeof jsxAttr.value.value === "string") {
            context.report({
              node: node as Rule.Node,
              message: `Literal text in "${attrName}" is not allowed. Use a message from i18n instead.`,
            });
          }
        }
      },
    };
  },
};

export default rule;
