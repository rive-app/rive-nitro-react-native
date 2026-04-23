import { describe, it, expect, render, cleanup } from 'react-native-harness';
import { useState, useEffect } from 'react';
import { View, Text } from 'react-native';
import { RiveView, useRiveFile, Fit } from '@rive-app/react-native';

const BOUNCING_BALL = require('../assets/rive/bouncing_ball.riv');
const COUNTER = require('../assets/rive/counter.riv');
const RATING = require('../assets/rive/rating.riv');

const FILES = [BOUNCING_BALL, COUNTER, RATING];

function RiveBox({ source }: { source: number }) {
  const { riveFile } = useRiveFile(source);

  return (
    <View style={{ width: 100, height: 100 }}>
      {riveFile && (
        <RiveView
          file={riveFile}
          autoPlay
          fit={Fit.Contain}
          style={{ flex: 1 }}
        />
      )}
    </View>
  );
}

function FileSwitcher({ fileIdx }: { fileIdx: number }) {
  const source = FILES[fileIdx % FILES.length]!;
  return <RiveBox source={source} />;
}

describe('dispose during Fabric prop diffing', () => {
  it('rapidly switching file prop should not crash', async () => {
    let setIdx: (fn: (i: number) => number) => void;

    function Wrapper() {
      const [fileIdx, _setIdx] = useState(0);
      setIdx = _setIdx;
      return <FileSwitcher fileIdx={fileIdx} />;
    }

    await render(<Wrapper />);

    // Wait for initial file to load
    await new Promise((r) => setTimeout(r, 500));

    // Rapid 3x switch — same pattern that crashes when React's
    // logComponentRender diffs old vs new props on the disposed object
    setIdx!((i) => i + 1);
    await new Promise((r) => setTimeout(r, 500));
    setIdx!((i) => i + 1);
    await new Promise((r) => setTimeout(r, 500));
    setIdx!((i) => i + 1);

    // Wait for everything to settle
    await new Promise((r) => setTimeout(r, 1000));

    // If we get here without crashing, the test passes
    expect(true).toBe(true);

    cleanup();
  });

  it('switching file 10 times rapidly should not crash', async () => {
    let setIdx: (fn: (i: number) => number) => void;

    function Wrapper() {
      const [fileIdx, _setIdx] = useState(0);
      setIdx = _setIdx;
      return <FileSwitcher fileIdx={fileIdx} />;
    }

    await render(<Wrapper />);
    await new Promise((r) => setTimeout(r, 500));

    for (let i = 0; i < 10; i++) {
      setIdx!((j) => j + 1);
      await new Promise((r) => setTimeout(r, 200));
    }

    await new Promise((r) => setTimeout(r, 1000));
    expect(true).toBe(true);

    cleanup();
  });
});
