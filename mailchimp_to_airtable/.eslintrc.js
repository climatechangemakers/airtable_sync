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
    'plugin:prettier/recommended'
  ],
  rules: {
    'prettier/prettier': 'error',
    'no-console': 'off',
    'import/prefer-default-export': 'off'
  },
  overrides: [
    {
      files: ['*.js'],
      rules: {
        'consistent-return': 'warn',
        '@typescript-eslint/no-var-requires': 'off', // I don't think this one should apply to .js files
        '@typescript-eslint/explicit-function-return-type': 'off', // this one doesn't apply to .js files
      },
    },
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
