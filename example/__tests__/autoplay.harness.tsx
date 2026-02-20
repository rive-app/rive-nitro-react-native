import {
  describe,
  it,
  expect,
  render,
  waitFor,
  cleanup,
} from 'react-native-harness';
import { useEffect } from 'react';
import { View } from 'react-native';
import {
  RiveView,
  RiveFileFactory,
  Fit,
  type RiveFile,
  type RiveViewRef,
} from '@rive-app/react-native';
import type { ViewModelInstance } from '@rive-app/react-native';

// Bouncing ball .riv with a "ypos" ViewModel number property that changes during playback
// Source: https://rive.app/community/files/25997-48571-demo-for-tracking-rive-property-in-react-native/
const BOUNCING_BALL = require('../assets/rive/bouncing_ball.riv');

function expectDefined<T>(value: T): asserts value is NonNullable<T> {
  expect(value).toBeDefined();
}

function valueChanged(a: number, b: number): boolean {
  if (Number.isNaN(a) || Number.isNaN(b)) return false;
  return Math.abs(a - b) > 0.001;
}

async function loadBouncingBall() {
  const file = await RiveFileFactory.fromSource(BOUNCING_BALL, undefined);
  const vm = file.defaultArtboardViewModel();
  expectDefined(vm);
  const instance = vm.createDefaultInstance();
  expectDefined(instance);
  return { file, instance };
}

/**
 * Resolves when the property value changes from its initial value.
 * Uses both listener and polling since state-machine-driven changes
 * may not trigger addListener on all platforms.
 */
function waitForPropertyChange(
  instance: ViewModelInstance,
  propertyName: string,
  timeout = 8000
): Promise<number> {
  return new Promise((resolve, reject) => {
    const prop = instance.numberProperty(propertyName);
    if (!prop) {
      reject(new Error(`Property '${propertyName}' not found`));
      return;
    }

    const initialValue = prop.value;

    function done(value: number) {
      clearTimeout(timer);
      clearInterval(pollTimer);
      removeListener();
      resolve(value);
    }

    const timer = setTimeout(() => {
      clearInterval(pollTimer);
      removeListener();
      reject(
        new Error(
          `Property '${propertyName}' did not change from ${initialValue} within ${timeout}ms`
        )
      );
    }, timeout);

    const removeListener = prop.addListener((newValue: number) => {
      if (valueChanged(newValue, initialValue)) {
        done(newValue);
      }
    });

    const pollTimer = setInterval(() => {
      const currentValue = prop.value;
      if (valueChanged(currentValue, initialValue)) {
        done(currentValue);
      }
    }, 50);
  });
}

/**
 * Returns true if the property value changes within the timeout, false otherwise.
 */
function didPropertyChange(
  instance: ViewModelInstance,
  propertyName: string,
  timeout = 500
): Promise<boolean> {
  return new Promise((resolve) => {
    const prop = instance.numberProperty(propertyName);
    if (!prop) {
      resolve(false);
      return;
    }

    const initialValue = prop.value;

    function done(changed: boolean) {
      clearTimeout(timer);
      clearInterval(pollTimer);
      removeListener();
      resolve(changed);
    }

    const timer = setTimeout(() => done(false), timeout);

    const removeListener = prop.addListener((newValue: number) => {
      if (newValue !== initialValue) {
        done(true);
      }
    });

    const pollTimer = setInterval(() => {
      if (prop.value !== initialValue) {
        done(true);
      }
    }, 50);
  });
}

type TestContext = {
  ref: RiveViewRef | null;
  error: string | null;
};

function RiveTestView({
  file,
  autoPlay,
  instance,
  context,
}: {
  file: RiveFile;
  autoPlay: boolean;
  instance: ViewModelInstance;
  context: TestContext;
}) {
  useEffect(() => {
    return () => {
      context.ref = null;
    };
  }, [context]);

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
        autoPlay={autoPlay}
        dataBind={instance}
        fit={Fit.Contain}
        onError={(e) => {
          context.error = e.message;
        }}
      />
    </View>
  );
}

describe('autoPlay prop (issue #138)', () => {
  it('bouncing_ball.riv has ypos ViewModel property', async () => {
    const { instance } = await loadBouncingBall();
    const ypos = instance.numberProperty('ypos');
    expectDefined(ypos);
    expect(typeof ypos.value).toBe('number');
  });

  it('autoPlay={false} does not change ypos property', async () => {
    const { file, instance } = await loadBouncingBall();

    const context: TestContext = { ref: null, error: null };
    await render(
      <RiveTestView
        file={file}
        autoPlay={false}
        instance={instance}
        context={context}
      />
    );

    await waitFor(
      () => {
        expect(context.ref).not.toBeNull();
      },
      { timeout: 5000 }
    );

    const changed = await didPropertyChange(instance, 'ypos');
    expect(changed).toBe(false);
    expect(context.error).toBeNull();

    cleanup();
  });

  it('autoPlay={true} changes ypos property over time', async () => {
    const { file, instance } = await loadBouncingBall();

    const context: TestContext = { ref: null, error: null };
    await render(
      <RiveTestView
        file={file}
        autoPlay={true}
        instance={instance}
        context={context}
      />
    );

    await waitFor(
      () => {
        expect(context.ref).not.toBeNull();
      },
      { timeout: 5000 }
    );

    const newValue = await waitForPropertyChange(instance, 'ypos');
    expect(newValue).not.toBe(0);

    expect(context.error).toBeNull();
    cleanup();
  });

  it('autoPlay={false} allows manual play() that changes ypos', async () => {
    const { file, instance } = await loadBouncingBall();

    const context: TestContext = { ref: null, error: null };
    await render(
      <RiveTestView
        file={file}
        autoPlay={false}
        instance={instance}
        context={context}
      />
    );

    await waitFor(
      () => {
        expect(context.ref).not.toBeNull();
      },
      { timeout: 5000 }
    );

    await context.ref!.play();

    const newValue = await waitForPropertyChange(instance, 'ypos');
    expect(newValue).not.toBe(0);

    expect(context.error).toBeNull();
    cleanup();
  });
});
