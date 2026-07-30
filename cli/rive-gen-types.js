#!/usr/bin/env node
// Launcher for the compiled generator (built by `yarn build:cli`).
require('../lib/cli/rive-gen-types.cjs')
  .runCli()
  .catch((err) => {
    process.stderr.write(`${err && err.message ? err.message : err}\n`);
    process.exit(1);
  });
