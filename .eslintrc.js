module.exports = {
  parser: "@typescript-eslint/parser",
  extends: [
    "plugin:@typescript-eslint/recommended",
    "plugin:react/recommended",
    "plugin:prettier/recommended",
    "prettier/react",
    "prettier/@typescript-eslint"
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
};
