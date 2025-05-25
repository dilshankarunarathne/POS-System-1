module.exports = {
  extends: [
    'react-app',
    'react-app/jest'
  ],
  rules: {
    // Any custom rules you want to add
  },
  settings: {
    'import/resolver': {
      node: {
        extensions: ['.js', '.jsx', '.ts', '.tsx']
      }
    }
  }
};
