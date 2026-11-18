// The refresh runtime must hook into DevTools before the renderer loads.
const RefreshRuntime = require('react-refresh/runtime');
RefreshRuntime.injectIntoGlobalHook(globalThis);
const React = require('react');
const TestRenderer = require('react-test-renderer');
const { useDisposableMemo } = require('../useDisposableMemo');

(globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;

type Resource = { dispose: jest.Mock };

it('keeps the useDisposableMemo value when a component is Fast Refreshed', async () => {
  const created: Resource[] = [];
  const makeComponent = () =>
    function Refreshed() {
      useDisposableMemo(
        () => {
          const r = { dispose: jest.fn() };
          created.push(r);
          return r;
        },
        (r: Resource) => r.dispose(),
        []
      );
      return null;
    };
  const install = (Component: () => null) => {
    RefreshRuntime.register(Component, 'Refreshed');
    RefreshRuntime.setSignature(Component, 'unchanged');
  };
  const first = makeComponent();
  install(first);
  let renderer: any;
  await TestRenderer.act(async () => {
    renderer = TestRenderer.create(React.createElement(first), {
      unstable_isConcurrent: true,
    });
  });
  install(makeComponent());
  await TestRenderer.act(async () => RefreshRuntime.performReactRefresh());
  expect(created).toHaveLength(1);
  expect(created[0]!.dispose).not.toHaveBeenCalled();
  await TestRenderer.act(async () => renderer.unmount());
  expect(created[0]!.dispose).toHaveBeenCalledTimes(1);
});

export {};
