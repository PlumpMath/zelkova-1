"use strict";

var Z = require("../dist/zelkova");

module.exports = {

  "A channel must be provided a default value": function (test) {
    test.throws(function () { new Z.channel() }, Error);
    test.done();
  },

  "A channel's signal should start with the specified value": function (test) {
    var v = {};
    var chan = Z.channel(v);
    test.strictEqual(chan.signal._value, v);
    test.done();
  },

  "A channel can send values to its signal": function (test) {
    var chan = Z.channel(true);
    var expectedValues = [true, false];
    chan.signal.subscribe(function (value) {
      test.ok(value === expectedValues.shift());
      if (expectedValues.length === 0) test.done();
    });
    chan.send(false);
  }

};
