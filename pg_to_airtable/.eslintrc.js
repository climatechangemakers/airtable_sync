module.exports = {
  env: {
    es6: true,
    node: true,
  },
  parser: '@typescript-eslint/parser',
  parserOptions: {
    project: ['tsconfig.json'],
  },
  plugins: ['@typescript-eslint', 'prettier'],
  extends: [
    'airbnb-typescript/base',
    // 'plugin:@typescript-eslint/recommended',
    'plugin:prettier/recommended',
  ],
  rules: {
    'prettier/prettier': 'error',
    'no-console': 'off',
    'import/prefer-default-export': 'off',
    '@typescript-eslint/comma-dangle': 'warn',
  },
  overrides: [
    {
      files: ['test/**/*.{js,ts}'],
      rules: {
        'no-undef': 'off',
        'func-names': 'off',
        '@typescript-eslint/no-var-requires': 'off',
      },
    },
  ],
};
