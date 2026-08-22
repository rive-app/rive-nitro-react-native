import { readFileSync, writeFileSync, existsSync } from 'fs';
import { join } from 'path';

const ROOT = join(__dirname, '..');
const MANAGER_FILE = join(
  ROOT,
  'nitrogen/generated/android/kotlin/com/margelo/nitro/rive/views/HybridRiveViewManager.kt'
);
const COMPONENT_FILE = join(
  ROOT,
  'nitrogen/generated/shared/c++/views/HybridRiveViewComponent.cpp'
);
const IOS_COMPONENT_FILE = join(
  ROOT,
  'nitrogen/generated/ios/c++/views/HybridRiveViewComponent.mm'
);

function makeHybridRiveViewManagerOpen() {
  if (!existsSync(MANAGER_FILE)) {
    console.warn('HybridRiveViewManager.kt not found, skipping');
    return;
  }

  const content = readFileSync(MANAGER_FILE, 'utf-8');
  const updated = content.replace(
    'public class HybridRiveViewManager',
    'public open class HybridRiveViewManager'
  );

  if (content === updated) {
    console.log('HybridRiveViewManager is already open');
    return;
  }

  writeFileSync(MANAGER_FILE, updated);
  console.log('Made HybridRiveViewManager open');
}

// Fabric's prop diff sends `null` (not `undefined`) when a prop is removed,
// but Nitro's JSIConverter<std::optional<T>> only maps `undefined` to nullopt,
// so clearing an optional prop throws e.g. "RiveView.artboardName: Value is
// null, expected a String". Treat null like undefined for optional props.
// Remove once fixed upstream: https://github.com/mrousavy/nitro/issues/1184
function acceptNullForOptionalProps() {
  if (!existsSync(COMPONENT_FILE)) {
    console.warn('HybridRiveViewComponent.cpp not found, skipping');
    return;
  }

  const content = readFileSync(COMPONENT_FILE, 'utf-8');
  if (content.includes('value.isNull()')) {
    console.log('HybridRiveViewComponent.cpp already accepts null props');
    return;
  }
  const pattern =
    /^( *)return (CachedProp<std::optional<.+>>)::fromRawValue\(\*runtime, value, (sourceProps\.\w+)\);$/gm;
  const updated = content.replace(
    pattern,
    (match, indent, cachedProp, sourceProp) =>
      `${indent}if (value.isNull()) return ${cachedProp}::fromRawValue(*runtime, jsi::Value::undefined(), ${sourceProp});\n${match}`
  );

  if (content === updated) {
    console.warn(
      'No optional CachedProp parse sites found in HybridRiveViewComponent.cpp — nitrogen output may have changed shape'
    );
    return;
  }

  writeFileSync(COMPONENT_FILE, updated);
  console.log(
    'Patched HybridRiveViewComponent.cpp to accept null for optional props'
  );
}

// Fabric can recreate the iOS component view from an unchanged ShadowNode
// (e.g. react-freeze / Suspense re-inserting a previously hidden screen), but
// the cached props' isDirty flags were already consumed by the previous view
// instance (they live on the shared Props object and are mutated on first
// apply), so updateProps would apply nothing and the fresh view would stay
// unconfigured: no file, no artboard, and a hybridRef that never fires.
// Force-apply every prop on a view instance's first updateProps.
// Fixed upstream in nitro 0.37 (props are diffed against oldProps instead of
// mutating shared isDirty state) — remove on the next nitro upgrade:
// https://github.com/mrousavy/nitro/pull/1506
const IVAR_BLOCK = `  // Fabric can recreate this component view from an unchanged ShadowNode
  // (e.g. react-freeze / Suspense re-inserting a previously hidden screen).
  // The cached props' isDirty flags were already consumed by the previous
  // view instance (they live on the shared Props object and are mutated on
  // first apply), so updateProps would apply nothing and the fresh
  // HybridRiveView would stay unconfigured: no file, no artboard, and a
  // hybridRef that never fires (JS keeps a ref to the dead old hybrid).
  // Force-apply every prop on this instance's first updateProps.
  BOOL _didApplyInitialProps;
`;

const FORCE_BLOCK = `
  // Force-apply all props the first time this view instance updates (see
  // _didApplyInitialProps above).
  BOOL force = !_didApplyInitialProps;
  _didApplyInitialProps = YES;
`;

function forceApplyPropsOnFirstUpdate() {
  if (!existsSync(IOS_COMPONENT_FILE)) {
    console.warn('HybridRiveViewComponent.mm not found, skipping');
    return;
  }

  const content = readFileSync(IOS_COMPONENT_FILE, 'utf-8');
  if (content.includes('_didApplyInitialProps')) {
    console.log(
      'HybridRiveViewComponent.mm already force-applies initial props'
    );
    return;
  }

  const ivarAnchor =
    '  std::shared_ptr<HybridRiveViewSpecSwift> _hybridView;\n';
  const updateAnchor = '\n  // 2. Update each prop individually\n';
  const dirtyPattern = /if \(newViewProps\.(\w+)\.isDirty\)/g;
  if (
    !content.includes(ivarAnchor) ||
    !content.includes(updateAnchor) ||
    !dirtyPattern.test(content)
  ) {
    console.warn(
      'Anchors for the force-apply patch not found in HybridRiveViewComponent.mm — nitrogen output may have changed shape'
    );
    return;
  }

  const updated = content
    .replace(ivarAnchor, `${ivarAnchor}${IVAR_BLOCK}`)
    .replace(updateAnchor, `${FORCE_BLOCK}${updateAnchor}`)
    .replace(dirtyPattern, 'if (force || newViewProps.$1.isDirty)');

  writeFileSync(IOS_COMPONENT_FILE, updated);
  console.log(
    'Patched HybridRiveViewComponent.mm to force-apply props on first update'
  );
}

makeHybridRiveViewManagerOpen();
acceptNullForOptionalProps();
forceApplyPropsOnFirstUpdate();
