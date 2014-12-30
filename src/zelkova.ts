"use strict";

export interface Listener<A> {
  (value: A, silent: Boolean): void;
}

export class Signal<A> {

  _value: A;
  _listeners: Array<Listener<A>>;

  constructor(value: A) {
    this._value = value;
    this._listeners = [];
  }

  _update(value: A, silent: Boolean): void {
    if (!silent) this._value = value;
    this._listeners.forEach(fn => fn(value, silent));
  }

  subscribe(fn: (value: A) => void): void {
    this._listeners.push((value, silent) => {
      if (!silent) fn(value);
    });
    fn(this._value);
  }

  map<B>(fn: (value: A) => B): Signal<B> {
    var s = new Signal(fn(this._value));
    this._listeners.push((value, silent) => {
      s._update(silent ? undefined : fn(value), silent);
    });
    return s;
  }

  private filterIf(val: boolean, fn: (value: A) => boolean, initValue: A): Signal<A> {
    var s = new Signal(fn(this._value) === val ? this._value : initValue);
    this._listeners.push((value, silent) => {
      s._update(value, silent || fn(value) !== val);
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
    var s = new Signal(this._value);
    var test = fn == null ? (x, y) => x === y : fn;
    var prevValue = this._value;
    this._listeners.push((value, silent) => {
      if (silent || test(prevValue, value)) {
        s._update(undefined, true);
      } else {
        s._update(prevValue = value, false);
      }
    });
    return s;
  }

}

export function constant<A>(value: A): Signal<A> {
  return new Signal(value);
};

export class Channel<A> {

  signal: Signal<A>;

  constructor(value: A) {
    this.signal = new Signal(value);
  }

  send(value: A): Channel<A> {
    this.signal._update(value, false);
    return this;
  }

};

export function channel<A>(value: A): Channel<A> {
  if (arguments.length === 0) {
    throw new Error("A default value must be provided for a Channel");
  }
  return new Channel(value);
}

export function merge<A>(...signals: Array<Signal<A>>): Signal<A> {
  var s = new Signal(signals[0]._value);
  signals.forEach(signal => {
    signal._listeners.push((value, silent) => {
      s._update(value, silent);
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
  var value = () => fn.apply(undefined, signals.map(s => s._value));
  var s = new Signal(value());
  var updates = 0;
  var expected = signals.length;
  var silentBatch = true;
  var update = (v, silent: Boolean) => {
    if (!silent) silentBatch = false;
    if (++updates === expected) {
      updates = 0;
      silentBatch = true;
      s._update(silent ? undefined : value(), silent);
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
  var fn: (...values) => void = args.pop();
  var signals: Array<Signal<any>> = args;
  var run = () => fn.apply(undefined, signals.map(s => s._value));
  var updates = 0;
  var expected = signals.length;
  var silentBatch = true;
  var update = (v, silent: Boolean) => {
    if (!silent) silentBatch = false;
    if (++updates === expected) {
      updates = 0;
      silentBatch = true;
      run();
    }
  };
  signals.forEach(signal => signal._listeners.push(update));
  run();
};
