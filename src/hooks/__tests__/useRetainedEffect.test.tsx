import { act, renderHook } from '@testing-library/react-native';
import { Component, type ReactNode } from 'react';
import { useRetainedEffect } from '../useRetainedEffect';

class Boundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  render() {
    return this.state.failed ? null : this.props.children;
  }
}

it('starts the next run and tears it down once when a teardown throws', async () => {
  jest.spyOn(console, 'error').mockImplementation(() => {});
  const log: string[] = [];
  const { rerender } = renderHook(
    ({ dep }: { dep: string }) =>
      useRetainedEffect(() => {
        log.push(`start ${dep}`);
        return () => {
          log.push(`stop ${dep}`);
          if (dep === 'A') throw new Error('teardown A failed');
        };
      }, [dep]),
    { initialProps: { dep: 'A' }, wrapper: Boundary }
  );

  rerender({ dep: 'B' });
  await act(async () => {});

  expect(log).toEqual(['start A', 'stop A', 'start B', 'stop B']);
});
