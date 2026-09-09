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

// Fabric can recreate a component view from an unchanged ShadowNode (e.g.
// react-freeze / Suspense re-inserting a previously hidden screen, or a plain
// display:none toggle). Nitro 0.35's isDirty prop flags live on the shared
// Props object and were already consumed by the previous view instance, so the
// recreated view's updateProps applies nothing: no file, no artboard, and a
// hybridRef that never fires (issue #365). Force-apply every prop on a view
// instance's first updateProps. Fixed upstream in nitro 0.37 (the generated
// code diffs old vs new props instead) — drop this when bumping past 0.36.
function forceApplyPropsOnFreshComponentView() {
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

  const ivarAnchor = `@implementation HybridRiveViewComponent {
  std::shared_ptr<HybridRiveViewSpecSwift> _hybridView;
}`;
  const updatePropsAnchor = `  auto& newViewProps = const_cast<HybridRiveViewProps&>(newViewPropsConst);
  RNRive::HybridRiveViewSpec_cxx& swiftPart = _hybridView->getSwiftPart();
`;
  const recycleAnchor = `- (void)prepareForRecycle {
  [super prepareForRecycle];`;
  const dirtyCheck = /if \((newViewProps\.\w+\.isDirty)\) \{/g;

  if (
    !content.includes(ivarAnchor) ||
    !content.includes(updatePropsAnchor) ||
    !content.includes(recycleAnchor) ||
    !dirtyCheck.test(content)
  ) {
    console.warn(
      'HybridRiveViewComponent.mm anchors not found — nitrogen output may have changed shape'
    );
    return;
  }
  dirtyCheck.lastIndex = 0;

  const updated = content
    .replace(
      ivarAnchor,
      `@implementation HybridRiveViewComponent {
  std::shared_ptr<HybridRiveViewSpecSwift> _hybridView;
  // The cached props' isDirty flags were already consumed by the previous
  // view instance when Fabric recreates this view from an unchanged
  // ShadowNode, so updateProps would apply nothing and the fresh view would
  // stay unconfigured (issue #365). Track whether this instance applied its
  // props at least once.
  BOOL _didApplyInitialProps;
}`
    )
    .replace(
      updatePropsAnchor,
      updatePropsAnchor +
        `
  // Force-apply all props the first time this view instance updates (see
  // _didApplyInitialProps above).
  const bool force = !_didApplyInitialProps;
  _didApplyInitialProps = YES;
`
    )
    .replace(dirtyCheck, 'if (force || $1) {')
    .replace(
      recycleAnchor,
      recycleAnchor +
        `
  _didApplyInitialProps = NO;`
    );

  writeFileSync(IOS_COMPONENT_FILE, updated);
  console.log(
    'Patched HybridRiveViewComponent.mm to force-apply props on a fresh view'
  );
}

makeHybridRiveViewManagerOpen();
acceptNullForOptionalProps();
forceApplyPropsOnFreshComponentView();
