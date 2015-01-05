module zelkova {

  "use strict";

  var nextID: () => string = (function() {
    var count = 0;
    return () => "signal-" + (++count);
  }());

  export interface Listener<A> {
    (value: A, silent: boolean, source: string): void;
  }

  export interface BufferItem<A> {
    value: A;
    silent: boolean;
    source: string;
  }

  interface Dictionary<A> {
    [index: string]: A;
  }

  export interface Signal<A> {
    id: string;
    subscribe(fn: (value: A) => void): void;
    map<B>(fn: (value: A) => B): Signal<B>;
    keepIf(fn: (value: A) => boolean, initValue: A): Signal<A>;
    dropIf(fn: (value: A) => boolean, initValue: A): Signal<A>;
    dropRepeats(fn?: (prev: A, next: A) => boolean): Signal<A>;
  }

  interface SignalRecord<A> {
    value: A;
    listeners: Array<Listener<A>>;
    sources: Array<string>
  }

  var signals: Dictionary<SignalRecord<any>> = {};

  function subscribe<A>(id: string, listener: Listener<A>): void {
    var signal = signals[id];
    if (!signal) throw new Error("Unknown signal '" + id + "'");
    signal.listeners.push(listener);
  }

  function update<A>(id: string, value: A, silent: boolean, source: string): void {
    var signal = signals[id];
    if (!signal) throw new Error("Unknown signal '" + id + "'");
    if (!silent) signal.value = value;
    signal.listeners.forEach(fn => fn(value, silent, source));
  }

  function signal<A>(sources: Array<string>, initValue: A): Signal<A> {
    var id = nextID();
    var record = {
      value: initValue,
      listeners: [],
      sources: sources.slice()
    };
    signals[id] = record;

    function filterIf(val: boolean, fn: (value: A) => boolean, initValue: A): Signal<A> {
      var s = signal(sources, fn(record.value) === val ? record.value : initValue);
      subscribe(id, (value: A, silent, source) => {
        update(s.id, value, silent || fn(value) !== val, source);
      });
      return s;
    }

    return {

      id: id,

      subscribe: (fn): void => {
        subscribe(id, (value: A, silent) => {
          if (!silent) fn(value);
        });
        fn(record.value);
      },

      map: (fn) => {
        var s = signal(sources, fn(record.value));
        subscribe(id, (value, silent, source) => {
          update(s.id, silent ? undefined : fn(value), silent, source);
        });
        return s;
      },

      keepIf: (fn, initValue) => {
        if (arguments.length < 2) {
          throw new Error("keepIf requires a predicate and default value");
        }
        return filterIf(true, fn, initValue);
      },

      dropIf: (fn, initValue) => {
        if (arguments.length < 2) {
          throw new Error("dropIf requires a predicate and default value");
        }
        return filterIf(false, fn, initValue);
      },

      dropRepeats: (fn?) => {
        var prevValue = record.value;
        var s = signal(sources, prevValue);
        var test = fn == null ? (x, y) => x === y : fn;
        subscribe(id, (value: A, silent, source) => {
          if (silent || test(prevValue, value)) {
            update(s.id, undefined, true, source);
          } else {
            update(s.id, prevValue = value, false, source);
          }
        });
        return s;
      }
    };
  }

  export function constant<A>(value: A): Signal<A> {
    return signal([nextID()], value);
  };

  export interface Channel<A> {
    signal: Signal<A>;
    send(value: A): Channel<A>;
  };

  export function channel<A>(value: A): Channel<A> {
    if (arguments.length === 0) {
      throw new Error("A default value must be provided for a Channel");
    }
    var sourceID = nextID();
    var s = signal([sourceID], value);
    var channel = {
      signal: s,
      send: (value) => {
        update(s.id, value, false, sourceID);
        return channel;
      }
    };
    return channel;
  }

  interface MultiSourceState {
    sources: Array<string>;
    expected: Dictionary<number>;
    updates: Dictionary<number>;
  }

  function getSources(ss: Array<Signal<any>>): MultiSourceState {
    var sources = [];
    var expected: Dictionary<number> = {};
    ss.forEach(s => {
      signals[s.id].sources.forEach(source => {
        if (expected[source]) {
          expected[source]++;
        } else {
          sources.push(source);
          expected[source] = 1;
        }
      });
    });
    return {
      sources: sources,
      expected: expected,
      updates: {}
    };
  }

  function checkExpectedSources(sources: MultiSourceState, source: string): boolean {
    if (sources.updates[source]) {
      sources.updates[source]++;
    } else {
      sources.updates[source] = 1;
    }
    var ready = true;
    for (var k in sources.updates) {
      if (sources.updates.hasOwnProperty(k)) {
        if (sources.updates[k] < sources.expected[k]) {
          ready = false;
          break;
        }
      }
    }
    if (ready) sources.updates = {};
    return ready;
  }

  export function merge<A>(...inputs: Array<Signal<A>>): Signal<A> {
    var sources = getSources(inputs);
    var nextValue = signals[inputs[0].id].value;
    var nextIndex = Infinity;
    var s = signal(sources.sources, nextValue);
    var updateSignal = (value, silent, source, index) => {
      // console.log(value, silent, source, index);
      // TODO: ignore silent updates
      if (index <= nextIndex) {
        nextValue = value;
        nextIndex = index;
      }
      if (checkExpectedSources(sources, source)) {
        nextIndex = Infinity;
        update(s.id, nextValue, silent, source);
      }
    };
    inputs.forEach((signal, i) => {
      subscribe(signal.id, (value, silent, source) => {
        updateSignal(value, silent, source, i);
      });
    });
    return s;
  }

  export interface MapN {
    <A, B, C>(a: Signal<A>, b: Signal<B>,
      fn: (a: A, b: B) => C): Signal<C>;

    <A, B, C, D>(a: Signal<A>, b: Signal<B>, c: Signal<C>,
      fn: (a: A, b: B, c: C) => D): Signal<D>;

    <A, B, C, D, E>(a: Signal<A>, b: Signal<B>, c: Signal<C>, d: Signal<D>,
      fn: (a: A, b: B, c: C, d: Signal<D>) => E): Signal<E>;

    <A, B, C, D, E, F>(a: Signal<A>, b: Signal<B>, c: Signal<C>, d: Signal<D>, e: Signal<E>,
      fn: (a: A, b: B, c: C, d: D, e: E) => F): Signal<F>;
  };

  export var mapN: MapN = function (...args) {
    var fn: (...values) => void = args.pop();
    var inputs: Array<Signal<any>> = args;
    var sources = getSources(inputs);
    var value = () => fn.apply(undefined, inputs.map(s => signals[s.id].value));
    var s = signal(sources.sources, value());
    var silentBatch = true;
    var updateSignal = (v, silent, source) => {
      if (!silent) silentBatch = false;
      if (checkExpectedSources(sources, source)) {
        silentBatch = true;
        update(s.id, silent ? undefined : value(), silent, source);
      }
    };
    inputs.forEach(signal => subscribe(signal.id, updateSignal));
    return s;
  };

  export interface SubscribeN {
    <A, B, C>(a: Signal<A>, b: Signal<B>,
      fn: (a: A, b: B) => void): void;

    <A, B, C, D>(a: Signal<A>, b: Signal<B>, c: Signal<C>,
      fn: (a: A, b: B, c: C) => void): void;

    <A, B, C, D, E>(a: Signal<A>, b: Signal<B>, c: Signal<C>, d: Signal<D>,
      fn: (a: A, b: B, c: C, d: Signal<D>) => void): void;

    <A, B, C, D, E, F>(a: Signal<A>, b: Signal<B>, c: Signal<C>, d: Signal<D>, e: Signal<E>,
      fn: (a: A, b: B, c: C, d: D, e: E) => void): void;
  };

  export var subscribeN: SubscribeN = function (...args) {
    mapN.apply(undefined, args);
  };

}

export = zelkova;
