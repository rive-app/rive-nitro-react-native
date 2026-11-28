import {
  describe,
  it,
  expect,
  render,
  waitFor,
  cleanup,
} from 'react-native-harness';
import { Component, useEffect, useState, type ReactNode } from 'react';
import { Text, View } from 'react-native';
import {
  RiveView,
  RiveFileFactory,
  Fit,
  Alignment,
  DataBindMode,
  type RiveFile,
} from '@rive-app/react-native';

// Removing a prop makes Fabric send `null`, which Nitro <= 0.37.2 rejects for
// optional props (https://github.com/margelo/nitro/issues/1184).
const BOUNCING_BALL = require('../assets/rive/bouncing_ball.riv');

const delay = (ms: number) => new Promise((r) => setTimeout(r, ms));

type TestContext = {
  setProps: ((props: Record<string, unknown>) => void) | null;
  error: Error | null;
};

class CatchBoundary extends Component<
  { context: TestContext; children: ReactNode },
  { failed: boolean }
> {
  state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  componentDidCatch(error: Error) {
    this.props.context.error = error;
  }

  render() {
    return this.state.failed ? <Text>crashed</Text> : this.props.children;
  }
}

function ClearableView({
  file,
  initialProps,
  context,
}: {
  file: RiveFile;
  initialProps: Record<string, unknown>;
  context: TestContext;
}) {
  const [props, setProps] = useState(initialProps);

  useEffect(() => {
    context.setProps = setProps;
    return () => {
      context.setProps = null;
    };
  }, [context]);

  return (
    <View style={{ width: 160, height: 160 }}>
      <RiveView style={{ flex: 1 }} file={file} {...props} />
    </View>
  );
}

const CASES: { prop: string; value: unknown }[] = [
  { prop: 'artboardName', value: 'Artboard' },
  { prop: 'stateMachineName', value: 'State Machine 1' },
  { prop: 'autoPlay', value: true },
  { prop: 'alignment', value: Alignment.Center },
  { prop: 'fit', value: Fit.Contain },
  { prop: 'layoutScaleFactor', value: 2 },
  { prop: 'dataBind', value: DataBindMode.Auto },
];

describe('Clearing optional RiveView props', () => {
  for (const { prop, value } of CASES) {
    it(`accepts ${prop} going back to undefined`, async () => {
      const file = await RiveFileFactory.fromSource(BOUNCING_BALL, undefined);
      const context: TestContext = { setProps: null, error: null };
      await render(
        <CatchBoundary context={context}>
          <ClearableView
            file={file}
            initialProps={{ [prop]: value }}
            context={context}
          />
        </CatchBoundary>
      );
      await waitFor(() => expect(context.setProps).not.toBeNull(), {
        timeout: 5000,
      });

      context.setProps?.({});
      await delay(500);

      expect(context.error?.message ?? null).toBeNull();
      expect(context.setProps).not.toBeNull();
      cleanup();
    });
  }
});
