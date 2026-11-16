// Prohíbe texto literal visible en JSX: todo texto sale de los catálogos de @atrio/i18n
// (`<FormattedMessage>` o `useIntl()`). Es JS plano para que ESLint lo cargue sin compilar.

// Atributos HTML con texto visible o leído por lectores de pantalla, y las props de texto de
// los componentes de @atrio/ui (Field: label, description, error).
const TEXT_ATTRIBUTES = new Set([
  "alt",
  "title",
  "placeholder",
  "aria-label",
  "aria-description",
  "label",
  "description",
  "error",
]);

// Un texto sin letras ni números (`*`, `·`, `—`, `/`) es decoración, no un mensaje traducible.
const HAS_WORDS = /[\p{L}\p{N}]/u;

function staticText(node) {
  if (node.type === "Literal" && typeof node.value === "string") return node.value;
  if (node.type === "TemplateLiteral" && node.expressions.length === 0) {
    return node.quasis.map((quasi) => quasi.value.cooked ?? "").join("");
  }
  return null;
}

/** @type {import("eslint").Rule.RuleModule} */
export default {
  meta: {
    type: "problem",
    docs: { description: "Prohíbe texto literal en JSX; usa los catálogos de @atrio/i18n" },
    schema: [],
    messages: {
      text: "Texto literal en JSX: muévelo a packages/i18n y usa <FormattedMessage> o useIntl().",
      attribute:
        'Texto literal en "{{name}}": muévelo a packages/i18n y usa useIntl().formatMessage.',
    },
  },
  create(context) {
    return {
      JSXText(node) {
        if (HAS_WORDS.test(node.value)) context.report({ node, messageId: "text" });
      },
      JSXExpressionContainer(node) {
        // `{"texto"}` como hijo; en atributos lo cubre JSXAttribute.
        if (node.parent.type !== "JSXElement" && node.parent.type !== "JSXFragment") return;
        const text = staticText(node.expression);
        if (text !== null && HAS_WORDS.test(text)) context.report({ node, messageId: "text" });
      },
      JSXAttribute(node) {
        if (node.name.type !== "JSXIdentifier" || !TEXT_ATTRIBUTES.has(node.name.name)) return;
        const value =
          node.value?.type === "JSXExpressionContainer" ? node.value.expression : node.value;
        const text = value ? staticText(value) : null;
        if (text !== null && HAS_WORDS.test(text)) {
          context.report({ node, messageId: "attribute", data: { name: node.name.name } });
        }
      },
    };
  },
};
