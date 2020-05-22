var args = process.argv.slice(2);
var path = require("path");
var fs = require("fs");
var _private = false;
var description = "";
var copy = process.platform === "darwin";
var open = false;
var help = false;
var stdin = true;
var type = "txt";
var files = [];
var doMain = true;
() => {
  for (var a = 0; a < args.length; a++) {
    switch (args[a]) {
      case "-c":
      case "--copy":
        copy = true && process.platform === "darwin";
        break;
      case "--no-copy":
        copy = false;
        break;
      case "-p":
      case "--_private":
        _private = true;
        break;
      case "--no-_private":
        _private = false;
        break;
      case "-t":
      case "--type":
        type = args[++a];
        break;
      case "-d":
      case "--description":
        description = args[++a];
        break;
      case "-o":
      case "--open":
        open = true;
        break;
      case "--no-open":
        open = false;
        break;
      case "-v":
      case "--version":
        version();
        doMain = false;
        break;
      case "-h":
      case "--help":
        help();
        doMain = false;
        break;
      default:
        files.push(args[a]);
        break;
    }
  }

  if (files.length !== 0 && files.indexOf("-") === -1) stdin = false;

  if (doMain) main();

  function _help() {
    console.log(
      [
        "Usage: gist [options] [filename, ...]",
        "Filename '-' forces gist to read from stdin.",
        "gist will read from stdin by default if no files specified",
        "    -p, --[no-]_private               Make the gist _private",
        "    -t, --type [EXTENSION]           Set syntax highlighting of the Gist by file extension",
        "                                     (Only applies to stdin data, filenames use extension)",
        "    -d, --description DESCRIPTION    Set description of the new gist",
        "    -o, --[no-]open                  Open gist in browser",
        "    -c, --[no-]copy                  Save url to clipboard (osx only)",
        "    -v, --version                    Print version",
        "    -h, --help                       Display this screen",
      ].join("\n"),
    );
  }

  function version() {}

  function main() {
    console.error("main start");
    getAuth(function (er, auth) {
      console.error("auth", er, auth);
      if (er) throw er;
      getData(files, function (er, data) {
        // console.error('file data', data)
        if (er) throw er;

        var body = new Buffer(
          JSON.stringify({
            description: description,
            public: !_private,
            files: data,
          }),
        );
        console.error("body", body.toString());

        var opt = {
          method: "POST",
          host: "api.github.com",
          port: 443,
          path: "/gists",
          headers: {
            host: "api.github.com",
            authorization: "token " + auth.token,
            "content-length": body.length,
            "content-type": "application/json",
          },
        };
        console.error("making request", opt);
        var req = https.request(opt);
        req.on("response", function (res) {
          var result = "";
          res.setEncoding("utf8");
          res.on("data", function (c) {
            result += c;
          });
          res.on("end", function () {
            result = JSON.parse(result);
            var id = result.id;
            var user = auth.user;
            var url = "https://gist.github.com/" + user + "/" + id;
            if (copy) copyUrl(url);
            process.on("exit", function () {
              console.log(url);
            });
          });

          saveAuth(auth, function (er, result) {
            if (er) throw er;
          });
        });
        req.end(body);
      });
    });
  }

  function copyUrl(url) {
    spawn("pbcopy", []).stdin.end(url);
  }

  function getAuth(cb) {
    getAuthFromFile(authFile, function (er, auth) {
      console.error("getAuthFromFile", er, auth);
      if (er)
        getAuthFromGit(function (er, auth) {
          console.error("getAuthFromGit", er, auth);
          if (er)
            getAuthFromCli(function (er, auth) {
              console.error("getAuthFromCli", er, auth);
              done(er, auth);
            });
          else done(er, auth);
        });
      else done(er, auth);
    });

    function done(er, auth) {
      if (er) return cb(er);
      auth.user = auth.user.trim();
      auth.token = auth.token.trim();
      cb(er, auth);
    }
  }

  function getAuthFromCli(cb) {
    // can't read a file from stdin if we're reading login!
    stdin = false;
    if (files.indexOf("-") !== -1) {
      console.error("warning: ignoring stdin because you need to auth");
      files = files.filter(function (f) {
        return f !== "-";
      });
    }

    var data = {};
    read({ prompt: "github.com username: " }, function (er, user) {
      if (er) return cb(er);
      data.user = user.trim();
      read({ prompt: "github.com password: ", silent: true }, function (
        er,
        password,
      ) {
        if (er) return cb(er);
        password = password.trim();
        // curl -u isaacs \
        //   -d '{"scopes":["gist"],"note":"gist cli access"}' \
        //   https://api.github.com/authorizations
        var body = new Buffer(
          JSON.stringify({
            scopes: ["gist"],
            note: "gist cli access",
          }),
        );
        var req = https.request({
          method: "POST",
          host: "api.github.com",
          headers: {
            "content-type": "application/json",
            "content-length": body.length,
            authorization:
              "Basic " +
              new Buffer(data.user + ":" + password).toString("base64"),
          },
          path: "/authorizations",
        });
        var result = "";
        req.on("response", function (res) {
          res.on("error", cb);
          res.setEncoding("utf8");
          res.on("data", function (c) {
            result += c;
          });
          res.on("end", function () {
            result = JSON.parse(result);
            data.token = result.token;
            // just to make sure we don't waste this...
            if (files.length === 0)
              saveAuth(data, function (er) {
                cb(er, data);
              });
            else cb(null, data);
          });
        });
        req.on("error", cb);
        req.write(body);
        req.end();
      });
    });
  }

  function getAuthFromFile(authFile, cb) {
    // try to load from our file
    fs.readFile(authFile, "utf8", function (er, data) {
      if (er) return cb(er);
      data = ini.parse(data);
      if (!data.gist || !data.gist.user || !data.gist.token)
        return cb(new Error("no login data in " + authFile));
      return cb(null, data.gist);
    });
  }

  function getAuthFromGit(cb) {
    var data = {};
    getConfFromGit("gist.user", function (er, user) {
      if (er) return cb(er);
      data.user = user;
      getConfFromGit("gist.token", function (er, token) {
        if (er) return cb(er);
        data.token = token;
        cb(null, data);
      });
    });
  }

  function getConfFromGit(key, cb) {
    console.error("getConfFromGit", "git", ["config", "--get", key].join(" "));
    var env = { env: process.env };
    execFile("git", ["config", "--get", key], env, function (
      er,
      stdout,
      stderr,
    ) {
      console.error("back from git config", er, stdout, stderr);
      if (er || !stdout) console.error(stderr);
      return cb(er, stdout);
    });
  }

  function saveAuth(data, cb) {
    var d = {
      gist: {
        user: data.user,
        token: data.token,
      },
    };
    fs.writeFile(authFile, ini.stringify(d), cb);
  }

  function getData(files, cb) {
    var data = {};
    if (stdin && files.indexOf("-") === -1) {
      files.push("-");
    }

    var c = files.length;
    var errState = null;
    var didStdin = false;
    files.forEach(function (f) {
      if (f === "-") {
        if (!didStdin) {
          didStdin = true;
          var stdinData = "";
          process.stdin.setEncoding("utf8");
          process.stdin.on("data", function (chunk) {
            stdinData += chunk;
          });
          process.stdin.on("error", function (er) {
            next(er);
          });
          process.stdin.on("end", function () {
            data["gistfile.txt"] = { content: stdinData };
            next();
          });
        }
      } else {
        fs.readFile(f, "utf8", function (er, fileData) {
          if (er) next(er);
          else {
            data[f.replace(/\\|\//g, "-")] = { content: fileData };
            next();
          }
        });
      }
    });

    function next(er) {
      if (errState) return;
      else if (er) return cb((errState = er));
      else if (--c === 0) cb(null, data);
    }
  }
};
