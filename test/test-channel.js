"use strict";

var Z = require("../dist/zelkova");

module.exports = {

  "A channel must be provided a default value": function (test) {
    test.throws(function () { new Z.channel() }, Error);
    test.done();
  },

  "A channel can send values to its signal": function (test) {
    var chan = Z.channel(true);
    var expectedValues = [true, false];
    chan.signal.subscribe(function (value) {
      test.ok(value === expectedValues.shift());
    });
    chan.send(false);
    test.done();
  }

};
