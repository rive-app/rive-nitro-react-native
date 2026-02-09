Experimental iOS status:
- 22/25 headless e2e tests pass (3 failures: 1 color, 2 property validation)
- most exercisers work (except text runs, SMI inputs, events - not supported in experimental API)

Challenges:
- most experimental methods are async. Fine for many cases, but requires breaking API changes
- for `useRiveNumber`, `getValue()` returns async. Since the hook is called on JS thread, we workaround by blocking until the value is there (safe because JS thread ≠ iOS main thread). Worth considering if rive-ios could add optimized sync readers for properties
- files without state machines don't work (experimental API requires state machine)

Issues:
- colors: can't read ARGB value back (`Color.argbValue` is internal in rive-ios) - getValue() throws error
- `vmi.value(of: NumberProperty(path: "nonexistent"))` doesn't fail, returns garbage (-8.40482e-40 / 0x800926EC) - no way to validate property paths
