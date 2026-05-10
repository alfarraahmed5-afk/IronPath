/**
 * IronPath mobile ESLint config. Team A finalizes per lens 10 spec.
 */
module.exports = {
  root: true,
  extends: ['expo', 'prettier'],
  ignorePatterns: ['/dist/*', '/node_modules/*', '/.expo/*'],
  rules: {
    // Founder rule: NO em dashes in source.
    'no-irregular-whitespace': 'error',
    // Tighten over time as the codebase polishes.
    '@typescript-eslint/no-unused-vars': ['warn', { argsIgnorePattern: '^_' }],
    'react-hooks/exhaustive-deps': 'warn',
  },
};
