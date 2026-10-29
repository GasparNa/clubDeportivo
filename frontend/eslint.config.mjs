import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";
import noColorLiterals from "./eslint-plugin-no-color-literals.js";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Plugin local: previene uso de colores crudos (hex, rgb, hsl)
  {
    plugins: { "no-color-literals": noColorLiterals },
    rules: {
      "no-color-literals/no-color-literals": "warn",
    },
  },
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
  ]),
]);

export default eslintConfig;
