// flat config: https://eslint.org/docs/latest/use/configure/configuration-files-new
// https://github.com/antfu/eslint-config-flat-gitignore
const { readGitignoreFiles } = require('eslint-gitignore');

module.exports = {
  ignorePatterns: readGitignoreFiles({ cwd: __dirname }),
  parser: '@typescript-eslint/parser',
  extends: [
    'plugin:import/errors',
    'plugin:import/warnings',
    'plugin:import/typescript',
    'plugin:@typescript-eslint/recommended',
    'plugin:prettier/recommended',
  ],
  parserOptions: {
    ecmaVersion: 2020,
    sourceType: 'module',
  },
  settings: {
    'import/resolver': {
      typescript: {
        project: 'packages/*/tsconfig.json',
      },
    },
  },
  rules: {
    'no-fallthrough': 2,
    'no-console': 1,
    'sort-imports': 0,
    'import/no-extraneous-dependencies': 2,
    'import/no-named-as-default': 0,
    // https://github.com/benmosher/eslint-plugin-import/blob/HEAD/docs/rules/order.md
    'import/order': ['error', { 'newlines-between': 'always' }],
    'import/newline-after-import': 'error',
    '@typescript-eslint/no-shadow': 1,
    '@typescript-eslint/no-non-null-assertion': 'off',
    '@typescript-eslint/no-var-requires': 'off',
    '@typescript-eslint/explicit-member-accessibility': 'off',
    '@typescript-eslint/explicit-function-return-type': 'off',
    '@typescript-eslint/explicit-module-boundary-types': 'off',
    '@typescript-eslint/no-explicit-any': 'off',
    '@typescript-eslint/no-unused-vars': [
      process.env.NODE_ENV === 'production' ? 2 : 1,
      {
        vars: 'all',
        args: 'after-used',
        ignoreRestSiblings: true,
        caughtErrors: 'none',
        varsIgnorePattern: '^_',
        argsIgnorePattern: '^_',
      },
    ],
  },
  overrides: [
    {
      files: [
        '**/*.js',
        '**/*.test.ts',
        'packages/gem-port/src/**/*.ts',
        'packages/gem-examples/src/**/*.ts',
        'packages/gem-devtools/src/scripts/*.ts',
        'packages/gem/src/helper/logger.ts',
      ],
      rules: {
        'no-console': 'off',
      },
    },
  ],
};
