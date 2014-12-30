"use strict"

var Z = require("../dist/zelkova");

exports.test = function (spec) {
  return function (test) {
    var inputs = spec.inputs.slice();
    var outputs = spec.outputs.slice();
    var chan = Z.channel(inputs.shift());
    var s = spec.setup(chan.signal);
    s.subscribe(function (value) {
      if (outputs.length > 0) {
        test.deepEqual(value, outputs.shift());
        if (outputs.length === 0) test.done();
      }
    });
    inputs.forEach(function (value) {
      chan.send(value);
    });
  };
};
