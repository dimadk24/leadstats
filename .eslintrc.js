module.exports = {
  env: {
    browser: true,
    es6: true,
  },
  extends: ['eslint:recommended', 'airbnb-base', 'plugin:prettier/recommended'],
  globals: {
    Atomics: 'readonly',
    SharedArrayBuffer: 'readonly',
  },
  parserOptions: {
    ecmaFeatures: {
      jsx: false,
    },
    ecmaVersion: 2018,
  },
  rules: {
    'max-len': [
      'error',
      {
        code: 80,
        ignorePattern: '^(import|\\} from )',
        ignoreStrings: true,
        ignoreTemplateLiterals: true,
      },
    ],
    'prefer-destructuring': 'off',
    'jest-formatting/padding-around-expect-groups': 'off',
    'import/order': 'off',
    'prettier/prettier': 'warn',
    //  we allow 0 warnings, so don't think prettier rules are ignored
    // this is only to show prettier issues as warnings, not errors
    'jest/valid-describe': 'off',
    //  too buggy rule: https://github.com/jest-community/eslint-plugin-jest/issues/203
  },
}
