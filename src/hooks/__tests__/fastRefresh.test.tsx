import type { ReactNode } from 'react';

// The refresh runtime must hook into DevTools before the renderer loads.
const RefreshRuntime = require('react-refresh/runtime');
RefreshRuntime.injectIntoGlobalHook(globalThis);
const React = require('react');
const TestRenderer = require('react-test-renderer');
const { useDisposableMemo } = require('../useDisposableMemo');

(globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;

type Resource = { dispose: jest.Mock };

function makeComponent(created: Resource[]) {
  return function Refreshed() {
    const value = useDisposableMemo(
      () => {
        const r = { dispose: jest.fn() };
        created.push(r);
        return r;
      },
      (r: Resource) => r.dispose(),
      []
    );
    return value ? null : null;
  };
}

function install(Component: () => null, id: string) {
  RefreshRuntime.register(Component, id);
  RefreshRuntime.setSignature(Component, 'unchanged');
}

async function refreshUnder(mode: 'visible' | 'hidden', id: string) {
  const created: Resource[] = [];
  const first = makeComponent(created);
  install(first, id);
  const tree = (node: ReactNode) =>
    React.createElement(React.Activity, { mode }, node);
  let renderer: any;
  await TestRenderer.act(async () => {
    renderer = TestRenderer.create(tree(React.createElement(first)), {
      unstable_isConcurrent: true,
    });
  });
  install(makeComponent(created), id);
  await TestRenderer.act(async () => {
    RefreshRuntime.performReactRefresh();
  });
  return { created, renderer };
}

describe('useDisposableMemo with Fast Refresh', () => {
  it('keeps the value when a visible component refreshes', async () => {
    const { created, renderer } = await refreshUnder('visible', 'visible');
    expect(created).toHaveLength(1);
    expect(created[0]!.dispose).not.toHaveBeenCalled();
    await TestRenderer.act(async () => renderer.unmount());
    expect(created[0]!.dispose).toHaveBeenCalledTimes(1);
  });

  it('keeps the value when a hidden component refreshes', async () => {
    const { created, renderer } = await refreshUnder('hidden', 'hidden');
    expect(created).toHaveLength(1);
    expect(created[0]!.dispose).not.toHaveBeenCalled();
    await TestRenderer.act(async () => renderer.unmount());
  });
});
