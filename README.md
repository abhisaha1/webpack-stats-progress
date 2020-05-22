This plugin is intended to provide cleaner output of webpack build. It also displays a progress bar while the build is running.

### Usage

In th webpack config file, add this plugin and make sure to turn off the stats

```js
const WebpackStatsProgress = require("webpack-stats-progress");

module.exports = {
  mode: "production",
  stats: "none",
  plugins: [new WebpackStatsProgress({ buildFolder: "build" })],
};
```

Check the example in the `example` folder.
