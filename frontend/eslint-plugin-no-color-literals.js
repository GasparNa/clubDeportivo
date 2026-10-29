/**
 * ESLint plugin: no-color-literals
 * Previene el uso de valores de color crudos (hex, rgb, hsl, nombres de color)
 * en archivos TSX/JSX, forzando el uso de tokens semánticos de Tailwind.
 */

const HEX_COLOR = /#[0-9a-fA-F]{3,8}\b/;
const RGB_COLOR = /\brgba?\s*\(/;
const HSL_COLOR = /\bhsla?\s*\(/;
const NAMED_COLORS = /\b(white|black|red|blue|green|yellow|orange|purple|pink|gray|grey|transparent)\b/i;

const COLOR_REGEX = new RegExp(
  [HEX_COLOR.source, RGB_COLOR.source, HSL_COLOR.source].join("|"),
  "i"
);

const noColorLiteralsRule = {
  meta: {
    type: "suggestion",
    docs: {
      description: "Disallow raw color literals in JSX (use Tailwind semantic tokens)",
    },
    messages: {
      noColorLiteral:
        "Color literal '{{value}}' found. Use Tailwind semantic tokens (e.g., bg-primary, text-success) instead of raw color values.",
      noNamedColor:
        "Named color '{{value}}' found. Use Tailwind semantic tokens instead of named colors.",
    },
  },
  create(context) {
    return {
      Literal(node) {
        if (typeof node.value !== "string") return;

        const colorMatch = node.value.match(COLOR_REGEX);
        if (colorMatch) {
          context.report({
            node,
            messageId: "noColorLiteral",
            data: { value: colorMatch[0] },
          });
        }

        // Check for named colors in style objects or className strings
        const namedMatch = node.value.match(NAMED_COLORS);
        if (namedMatch && node.value.length < 30) {
          // Only flag short strings that are likely color names
          const word = namedMatch[0].toLowerCase();
          if (["white", "black", "red", "blue", "green", "yellow", "orange", "purple", "pink", "gray", "grey"].includes(word)) {
            context.report({
              node,
              messageId: "noNamedColor",
              data: { value: word },
            });
          }
        }
      },
      Property(node) {
        // Check for color values in style objects
        if (
          node.key &&
          (node.key.name === "color" ||
            node.key.name === "backgroundColor" ||
            node.key.name === "borderColor")
        ) {
          if (node.value && node.value.type === "Literal" && typeof node.value.value === "string") {
            const val = node.value.value;
            if (COLOR_REGEX.test(val) || NAMED_COLORS.test(val)) {
              context.report({
                node: node.value,
                messageId: "noColorLiteral",
                data: { value: val },
              });
            }
          }
        }
      },
    };
  },
};

const plugin = {
  rules: {
    "no-color-literals": noColorLiteralsRule,
  },
};

export default plugin;