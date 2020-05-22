import { ISizeMap } from "./types";
import { Stats } from "webpack";

const fs = require("fs");
const path = require("path");
const chalk = require("chalk");
const filesize = require("filesize");
const stripAnsi = require("strip-ansi");
const recursive = require("recursive-readdir");
const gzipSize = require("gzip-size").sync;

function canReadAsset(asset: string) {
  return (
    /\.(js|css)$/.test(asset) &&
    !/service-worker\.js/.test(asset) &&
    !/precache-manifest\.[0-9a-f]+\.js/.test(asset)
  );
}

// Prints a detailed summary of build files.
export function printFileSizesAfterBuild(
  webpackStats: Stats,
  previousSizeMap: ISizeMap,
  buildFolder: string,
  maxBundleGzipSize: number | undefined,
  maxChunkGzipSize: number | undefined,
) {
  const { sizes } = previousSizeMap;
  const assets = [webpackStats]
    .map((stats: Stats) => {
      const jsonStats = stats.toJson({ all: false, assets: true });
      if (!jsonStats.assets) return;

      return jsonStats.assets
        .filter((asset) => canReadAsset(asset.name))
        .map((asset) => {
          let root = buildFolder;

          const fileContents = fs.readFileSync(path.join(root, asset.name));
          const size = gzipSize(fileContents);
          const previousSize = sizes[removeFileNameHash(root, asset.name)];
          const difference = getDifferenceLabel(size, previousSize);
          return {
            folder: path.join(
              path.basename(buildFolder),
              path.dirname(asset.name),
            ),
            name: path.basename(asset.name),
            size: size,
            sizeLabel:
              filesize(size) + (difference ? " (" + difference + ")" : ""),
          };
        });
    })
    //@ts-ignore
    .reduce((single, all) => all.concat(single), []);

  if (!assets) return;

  assets.sort((a, b) => b.size - a.size);

  const longestSizeLabelLength = Math.max.apply(
    null,
    assets.map((a) => stripAnsi(a.sizeLabel).length),
  );
  let suggestBundleSplitting = false;
  console.log("\n");
  assets.forEach(printAsset);
  console.log("\n");

  if (suggestBundleSplitting) {
    printSuggestions();
  }

  /**
   * Print asset with less information and prettify it
   * @param asset Information about the asset
   */
  function printAsset(asset: {
    folder: any;
    name: any;
    size: any;
    sizeLabel: string;
  }) {
    let { sizeLabel } = asset;
    const sizeLength = stripAnsi(sizeLabel).length;
    if (sizeLength < longestSizeLabelLength) {
      let rightPadding = " ".repeat(longestSizeLabelLength - sizeLength);
      sizeLabel += rightPadding;
    }
    const isMainBundle = asset.name.indexOf("main.") === 0;
    const maxRecommendedSize = isMainBundle
      ? maxBundleGzipSize
      : maxChunkGzipSize;
    const isLarge = maxRecommendedSize && asset.size > maxRecommendedSize;
    if (isLarge && path.extname(asset.name) === ".js") {
      suggestBundleSplitting = true;
    }

    console.log(
      "  " +
        (isLarge ? chalk.yellow(sizeLabel) : sizeLabel) +
        "  " +
        chalk.dim(asset.folder + path.sep) +
        chalk.cyan(asset.name),
    );
  }
}

function removeFileNameHash(buildFolder: string, fileName: string) {
  return fileName
    .replace(buildFolder, "")
    .replace(/\\/g, "/")
    .replace(
      /\/?(.*)(\.[0-9a-f]+)(\.chunk)?(\.js|\.css)/,
      (match, p1, p2, p3, p4) => p1 + p4,
    );
}

// Input: 1024, 2048
// Output: "(+1 KB)"
function getDifferenceLabel(currentSize: number, previousSize: number) {
  const FIFTY_KILOBYTES = 1024 * 50;
  const difference = currentSize - previousSize;
  const fileSize = !Number.isNaN(difference) ? filesize(difference) : 0;
  if (difference >= FIFTY_KILOBYTES) {
    return chalk.red("+" + fileSize);
  } else if (difference < FIFTY_KILOBYTES && difference > 0) {
    return chalk.yellow("+" + fileSize);
  } else if (difference < 0) {
    return chalk.green(fileSize);
  } else {
    return "";
  }
}

export function measureFileSizesBeforeBuild(
  buildFolder: string,
): Promise<ISizeMap> {
  return new Promise((resolve) => {
    recursive(buildFolder, (err: any, fileNames: string[]) => {
      var sizes;
      if (!err && fileNames) {
        sizes = fileNames
          .filter(canReadAsset)
          .reduce((memo: any, fileName: string) => {
            var contents = fs.readFileSync(fileName);
            var key = removeFileNameHash(buildFolder, fileName);
            memo[key] = gzipSize(contents);
            return memo;
          }, {});
      }
      resolve({
        root: buildFolder,
        sizes: sizes || {},
      });
    });
  });
}

function printSuggestions() {
  console.log();
  console.log(
    chalk.yellow("The bundle size is significantly larger than recommended."),
  );
  console.log(
    chalk.yellow(
      "Consider reducing it with code splitting: https://goo.gl/9VhYWB",
    ),
  );
  console.log(
    chalk.yellow(
      "You can also analyze the project dependencies: https://goo.gl/LeUzfb",
    ),
  );
}
