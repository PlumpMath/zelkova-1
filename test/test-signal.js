"use strict";

var Z = require("../dist/js/zelkova");
var test = require("./common").test;

module.exports = {

  "constant": {
    "should create a signal with the specified value": function (test) {
      var v = {};
      var s = Z.constant(v);
      test.strictEqual(s._value, v);
      test.done();
    }
  },

  "subscribe": {
    "should pass the signal's value to the callback": function (test) {
      var v = {};
      var s = Z.constant(v);
      s.subscribe(function (value) {
        test.strictEqual(value, v);
        test.done();
      });
    },
    "should run the callback immediately": function (test) {
      var s = Z.constant({});
      var sunk = false;
      s.subscribe(function () { sunk = true; });
      test.ok(sunk);
      test.done();
    }
  },

  "map": {
    "should produce a new signal": function (test) {
      var s1 = Z.constant({});
      var s2 = s1.map(function () { return {}; });
      test.notEqual(s1, s2);
      test.done();
    },
    "should pass the signal's value to the mapping function": function (test) {
      var v = {};
      var s = Z.constant(v);
      s.map(function (value) {
        test.strictEqual(value, v);
        test.done();
      });
    },
    "should run the mapping function immediately": function (test) {
      var s = Z.constant({});
      var sunk = false;
      s.map(function () { sunk = true; });
      test.ok(sunk);
      test.done();
    },
    "should apply the mapping function to produce the value of the new signal": function (test) {
      var v = {};
      var s1 = Z.constant({});
      var s2 = s1.map(function () { return v; });
      s2.subscribe(function (value) {
        test.strictEqual(value, v);
        test.done();
      });
    }
  },

  "keepIf": {
    "must be provided a default value": function (test) {
      test.throws(function () {
        Z.constant({}).keepIf(function () { return true; });
      }, Error);
      test.done();
    },
    "should produce a new signal": function (test) {
      var s1 = Z.constant({});
      var s2 = s1.keepIf(function () { return true; }, {});
      test.notEqual(s1, s2);
      test.done();
    },
    "should run the predicate immediately": function (test) {
      var s = Z.constant({});
      var sunk = false;
      s.keepIf(function () { sunk = true; }, {});
      test.ok(sunk);
      test.done();
    },
    "should use the default value when the initial predicate fails": test({
      setup: function (s) {
        return s.keepIf(function () { return false; }, -1);
      },
      inputs: [0],
      outputs: [-1]
    }),
    "should only let through values that a predicate suceeds for": test({
      setup: function (s) {
        return s.keepIf(function (value) { return value % 2 === 0; }, -1);
      },
      inputs: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10],
      outputs: [0, 2, 4, 6, 8, 10]
    })
  },

  "dropIf": {
    "must be provided a default value": function (test) {
      test.throws(function () {
        Z.constant({}).dropIf(function () { return true; });
      }, Error);
      test.done();
    },
    "should produce a new signal": function (test) {
      var s1 = Z.constant({});
      var s2 = s1.dropIf(function () { return false; }, {});
      test.notEqual(s1, s2);
      test.done();
    },
    "should run the predicate immediately": function (test) {
      var s = Z.constant({});
      var sunk = false;
      s.dropIf(function () { sunk = true; }, {});
      test.ok(sunk);
      test.done();
    },
    "should use the default value when the initial predicate succeeds": test({
      setup: function (s) {
        return s.dropIf(function () { return true; }, -1);
      },
      inputs: [0],
      outputs: [-1]
    }),
    "should only let through values that a predicate fails for": test({
      setup: function (s) {
        return s.dropIf(function (value) { return value % 2 === 0; }, -1);
      },
      inputs: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10],
      outputs: [1, 3, 5, 7, 9]
    })
  },

  "dropRepeats": {

  },

  "keepWhen": {

  },

  "dropWhen": {

  },

  "merge": {

  },

  "mapN": {
  // "Combined signals should update atomically": function (test) {
  //   var chan = new Z.Channel(1);
  //   var s1 = chan.signal;
  //   var s2 = s1.map(function (x) { return x * 2 });
  //   var expectedValues = [[1, 2], [2, 4], [3, 6]];
  //   Z.mapN(s1, s2, function (x, y) {
  //     test.deepEqual([x, y], expectedValues.shift());
  //     if (expectedValues.length === 0) test.done();
  //   });
  //   chan.send(2).send(3);
  // }
  },

  "subscribeN": {

  }

};
