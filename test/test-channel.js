"use strict";

var Z = require("../dist/js/zelkova");

module.exports = {

  "A channel must be provided a default value": function (test) {
    test.throws(function () { new Z.Channel() }, Error);
    test.done();
  },

  "A channel's signal should start with the specified value": function (test) {
    var v = {};
    var chan = new Z.Channel(v);
    test.strictEqual(chan.signal._value, v);
    test.done();
  },

  "A channel can send values to its signal": function (test) {
    var chan = new Z.Channel(true);
    var expectedValues = [true, false];
    chan.signal.subscribe(function (value) {
      test.ok(value === expectedValues.shift());
      if (expectedValues.length === 0) test.done();
    });
    chan.send(false);
  }

};
