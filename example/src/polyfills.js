/* global globalThis */
// Polyfill performance.measure and console.timeStamp BEFORE React loads
// to enable supportsUserTiming in ReactFabric-dev.js (same as Expo environment).
// Without this, the dispose-during-prop-diffing crash only reproduces on Expo.
if (typeof console.timeStamp !== 'function') {
  console.timeStamp = () => {};
}
if (
  typeof performance !== 'undefined' &&
  typeof performance.measure !== 'function'
) {
  performance.measure = () => {};
}

// Polyfill EventTarget and Event for chai 6.x (used by react-native-harness).
// Hermes on RN 0.79 doesn't have these Web APIs.
// Must load before any react-native-harness import.
if (!globalThis.Event) {
  globalThis.Event = class Event {
    constructor(type) {
      this.type = type;
    }
  };
}
if (!globalThis.EventTarget) {
  globalThis.EventTarget = class EventTarget {
    constructor() {
      this._listeners = {};
    }
    addEventListener(type, listener) {
      (this._listeners[type] ??= []).push(listener);
    }
    removeEventListener(type, listener) {
      const list = this._listeners[type];
      if (list) {
        this._listeners[type] = list.filter((l) => l !== listener);
      }
    }
    dispatchEvent(event) {
      const list = this._listeners[event.type];
      if (list) {
        list.forEach((l) => l(event));
      }
      return true;
    }
  };
}
