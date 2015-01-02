module zelkova {

  "use strict";

  var nextID: () => string = (function() {
    var count = 0;
    return () => "signal-" + (++count);
  }());

  export interface Listener<A> {
    (value: A, silent: Boolean, source: string): void;
  }

  interface Dictionary<A> {
    [index: string]: A;
  }

  export class Signal<A> {

    _sources: Array<string>;
    _value: A;
    _listeners: Array<Listener<A>>;

    constructor(sources: Array<string>, value: A) {
      this._sources = sources;
      this._value = value;
      this._listeners = [];
    }

    _update(value: A, silent: Boolean, source: string): void {
      if (!silent) this._value = value;
      this._listeners.forEach(fn => fn(value, silent, source));
    }

    subscribe(fn: (value: A) => void): void {
      this._listeners.push((value, silent) => {
        if (!silent) fn(value);
      });
      fn(this._value);
    }

    map<B>(fn: (value: A) => B): Signal<B> {
      var s = new Signal(this._sources, fn(this._value));
      this._listeners.push((value, silent, source) => {
        s._update(silent ? undefined : fn(value), silent, source);
      });
      return s;
    }

    private filterIf(val: boolean, fn: (value: A) => boolean, initValue: A): Signal<A> {
      var s = new Signal(this._sources, fn(this._value) === val ? this._value : initValue);
      this._listeners.push((value, silent, source) => {
        s._update(value, silent || fn(value) !== val, source);
      });
      return s;
    }

    keepIf(fn: (value: A) => boolean, initValue: A): Signal<A> {
      if (arguments.length < 2) {
        throw new Error("keepIf requires a predicate and default value");
      }
      return this.filterIf(true, fn, initValue);
    }

    dropIf(fn: (value: A) => boolean, initValue: A): Signal<A> {
      if (arguments.length < 2) {
        throw new Error("dropIf requires a predicate and default value");
      }
      return this.filterIf(false, fn, initValue);
    }

    dropRepeats(fn?: (prev: A, next: A) => boolean): Signal<A> {
      var s = new Signal(this._sources, this._value);
      var test = fn == null ? (x, y) => x === y : fn;
      var prevValue = this._value;
      this._listeners.push((value, silent, source) => {
        if (silent || test(prevValue, value)) {
          s._update(undefined, true, source);
        } else {
          s._update(prevValue = value, false, source);
        }
      });
      return s;
    }

  }

  export function constant<A>(value: A): Signal<A> {
    return new Signal([nextID()], value);
  };

  export class Channel<A> {

    source: string;
    signal: Signal<A>;

    constructor(value: A) {
      this.source = nextID();
      this.signal = new Signal([this.source], value);
    }

    send(value: A): Channel<A> {
      this.signal._update(value, false, this.source);
      return this;
    }

  };

  export function channel<A>(value: A): Channel<A> {
    if (arguments.length === 0) {
      throw new Error("A default value must be provided for a Channel");
    }
    return new Channel(value);
  }

  interface MultiSourceState {
    sources: Array<string>;
    expected: Dictionary<number>;
    updates: Dictionary<number>;
  }

  function getSources(signals: Array<Signal<any>>): MultiSourceState {
    var sources = [];
    var expected: Dictionary<number> = {};
    signals.forEach(s => {
      s._sources.forEach(source => {
        if (expected[source]) {
          expected[source]++;
        } else {
          sources.push(source);
          expected[source] = 1;
        }
      });
    });
    return { sources: sources, expected: expected, updates: {} };
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

  export function merge<A>(...signals: Array<Signal<A>>): Signal<A> {
    var sources = getSources(signals);
    var nextValue = signals[0]._value;
    var nextIndex = Infinity;
    var s = new Signal(sources.sources, nextValue);
    var update = (value, silent, source, index) => {
      // TODO: ignore silent updates!
      if (index <= nextIndex) {
        nextValue = value;
        nextIndex = index;
      }
      if (checkExpectedSources(sources, source)) {
        nextIndex = Infinity;
        s._update(nextValue, silent, source);
      }
    };
    signals.forEach((signal, i) => {
      signal._listeners.push((value, silent, source) => {
        update(value, silent, source, i);
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
    var signals: Array<Signal<any>> = args;
    var sources = getSources(signals);
    var value = () => fn.apply(undefined, signals.map(s => s._value));
    var s = new Signal(sources.sources, value());
    var silentBatch = true;
    var update = (v, silent, source) => {
      if (!silent) silentBatch = false;
      if (checkExpectedSources(sources, source)) {
        silentBatch = true;
        s._update(silent ? undefined : value(), silent, source);
      }
    };
    signals.forEach(signal => signal._listeners.push(update));
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
