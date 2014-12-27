"use strict";

interface Dictionary<A> {
  [index: string]: A;
};

export interface CombineFunc {
  <A, B, C>(a: Signal<A>, b: Signal<B>,
    fn: (a: A, b: B) => C): Signal<C>;

  <A, B, C, D>(a: Signal<A>, b: Signal<B>, c: Signal<C>,
    fn: (a: A, b: B, c: C) => D): Signal<D>;

  <A, B, C, D, E>(a: Signal<A>, b: Signal<B>, c: Signal<C>, d: Signal<D>,
    fn: (a: A, b: B, c: C, d: Signal<D>) => E): Signal<E>;

  <A, B, C, D, E, F>(a: Signal<A>, b: Signal<B>, c: Signal<C>, d: Signal<D>, e: Signal<E>,
    fn: (a: A, b: B, c: C, d: D, e: E) => F): Signal<F>;
};

export interface Signal<A> {
  map<B>(fn: (value: A) => B): Signal<B>;
  dropIf(fn: (value: A) => boolean, initValue: A): Signal<A>;
  dropRepeats(fn?: (prev: A, next: A) => boolean): Signal<A>;
  subscribe(fn: (value: A) => void): void;
};

export class Channel<A> implements Signal<A> {

  private value: A;
  private listeners: Array<(value: A) => void>;

  constructor(value: A) {
    this.value = value;
    this.listeners = [];
  }

  emit(value: A) {
    this.listeners.forEach(fn => fn(value));
  }

  map<B>(fn: (value: A) => B): Signal<B> {
    var chan = new Channel(fn(this.value));
    this.listeners.push(value => chan.emit(fn(value)));
    return chan;
  }

  private filterIf(fn: (value: A) => boolean, val: boolean, initValue: A): Signal<A> {
    var chan = new Channel(fn(this.value) ? initValue : this.value);
    this.listeners.push(value => {
      if (fn(value) === val) chan.emit(value);
    });
    return chan;
  }

  keepIf(fn: (value: A) => boolean, initValue: A): Signal<A> {
    return this.filterIf(fn, true, initValue);
  }

  dropIf(fn: (value: A) => boolean, initValue: A): Signal<A> {
    return this.filterIf(fn, false, initValue);
  }

  dropRepeats(fn?: (prev: A, next: A) => boolean): Signal<A> {
    var chan = new Channel(this.value);
    var test = fn == null ? (x, y) => x === y : fn;
    var prevValue = this.value;
    this.listeners.push(value => {
      if (!test(prevValue, value)) {
        prevValue = value;
        chan.emit(value);
      }
    });
    return chan;
  }

  subscribe(fn: (value: A) => void): void {
    this.listeners.push(fn);
    fn(this.value);
  }

};

export function merge<A>(...signals: Array<Signal<A>>): Signal<A> {
  var chan, initValue;
  signals.forEach(signal => {
    signal.subscribe(value => {
      if (chan != null) {
        chan.emit(value);
      } else if (initValue == null) {
        initValue = value;
      }
    });
  });
  return (chan = new Channel(initValue));
}

export var mapN: CombineFunc = function (...args) {
  var fn: (...values) => void = args.pop();
  var signals: Array<Signal<any>> = args;

  var values = [];
  var getValue = () => fn.apply(undefined, values);
  var emit = null;

  signals.forEach((signal, i) => {
    signal.subscribe(value => {
      values[i] = value;
      if (emit != null) emit();
    });
  });

  var chan = new Channel(getValue());
  emit = () => chan.emit(getValue());
  return chan;
};
