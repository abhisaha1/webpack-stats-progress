const babel = {
  presets: [
    [
      "@babel/env",
      {
        targets: {
          node: 12,
        },
      },
    ],
    "@babel/preset-typescript",
  ],
};

module.exports = babel;
