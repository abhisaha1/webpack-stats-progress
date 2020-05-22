const path = require("path");

const buildPath = path.resolve(__dirname, "../dist");
const FileStats = require("../lib");

module.exports = {
  mode: "production",
  devtool: "source-map",
  entry: {
    file1: ["./test/index.js"],
    file2: ["./test/file2.js"],
    file3: ["./test/file3.js"],
    file4: ["./test/file4.js"],
    file5: ["./test/file5.js"],
    file6: ["./test/file6.js"],
  },
  output: {
    filename: "[name].[hash:20].js",
    path: buildPath,
  },
  stats: "none",
  node: {
    fs: "empty",
  },
  module: {
    rules: [
      {
        test: /\.js$/,
        exclude: /node_modules/,
        loader: "babel-loader",
      },
    ],
  },
  plugins: [new FileStats({ env: "production", buildFolder: "../build" })],
};
