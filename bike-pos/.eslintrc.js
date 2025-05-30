module.exports = {
  extends: [
    'react-app',
    'react-app/jest'
  ],
  rules: {
    // Any custom rules you want to add
    '@typescript-eslint/no-unused-vars': 'off',
    'no-control-regex': 'off',
    'react-hooks/exhaustive-deps': 'off',
  },
  settings: {
    'import/resolver': {
      node: {
        extensions: ['.js', '.jsx', '.ts', '.tsx']
      }
    }
  }
};
