import tseslint from "typescript-eslint";
import globals from "globals";

/**
 * Flat ESLint config (ESLint 9). Introduced onto an existing codebase, so the high-churn
 * rules are `warn` (signal to clean up over time) rather than `error` (blocking) — CI can
 * tighten them later. Real mistakes (rules-of-hooks-style bugs) still error.
 */
export default tseslint.config(
  { ignores: ["dist/**", "drizzle/**", "node_modules/**", "eslint.config.js"] },
  ...tseslint.configs.recommended,
  {
    languageOptions: {
      globals: { ...globals.node },
    },
    rules: {
      "@typescript-eslint/no-explicit-any": "warn",
      "@typescript-eslint/no-unused-vars": ["warn", { argsIgnorePattern: "^_", varsIgnorePattern: "^_" }],
      "@typescript-eslint/no-empty-object-type": "warn",
      // `declare global { namespace Express { … } }` is the standard request augmentation.
      "@typescript-eslint/no-namespace": "off",
    },
  }
);
