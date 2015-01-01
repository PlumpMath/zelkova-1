"use strict";

var Z = require("../dist/zelkova");
var test = require("./common").test;

module.exports = {

  "constant": {
    "should create a signal with the specified value": function (test) {
      test.expect(1);
      var v = {};
      var s = Z.constant(v);
      test.strictEqual(s._value, v);
      test.done();
    }
  },

  "subscribe": {
    "should pass the signal's value to the callback": function (test) {
      test.expect(1);
      var v = {};
      var s = Z.constant(v);
      s.subscribe(function (value) {
        test.strictEqual(value, v);
      });
      test.done();
    },
    "should run the callback immediately": function (test) {
      test.expect(1);
      var s = Z.constant({});
      var sunk = false;
      s.subscribe(function () { sunk = true; });
      test.ok(sunk);
      test.done();
    }
  },

  "map": {
    "should produce a new signal": function (test) {
      test.expect(1);
      var s1 = Z.constant({});
      var s2 = s1.map(function () { return {}; });
      test.notEqual(s1, s2);
      test.done();
    },
    "should pass the signal's value to the mapping function": function (test) {
      test.expect(1);
      var v = {};
      var s = Z.constant(v);
      s.map(function (value) {
        test.strictEqual(value, v);
      });
      test.done();
    },
    "should run the mapping function immediately": function (test) {
      test.expect(1);
      var s = Z.constant({});
      var sunk = false;
      s.map(function () { sunk = true; });
      test.ok(sunk);
      test.done();
    },
    "should apply the mapping function to produce the value of the new signal": function (test) {
      test.expect(1);
      var v = {};
      var s1 = Z.constant({});
      var s2 = s1.map(function () { return v; });
      s2.subscribe(function (value) {
        test.strictEqual(value, v);
      });
      test.done();
    }
  },

  "keepIf": {
    "must be provided a default value": function (test) {
      test.expect(1);
      test.throws(function () {
        Z.constant({}).keepIf(function () { return true; });
      }, Error);
      test.done();
    },
    "should produce a new signal": function (test) {
      test.expect(1);
      var s1 = Z.constant({});
      var s2 = s1.keepIf(function () { return true; }, {});
      test.notEqual(s1, s2);
      test.done();
    },
    "should run the predicate immediately": function (test) {
      test.expect(1);
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
      test.expect(1);
      test.throws(function () {
        Z.constant({}).dropIf(function () { return true; });
      }, Error);
      test.done();
    },
    "should produce a new signal": function (test) {
      test.expect(1);
      var s1 = Z.constant({});
      var s2 = s1.dropIf(function () { return false; }, {});
      test.notEqual(s1, s2);
      test.done();
    },
    "should run the predicate immediately": function (test) {
      test.expect(1);
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
    "should produce a new signal": function (test) {
      test.expect(1);
      var s1 = Z.constant({});
      var s2 = s1.dropRepeats();
      test.notEqual(s1, s2);
      test.done();
    },
    "should drop strictly equal values without a predicate": (function () {
      var v1 = {};
      var v2 = {};
      return test({
        setup: function (s) {
          return s.dropRepeats();
        },
        inputs: [0, 0, 1, 2, 3, 3, 3, v1, v2, v2],
        outputs: [0, 1, 2, 3, v1, v2]
      });
    }()),
    "should drop values using an equality predicate": test({
      setup: function (s) {
        return s.dropRepeats(function (x, y) { return x == y || x.length == y.length });
      },
      inputs: [[], [0], [1], [2], [1, 2]],
      outputs: [[], [0], [1, 2]]
    })
  },

  "merge": {
    "should take the left-most value on creation": function (test) {
      test.expect(1);
      var s1 = Z.constant(1);
      var s2 = Z.constant(2);
      Z.merge(s1, s2).subscribe(function (value) {
        test.strictEqual(value, 1);
      })
      test.done();
    },
    "should pass through values from multiple signals": function (test) {
      var expectedValues = [1, 10, 20, 200, 100];
      test.expect(expectedValues.length);
      var c1 = Z.channel(1);
      var c2 = Z.channel(2);
      Z.merge(c1.signal, c2.signal).subscribe(function (value) {
        if (expectedValues.length > 0) {
          test.strictEqual(value, expectedValues.shift());
        }
      });
      c1.send(10);
      c2.send(20);
      c2.send(200);
      c1.send(100);
      test.done();
    },
    "should only take the left-most value when updates arrive simultaneously": [
      function (test) {
        var expectedValues = [1, 2, 3];
        test.expect(expectedValues.length);
        var c = Z.channel(1);
        var s1 = c.signal;
        var s2 = s1.map(function (n) { return n * 100; });
        Z.merge(s1, s2).subscribe(function (value) {
          if (expectedValues.length > 0) {
            test.strictEqual(value, expectedValues.shift());
          }
        });
        c.send(2).send(3);
        test.done();
      },
      function (test) {
        var expectedValues = [100, 200, 300];
        test.expect(expectedValues.length);
        var c = Z.channel(1);
        var s1 = c.signal;
        var s2 = s1.map(function (n) { return n * 100; });
        Z.merge(s2, s1).subscribe(function (value) {
          if (expectedValues.length > 0) {
            test.strictEqual(value, expectedValues.shift());
          }
        });
        c.send(2).send(3);
        test.done();
      },
      function (test) {
        var expectedValues = [100, 200, 300];
        test.expect(expectedValues.length);
        var c1 = Z.channel(1);
        var c2 = Z.channel(1);
        var s1 = c1.signal;
        var s2 = s1.map(function (n) { return n * 100; });
        var s3 = c2.signal;
        s3.subscribe(function (value) {
          c1.send(value);
        });
        Z.merge(s2, s1, s3).subscribe(function (value) {
          if (expectedValues.length > 0) {
            test.strictEqual(value, expectedValues.shift());
          }
        });
        c1.send(2)
        c2.send(3);
        test.done();
      }
    ]
  },

  "mapN": {
    "should compute the combined value immediately": function (test) {
      var s1 = Z.constant(1);
      var s2 = Z.constant(2);
      var sunk = false;
      Z.mapN(s1, s2, function () { sunk = true; });
      test.ok(sunk);
      test.done();
    },
    "should pass the value from each input to the mapping function": function (test) {
      test.expect(2);
      var v1 = {};
      var v2 = {};
      var s1 = Z.constant(v1);
      var s2 = Z.constant(v2);
      Z.mapN(s1, s2, function (x, y) {
        test.strictEqual(x, v1);
        test.strictEqual(y, v2);
      });
      test.done();
    },
    "should apply the mapping function to produce the value of the new signal": function (test) {
      test.expect(1);
      var v = {};
      var s1 = Z.constant({});
      var s2 = Z.constant({});
      var s3 = Z.mapN(s1, s2, function () { return v; })
      s3.subscribe(function(value) {
        test.strictEqual(value, v);
      });
      test.done();
    },
    "changing signals should trigger the mapping function to compute a new value for the signal": function (test) {
      var expectedValues = [11, 12, 22];
      test.expect(expectedValues.length);
      var c1 = Z.channel(1);
      var c2 = Z.channel(10);
      var s1 = c1.signal;
      var s2 = c2.signal;
      var s3 = Z.mapN(s1, s2, function (x, y) { return x + y; })
      s3.subscribe(function(value) {
        test.strictEqual(value, expectedValues.shift());
      });
      c1.send(2);
      c2.send(20);
      test.done();
    },
    "combinations of signals sharing the same source should be processed together": function (test) {
      var expectedValues = [[1, 2, 20], [2, 4, 40], [3, 6, 60]];
      test.expect(expectedValues.length);
      var chan = Z.channel(1);
      var s1 = chan.signal;
      var s2 = s1.map(function (x) { return x * 2 });
      var s3 = s2.map(function (x) { return x * 10 });
      Z.mapN(s1, s2, s3, function (x, y, z) {
        test.deepEqual([x, y, z], expectedValues.shift());
        if (expectedValues.length === 0) test.done();
      });
      chan.send(2).send(3);
    }
  },

  "subscribeN": {
    "should compute the combined value immediately": function (test) {
      test.expect(1);
      var s1 = Z.constant(1);
      var s2 = Z.constant(2);
      var sunk = false;
      Z.subscribeN(s1, s2, function () { sunk = true; });
      test.ok(sunk);
      test.done();
    },
    "should pass the value from each input to the callback": function (test) {
      test.expect(2);
      var v1 = {};
      var v2 = {};
      var s1 = Z.constant(v1);
      var s2 = Z.constant(v2);
      Z.subscribeN(s1, s2, function (x, y) {
        test.strictEqual(x, v1);
        test.strictEqual(y, v2);
      });
      test.done();
    },
    "changing signals should trigger the callback": function (test) {
      var expectedValues = [[1, 2], [2, 2], [2, 3]];
      test.expect(expectedValues.length);
      var c1 = Z.channel(1);
      var c2 = Z.channel(2);
      var s1 = c1.signal;
      var s2 = c2.signal;
      Z.subscribeN(s1, s2, function (x, y) {
        test.deepEqual([x, y], expectedValues.shift());
      });
      c1.send(2);
      c2.send(3);
      test.done();
    },
    "combinations of signals sharing the same source should be processed together": function (test) {
      var expectedValues = [[1, 2, 20], [2, 4, 40], [3, 6, 60]];
      test.expect(expectedValues.length);
      var chan = Z.channel(1);
      var s1 = chan.signal;
      var s2 = s1.map(function (x) { return x * 2 });
      var s3 = s2.map(function (x) { return x * 10 });
      Z.subscribeN(s1, s2, s3, function (x, y, z) {
        test.deepEqual([x, y, z], expectedValues.shift());
      });
      chan.send(2).send(3);
      test.done();
    }
  }

};
