import webpack from "webpack";
import chalk from "chalk";

const barLeft = chalk.bold("[");
const barRight = chalk.bold("]");
const preamble = chalk.cyan.bold("  Running Webpack ") + barLeft;

const barFormat =
  preamble +
  ":bar" +
  barRight +
  chalk.green.bold(" :percent") +
  chalk.grey.bold(" :msg");

const barOptions = {
  complete: "=",
  incomplete: " ",
  width: 30,
  total: 100,
  clear: true,
};

const ProgressBar = require("progress");

export function progressBarPlugin() {
  const bar = new ProgressBar(barFormat, barOptions);
  return new webpack.ProgressPlugin((percentage, info) => {
    const msg = `${Math.round(percentage * 100)}% ${info}`;
    /* eslint-disable no-console */
    if (!process.stdout.isTTY) {
      return console.log(msg);
    }

    bar.update(percentage, {
      msg: info,
    });
  });
}
