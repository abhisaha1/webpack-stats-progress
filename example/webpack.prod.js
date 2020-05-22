const path = require("path");

const buildPath = path.resolve(__dirname, "../dist");
const FileStats = require("../lib");
const MiniCssExtractPlugin = require("mini-css-extract-plugin");

module.exports = {
  mode: "production",
  devtool: "source-map",
  entry: {
    keys: ["./example/index.ts"],
    chaining: ["./example/chaining.ts"],
    foreach: ["./example/foreach.ts"],
    map: ["./example/map.ts"],
    times: ["./example/times.ts"],
  },
  output: {
    filename: "[name].js",
    path: buildPath,
  },
  stats: "none",
  module: {
    rules: [
      {
        test: /\.(ts|js)$/,
        exclude: /node_modules/,
        loader: "ts-loader",
        options: {
          transpileOnly: true,
          experimentalWatchApi: true,
        },
      },
      {
        test: /\.css$/i,
        use: [MiniCssExtractPlugin.loader, "css-loader"],
      },
    ],
  },
  plugins: [
    new FileStats({ buildFolder: "../dist" }),
    new MiniCssExtractPlugin({ filename: "[name].[hash].css" }),
  ],
};
