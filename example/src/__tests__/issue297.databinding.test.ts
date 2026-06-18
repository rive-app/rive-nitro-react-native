/* eslint-disable @typescript-eslint/no-deprecated -- the race needs the sync API */
import { it, expect } from 'react-native-harness';
import { RiveFileFactory } from '@rive-app/react-native';

/**
 * Regression probe for the data-binding thread race in issue #297.
 *
 * Functionally it always passes — the real verdict comes from Thread Sanitizer:
 * build the host app with `-enableThreadSanitizer YES` and run with `HARNESS_TSAN=1`
 * (see rn-harness.config.mjs). Unfixed runtime → TSan reports the race; fixed → clean.
 *
 * CONCURRENCY/ROUNDS are kept low so the race surfaces under TSan without the
 * (unfixed) runtime hard-crashing; raise them to reproduce the crash from the issue.
 */
const CONCURRENCY = 8;
const ROUNDS = 10;
const TEST_TIMEOUT = 180_000;

it(
  'issue #297: concurrent data-binding access does not race',
  async () => {
    const file = await RiveFileFactory.fromSource(
      require('../../assets/rive/viewmodelproperty.riv'),
      undefined
    );

    const viewModel = file.defaultArtboardViewModel(undefined);
    expect(viewModel).toBeTruthy();

    const instance = viewModel!.createDefaultInstance();
    expect(instance).toBeTruthy();

    for (let round = 0; round < ROUNDS; round++) {
      const asyncWork: Promise<unknown>[] = [];

      for (let i = 0; i < CONCURRENCY; i++) {
        const path = i % 2 === 0 ? 'vm1' : 'vm2';
        asyncWork.push(
          instance!
            .viewModelAsync(path)
            .then((nested) => nested?.stringProperty('name')?.getValueAsync())
            .catch(() => undefined)
        );
      }

      for (let i = 0; i < CONCURRENCY; i++) {
        const namePath = i % 2 === 0 ? 'vm1/name' : 'vm2/name';
        const prop = instance!.stringProperty(namePath);
        prop?.set((prop?.value ?? '').slice(0, 0) + 'x');
        instance!.viewModel(i % 2 === 0 ? 'vm1' : 'vm2');
      }

      await Promise.all(asyncWork);
    }

    expect(true).toBe(true);
  },
  TEST_TIMEOUT
);
