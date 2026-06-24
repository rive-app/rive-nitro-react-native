import { it, expect, render, waitFor, cleanup } from 'react-native-harness';
import { View } from 'react-native';
import {
  Fit,
  RiveView,
  RiveFileFactory,
  type RiveFile,
  type RiveViewRef,
} from '@rive-app/react-native';

/**
 * Regression probe for the bindViewModelInstance / getViewModelInstance race
 * flagged in the review of PR #298.
 *
 * Both methods call directly into stateMachine (via RiveReactNativeView) without
 * MainThread.run. The state machine advances on the main thread (autoPlay); calling
 * these from the JS thread is a data race. Always green; under a TSan build
 * (HARNESS_TSAN=1) TSan should report the race on the unfixed runtime.
 */
const DATABINDING = require('../../assets/rive/databinding.riv');
const ROUNDS = 100;

function Repro({
  file,
  onRef,
}: {
  file: RiveFile;
  onRef: (ref: RiveViewRef) => void;
}) {
  return (
    <View style={{ width: 200, height: 200 }}>
      <RiveView
        style={{ flex: 1 }}
        file={file}
        autoPlay={true}
        fit={Fit.Contain}
        hybridRef={{ f: onRef }}
      />
    </View>
  );
}

it('issue #297: bindViewModelInstance/getViewModelInstance race the render thread', async () => {
  const file = await RiveFileFactory.fromSource(DATABINDING, undefined);
  const viewModel = file.defaultArtboardViewModel(undefined);
  const instance = viewModel?.createDefaultInstance() ?? null;
  expect(instance).toBeTruthy();

  let viewRef: RiveViewRef | null = null;

  await render(<Repro file={file} onRef={(ref) => { viewRef = ref; }} />);
  await waitFor(() => expect(viewRef).toBeTruthy());
  await viewRef!.awaitViewReady();

  for (let round = 0; round < ROUNDS; round++) {
    viewRef!.getViewModelInstance();
    if (instance) {
      viewRef!.bindViewModelInstance(instance);
    }
    await new Promise((r) => setTimeout(r, 0));
  }

  cleanup();
  expect(true).toBe(true);
});
