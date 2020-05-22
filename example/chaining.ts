import _ from "lodash-es";
const array = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "10"];

console.log(
  _.take(
    _.filter(
      _.map(array, (i) => parseInt(i, 10)),
      (i) => i % 2 === 1,
    ),
    5,
  ),
);
