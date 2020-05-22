import {
  measureFileSizesBeforeBuild,
  printFileSizesAfterBuild,
} from "./reporter";
import { Compiler, Stats } from "webpack";
import { ISizeMap } from "./types";
import { progressBarPlugin } from "./progress";
const chalk = require("chalk");

interface IOptions {
  buildFolder: string;
  maxBundleGzipSize?: number;
  maxChunkGzipSize?: number;
}

class FormatStats {
  maxBundleGzipSize: IOptions["maxBundleGzipSize"];
  maxChunkGzipSize: IOptions["maxChunkGzipSize"];
  buildFolder: IOptions["buildFolder"];
  previousSizeMap: ISizeMap;

  constructor(options: IOptions) {
    this.maxBundleGzipSize = options.maxBundleGzipSize || 0;
    this.maxChunkGzipSize = options.maxChunkGzipSize || 0;
    this.previousSizeMap = { root: "", sizes: {} };
    this.buildFolder = options.buildFolder;
    console.clear();
    console.log("\n");
  }

  apply(compiler: Compiler) {
    // Initialize the progress bar
    progressBarPlugin().apply(compiler);

    compiler.hooks.done.tap("done", (stats: Stats) => {
      //@ts-ignore
      process.stdout.clearLine();
      var error = stats.compilation.errors[0];
      if (error) {
        printBuildError(error.error);
      }

      if (compiler.options.mode !== "production") return;
      console.log(chalk.magenta("The sizes displayed below are gzipped"));
      return printFileSizesAfterBuild(
        stats,
        this.previousSizeMap,
        this.buildFolder,
        this.maxBundleGzipSize,
        this.maxChunkGzipSize,
      );
    });

    compiler.hooks.beforeCompile.tapAsync("beforeRun", (params, callback) => {
      if (compiler.options.mode !== "production") return callback();
      measureFileSizesBeforeBuild(this.buildFolder).then((sizeMap) => {
        this.previousSizeMap = sizeMap;
        callback();
      });
    });
  }
}

module.exports = FormatStats;

function printBuildError(err: Error) {
  const message = err != null && err.message;
  const stack = err != null && err.stack;

  // Add more helpful message for Terser error
  if (
    stack &&
    typeof message === "string" &&
    message.indexOf("from Terser") !== -1
  ) {
    try {
      const matched = /(.+)\[(.+):(.+),(.+)\]\[.+\]/.exec(stack);
      if (!matched) {
        throw new Error("Using errors for control flow is bad.");
      }
      const problemPath = matched[2];
      const line = matched[3];
      const column = matched[4];
      console.log(
        "Failed to minify the code from this file: \n\n",
        chalk.yellow(
          `\t${problemPath}:${line}${column !== "0" ? ":" + column : ""}`,
        ),
        "\n",
      );
    } catch (ignored) {
      console.log("Failed to minify the bundle.", err);
    }
    console.log("Read more here: https://cra.link/failed-to-minify");
  } else {
    console.log((message || err) + "\n");
  }
}
