import {
  measureFileSizesBeforeBuild,
  printFileSizesAfterBuild,
} from "./reporter";
import { Compiler, Stats } from "webpack";
import { ISizeMap } from "./types";
import { progressBarPlugin } from "./progress";
import { printBuildError } from "./error";
const chalk = require("chalk");

interface IOptions {
  buildFolder: string;
  maxBundleGzipSize?: number;
  maxChunkGzipSize?: number;
}

class BetterWebpackStats {
  /**
   * Destination build folder
   *
   * @type {IOptions["buildFolder"]}
   * @memberof BetterWebpackStats
   */
  buildFolder: IOptions["buildFolder"];
  maxBundleGzipSize: IOptions["maxBundleGzipSize"];
  maxChunkGzipSize: IOptions["maxChunkGzipSize"];
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
      // Measure bundle size only for production build
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
      // Measure bundle size only for production build
      if (compiler.options.mode !== "production") return callback();
      measureFileSizesBeforeBuild(this.buildFolder).then((sizeMap) => {
        this.previousSizeMap = sizeMap;
        callback();
      });
    });
  }
}

module.exports = BetterWebpackStats;
