import { it, expect } from 'react-native-harness';
import { RiveFileFactory } from '@rive-app/react-native';

/**
 * On-device harness regression test for issue #297.
 *
 * This test exercises the data-binding API the way issue #297's crashes occur:
 * `viewModelAsync` (resolved off-main on the Swift cooperative pool) running
 * concurrently with synchronous property access on the JS thread, against the same
 * ViewModelInstance.
 *
 * The test itself ALWAYS PASSES (it only asserts the calls complete) — it is not a
 * functional assertion. Its purpose is to drive the real Rive runtime concurrently
 * so that, when the host app is built with Thread Sanitizer, TSan reports the data
 * race. Before the fix: TSan flags ~dozens of races on a green test. After the fix
 * (all data-binding access funnelled to the main thread): TSan is clean.
 */

// Kept deliberately modest: enough concurrency to surface the data race under
// Thread Sanitizer, light enough that the (buggy) runtime doesn't hard-crash mid
// test — so the race shows up as a TSan report on an otherwise-green test rather
// than a flaky failure. Run the host app with `-enableThreadSanitizer YES` and
// `HARNESS_TSAN=1` to capture reports (see rn-harness.config.mjs).
const CONCURRENCY = 8;
const ROUNDS = 10;
const TEST_TIMEOUT = 180_000;

it('issue #297: concurrent data-binding access does not race (verified under TSan)', async () => {
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

    // Off-main (Swift cooperative pool): nested view-model resolution + async reads.
    for (let i = 0; i < CONCURRENCY; i++) {
      const path = i % 2 === 0 ? 'vm1' : 'vm2';
      asyncWork.push(
        instance!
          .viewModelAsync(path)
          .then((nested) => nested?.stringProperty('name')?.getValueAsync())
          .catch(() => undefined)
      );
    }

    // JS thread: synchronous property reads/writes + nested resolve. These run
    // sequentially here, but they overlap the viewModelAsync continuations above
    // still resolving on the cooperative pool — that cross-thread overlap on the
    // same instance is the race.
    for (let i = 0; i < CONCURRENCY; i++) {
      const namePath = i % 2 === 0 ? 'vm1/name' : 'vm2/name';
      const prop = instance!.stringProperty(namePath);
      void prop?.value;
      prop?.set('x');
      instance!.viewModel(i % 2 === 0 ? 'vm1' : 'vm2');
    }

    await Promise.all(asyncWork);
  }

  // The real assertion is TSan's verdict, not this expectation.
  expect(true).toBe(true);
}, TEST_TIMEOUT);
