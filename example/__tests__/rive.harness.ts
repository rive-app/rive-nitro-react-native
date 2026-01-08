/**
 * Harness tests for Rive - runs on real devices via react-native-harness.
 * Uses the same test suites as the in-app test runner.
 */
import { describe, it, beforeAll } from 'react-native-harness';
import { RiveFileFactory } from '@rive-app/react-native';
import type { RiveFile } from '@rive-app/react-native';
import { harnessBackend } from '../src/testing/harnessBackend';
import { allSuites } from '../src/testing/suites';

for (const suite of allSuites) {
  describe(suite.name, () => {
    let file: RiveFile;

    beforeAll(async () => {
      file = await RiveFileFactory.fromSource(suite.riveAsset, undefined);
    });

    const tests = suite.getTests(
      // Create a proxy that will access the file after beforeAll runs
      new Proxy({} as RiveFile, {
        get: (_target, prop) => {
          return (file as unknown as Record<string, unknown>)[prop as string];
        },
      }),
      harnessBackend
    );

    for (const test of tests) {
      it(test.name, async () => {
        const result = await test.run();
        if (result.status === 'failed') {
          throw new Error(result.error);
        }
      });
    }
  });
}
