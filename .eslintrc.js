module.exports = {
  parser: "@typescript-eslint/parser",
  extends: [
    "plugin:@typescript-eslint/recommended",
    "plugin:react/recommended",
    "plugin:prettier/recommended",
    'plugin:@next/next/recommended',
  ],
  plugins: [
    "@typescript-eslint",
    "react",
    "prettier"
  ],
  rules: {
    "react/react-in-jsx-scope": "off",
    "react/prop-types": "off",
    "@typescript-eslint/no-unused-vars": ["error", { "vars": "all", "args": "after-used", "ignoreRestSiblings": true }]
  },
  globals: {
    React: "writable"
  },
  settings: {
    react: {
      version: "detect"
    }
  }
};
