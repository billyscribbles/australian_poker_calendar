import js from '@eslint/js'
import globals from 'globals'
import react from 'eslint-plugin-react'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import jsxA11y from 'eslint-plugin-jsx-a11y'
import prettier from 'eslint-config-prettier'

export default [
  {
    // Build output, Yarn internals, and vendored skill code are not ours to lint.
    ignores: [
      'dist',
      '.prerender',
      '.yarn',
      '.pnp.cjs',
      '.pnp.loader.mjs',
      '.agents',
      '.claude',
      // Vite bundles vite.config.js to a transient *.timestamp-*.mjs whenever
      // the config (or theme.config.js, which it imports) changes. A lint run
      // that globs while a dev server is doing that fails on the vanished file.
      'vite.config.js.timestamp-*',
    ],
  },
  js.configs.recommended,
  {
    files: ['**/*.{js,jsx}'],
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
      globals: {
        ...globals.browser,
      },
      parserOptions: {
        ecmaFeatures: { jsx: true },
      },
    },
    plugins: {
      react,
      'react-hooks': reactHooks,
      'react-refresh': reactRefresh,
      'jsx-a11y': jsxA11y,
    },
    rules: {
      ...reactHooks.configs.recommended.rules,
      // Accessibility lint — catches missing alt text, aria misuse, etc.
      ...jsxA11y.flatConfigs.recommended.rules,
      // Mark JSX-referenced identifiers (e.g. `motion` in `<motion.div>`) as used.
      'react/jsx-uses-vars': 'error',
      'react-refresh/only-export-components': ['warn', { allowConstantExport: true }],
      'no-unused-vars': ['error', { varsIgnorePattern: '^[A-Z_]' }],
    },
  },
  {
    // Test files, Vitest config, the production and admin servers and build scripts run
    // under Node + Vitest globals.
    files: [
      'src/test/**/*.{js,jsx}',
      'scripts/**/*.{js,mjs}',
      'server/**/*.{js,mjs}',
      'admin/*.mjs',
      'admin/**/*.{js,mjs}',
      '*.config.js',
    ],
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
      globals: {
        ...globals.node,
        describe: 'readonly',
        it: 'readonly',
        test: 'readonly',
        expect: 'readonly',
        vi: 'readonly',
        beforeEach: 'readonly',
        afterEach: 'readonly',
        beforeAll: 'readonly',
        afterAll: 'readonly',
      },
    },
  },
  {
    // The prerender entry is a build-time module, never shipped to the browser,
    // so Fast Refresh has no opinion worth hearing about its exports.
    files: ['src/entry-prerender.jsx'],
    rules: { 'react-refresh/only-export-components': 'off' },
  },
  prettier,
]
