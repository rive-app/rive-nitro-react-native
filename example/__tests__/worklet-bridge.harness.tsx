import {
  describe,
  it,
  expect,
  render,
  waitFor,
  cleanup,
} from 'react-native-harness';
import { View } from 'react-native';
import { useEffect, useMemo } from 'react';
import { NitroModules } from 'react-native-nitro-modules';
import { scheduleOnRN, scheduleOnUI } from 'react-native-worklets';

import {
  Fit,
  RiveView,
  RiveFileFactory,
  useRiveFile,
  useViewModelInstance,
} from '@rive-app/react-native';
import type { RiveWorkletBridge } from '@rive-app/react-native';

const DATABINDING = require('../assets/rive/databinding.riv');
const BOUNCING_BALL = require('../assets/rive/bouncing_ball.riv');

function expectDefined<T>(value: T): asserts value is NonNullable<T> {
  expect(value).toBeDefined();
}

// Note: installWorkletDispatcher is already called in App.tsx at startup.
// UI thread listeners are designed for Rive-driven value changes (animation/data binding),
// not for JS-thread value changes. Testing the full UI thread listener flow requires
// a Rive file with animation that drives property changes.

describe('Worklet Bridge', () => {
  it('RiveWorkletBridge HybridObject can be created', () => {
    const bridge =
      NitroModules.createHybridObject<RiveWorkletBridge>('RiveWorkletBridge');
    expect(bridge).toBeDefined();
  });

  it('property can be boxed for worklet use', async () => {
    const file = await RiveFileFactory.fromSource(DATABINDING, undefined);
    const vm = file.viewModelByName('Person');
    expectDefined(vm);
    const instance = vm.createInstanceByName('Gordon');
    expectDefined(instance);

    const property = instance.numberProperty('age');
    expectDefined(property);

    // Verify boxing works (required for passing to worklets)
    const boxedProperty = NitroModules.box(property);
    expect(boxedProperty).toBeDefined();

    // Verify the property value can be read
    expect(property.value).toBe(30); // Gordon's age is 30
  });

  // TODO: for some reason those wont run in harness environment
  if (!global.RN_HARNESS) {
    it('JS thread listener is called when Rive animation changes value', async () => {
      // Listeners are notified when Rive animation/data binding changes values.
      // This test uses bouncing_ball.riv which has an animation that drives ypos.

      let receivedValue: number | undefined;

      function ListenerTestComponent({
        onResult,
      }: {
        onResult: (value: number) => void;
      }) {
        const { riveFile } = useRiveFile(BOUNCING_BALL);
        const instance = useViewModelInstance(riveFile);

        const property = useMemo(
          () => instance?.numberProperty('ypos'),
          [instance]
        );

        useEffect(
          () =>
            property?.addListener((value) => {
              onResult(value);
            }),
          [property, onResult]
        );

        if (!riveFile || !instance) {
          return <View />;
        }

        return (
          <RiveView
            style={{ width: 100, height: 100 }}
            autoPlay={true}
            dataBind={instance}
            fit={Fit.Contain}
            file={riveFile}
          />
        );
      }

      try {
        await render(
          <ListenerTestComponent
            onResult={(value) => {
              receivedValue = value;
            }}
          />
        );

        await waitFor(
          () => {
            expect(receivedValue).toBeDefined();
            expect(typeof receivedValue).toBe('number');
          },
          { timeout: 5000 }
        );
      } finally {
        cleanup();
      }
    });

    it('UI thread listener is called when Rive animation changes value', async () => {
      // Same as above but listener is registered via scheduleOnUI, so callback runs on UI thread

      type ListenerResult = {
        calledOnUIThread: boolean;
        receivedValue: number;
      };

      let result: ListenerResult | undefined;

      function UIThreadListenerTestComponent({
        onResult,
      }: {
        onResult: (r: ListenerResult) => void;
      }) {
        const { riveFile } = useRiveFile(BOUNCING_BALL);
        const instance = useViewModelInstance(riveFile);

        const property = useMemo(
          () => instance?.numberProperty('ypos'),
          [instance]
        );

        useEffect(() => {
          if (!property) return;

          const boxedProperty = NitroModules.box(property);

          const reportResult = (r: ListenerResult) => {
            onResult(r);
          };

          scheduleOnUI(() => {
            'worklet';
            const prop = boxedProperty.unbox();
            prop.addListener((value: number) => {
              'worklet';
              // Check if we're on UI thread
              const isOnUIThread =
                typeof global._WORKLET !== 'undefined' &&
                global._WORKLET === true;
              scheduleOnRN(reportResult, {
                calledOnUIThread: isOnUIThread,
                receivedValue: value,
              });
            });
          });

          return () => {
            property.removeListeners();
          };
        }, [property, onResult]);

        if (!riveFile || !instance) {
          return <View />;
        }

        return (
          <RiveView
            style={{ width: 100, height: 100 }}
            autoPlay={true}
            dataBind={instance}
            fit={Fit.Contain}
            file={riveFile}
          />
        );
      }

      try {
        await render(
          <UIThreadListenerTestComponent
            onResult={(r) => {
              result = r;
            }}
          />
        );

        // Wait for animation to trigger the listener (bouncing ball should change ypos quickly)
        await waitFor(
          () => {
            expect(result).toBeDefined();
            expect(result!.calledOnUIThread).toBe(true);
            expect(typeof result!.receivedValue).toBe('number');
          },
          { timeout: 5000 }
        );
      } finally {
        cleanup();
      }
    });
  }
});
