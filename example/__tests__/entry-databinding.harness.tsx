import {
  describe,
  it,
  expect,
  render,
  waitFor,
  cleanup,
} from 'react-native-harness';
import { View } from 'react-native';
import {
  RiveView,
  RiveFileFactory,
  Fit,
  type RiveFile,
  type RiveViewRef,
  type ViewModelInstance,
} from '@rive-app/react-native';

// .riv file with two ViewModel number properties:
//   - input: value we set before mount (default -1)
//   - inputOnEntry: state machine copies input into this on Entry transition (default -100)
// Source: https://rive.app/community/files/27852-52628-on-entry-actions-reproducer
const ON_ENTRY_TEST = require('../assets/rive/on_entry_test.riv');

async function loadFile() {
  const file = await RiveFileFactory.fromSource(ON_ENTRY_TEST, undefined);
  return file;
}

function expectDefined<T>(value: T): asserts value is NonNullable<T> {
  expect(value).toBeDefined();
}

type TestContext = {
  ref: RiveViewRef | null;
  error: string | null;
};

function TestView({
  file,
  instance,
  context,
}: {
  file: RiveFile;
  instance: ViewModelInstance;
  context: TestContext;
}) {
  return (
    <View style={{ width: 200, height: 200 }}>
      <RiveView
        hybridRef={{
          f: (ref: RiveViewRef | null) => {
            context.ref = ref;
          },
        }}
        style={{ flex: 1 }}
        file={file}
        autoPlay={true}
        dataBind={instance}
        fit={Fit.Contain}
        onError={(e) => {
          context.error = e.message;
        }}
      />
    </View>
  );
}

function waitForInputOnEntry(
  instance: ViewModelInstance,
  timeout = 5000
): Promise<number> {
  return new Promise((resolve, reject) => {
    const prop = instance.numberProperty('inputOnEntry');
    if (!prop) {
      reject(new Error("Property 'inputOnEntry' not found"));
      return;
    }

    function done(value: number) {
      clearTimeout(timer);
      clearInterval(pollTimer);
      removeListener();
      resolve(value);
    }

    const timer = setTimeout(() => {
      clearInterval(pollTimer);
      removeListener();
      // If still -100 after timeout, resolve with current value (Entry never ran)
      resolve(prop.value);
    }, timeout);

    const removeListener = prop.addListener((newValue: number) => {
      if (newValue !== -100) {
        done(newValue);
      }
    });

    const pollTimer = setInterval(() => {
      const val = prop.value;
      if (val !== -100) {
        done(val);
      }
    }, 50);
  });
}

describe('Entry transition uses user VM values (issue #282)', () => {
  it('inputOnEntry reflects user-set input value, not the default', async () => {
    // Legacy Android SDK crashes on stateMachineNamed() with this .riv file
    if (RiveFileFactory.getBackend() !== 'experimental') {
      return;
    }
    const file = await loadFile();
    const vm = file.defaultArtboardViewModel();
    expectDefined(vm);
    const instance = vm.createDefaultInstance();
    expectDefined(instance);

    // Set input to 42 before mounting — Entry should copy this into inputOnEntry
    const inputProp = instance.numberProperty('input');
    expectDefined(inputProp);
    // input default may vary per .riv file
    inputProp.value = 42;

    const inputOnEntryProp = instance.numberProperty('inputOnEntry');
    expectDefined(inputOnEntryProp);
    expect(inputOnEntryProp.value).toBe(-100); // default, not yet evaluated

    const context: TestContext = { ref: null, error: null };
    await render(
      <TestView file={file} instance={instance} context={context} />
    );

    await waitFor(
      () => {
        expect(context.ref).not.toBeNull();
      },
      { timeout: 5000 }
    );

    const inputOnEntry = await waitForInputOnEntry(instance);

    // Entry should have seen input=42 and copied it to inputOnEntry
    // Bug: on Android, Entry evaluates with the default VM instance (input=-1)
    // before the user's instance (input=42) is bound
    expect(inputOnEntry).toBe(42);
    expect(context.error).toBeNull();

    cleanup();
  });
});
