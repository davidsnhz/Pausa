// eslint.config.js — `npm run lint`
// Reglas recomendadas de JavaScript + las de los hooks de React (incluidas las
// del React Compiler) + aviso si un módulo de página exporta algo más que
// componentes (rompe la recarga en caliente de Vite).
import js from "@eslint/js";
import globals from "globals";
import reactHooks from "eslint-plugin-react-hooks";
import reactRefresh from "eslint-plugin-react-refresh";

export default [
  { ignores: ["dist", "node_modules", "ios", "android"] },
  {
    files: ["src/**/*.{js,jsx}"],
    languageOptions: {
      ecmaVersion: "latest",
      sourceType: "module",
      globals: globals.browser,
      parserOptions: { ecmaFeatures: { jsx: true } },
    },
    plugins: { "react-hooks": reactHooks, "react-refresh": reactRefresh },
    rules: {
      ...js.configs.recommended.rules,
      ...reactHooks.configs.flat.recommended.rules,
      "react-refresh/only-export-components": [
        "warn",
        { allowConstantExport: true, allowExportNames: ["useAuth", "displayNameOf", "useData", "LEGAL_DOCS"] },
      ],
      "no-unused-vars": ["error", { args: "after-used", ignoreRestSiblings: true }],
    },
  },
  {
    files: ["*.{js,mjs}", "scripts/**/*.mjs", "public/sw.js"],
    languageOptions: {
      ecmaVersion: "latest",
      sourceType: "module",
      globals: { ...globals.node, ...globals.serviceworker },
    },
    rules: js.configs.recommended.rules,
  },
];
