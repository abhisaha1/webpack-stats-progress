import _ from "lodash-es";

_.forEach({ foo: "bar", baz: "quux" }, (value, key) => {
  console.log(key, value);
});
