module.exports = {
  env: {
    browser: true,
    webextensions: true,
    es2021: true
  },
  extends: [
    'standard'
  ],
  parserOptions: {
    ecmaVersion: 12,
    sourceType: 'module'
  },
  rules: {
    semi: ['error', 'always'],
    'import/no-absolute-path': 'off'
  }
};
