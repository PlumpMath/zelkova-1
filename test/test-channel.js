"use strict";

var Z = require("../dist/js/zelkova");

module.exports = {

  "A channel has a value by default": function (test) {
    var chan = new Z.Channel(true);
    chan.subscribe(function (value) {
      test.ok(value);
      test.done();
    });
  },

  "A channel can emit values": function (test) {
    var chan = new Z.Channel(true);
    var expectedValues = [true, false];
    chan.subscribe(function (value) {
      test.ok(value === expectedValues.shift());
      if (expectedValues.length === 0) test.done();
    });
    chan.emit(false);
  }

};
