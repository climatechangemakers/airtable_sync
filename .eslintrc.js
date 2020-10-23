module.exports = {
  env: {
    es6: true,
    node: true,
  },
  parser: '@typescript-eslint/parser',
  parserOptions: {
    project: ['tsconfig*'],
  },
  plugins: ['@typescript-eslint', 'prettier'],
  extends: [
    'airbnb-typescript/base', // this replaces airbnb-base to avoid compatibility issues (see reference above)
    // 'plugin:@typescript-eslint/recommended', // would be nice to enable, but we first need to be a little more rigorous with types
    'plugin:import/typescript',
    'plugin:prettier/recommended',
    'prettier/@typescript-eslint',
  ],
  rules: {
    'prettier/prettier': 'error',
    'import/extensions': [
      'error',
      'ignorePackages',
      {
        js: 'never',
        jsx: 'never',
        ts: 'never',
        tsx: 'never',
      },
    ],
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
        '@typescript-eslint/camelcase': 'off', // should be refactored, but will take some time
        '@typescript-eslint/naming-convention': 'off', // should be refactored, but will take some time
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
