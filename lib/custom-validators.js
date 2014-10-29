'use strict';

module.exports = {
  isSet: function (param) {
    return param !== undefined;
  },
  isGreaterThan: function (param, num) {
    return param > num;
  },
  isLessThan: function (param, num) {
    return param < num;
  }
};
