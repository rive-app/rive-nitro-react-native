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

// nitrogen 0.36 constructs the component descriptor with a plain
// `RawPropsParser()`, which only keeps props as jsi::Values on React Native
// >= 0.85 (older versions default the useRawPropsJsiValue flag to false and
// convert every prop to folly::dynamic). The generated Props constructor then
// casts each RawValue to a jsi::Value pair, which aborts on a dynamic-backed
// value, so mounting any RiveView crashes on RN < 0.85. Force the JSI parser
// where the flag still exists; nitro 0.37 ships the same guard in
// RawPropsCompat::makePropsParser().
function forceJsiPropsParserOnOlderReactNative() {
  if (!existsSync(COMPONENT_FILE)) {
    console.warn('HybridRiveViewComponent.cpp not found, skipping');
    return;
  }

  const content = readFileSync(COMPONENT_FILE, 'utf-8');
  if (content.includes('RN_HAS_ALWAYS_ON_JSI_PROPS_PARSER')) {
    console.log(
      'HybridRiveViewComponent.cpp already forces the JSI props parser'
    );
    return;
  }

  const ctorPattern = /^( *)react::RawPropsParser\(\)\) \{\}$/m;
  const includePattern = /^#include "HybridRiveViewComponent\.hpp"$/m;
  if (!ctorPattern.test(content) || !includePattern.test(content)) {
    console.warn(
      'RawPropsParser() call site not found in HybridRiveViewComponent.cpp — nitrogen output may have changed shape'
    );
    return;
  }

  const updated = content
    .replace(
      includePattern,
      `$&

#if __has_include(<cxxreact/ReactNativeVersion.h>)
#include <cxxreact/ReactNativeVersion.h>
#endif
#if defined(REACT_NATIVE_VERSION_MINOR) && (REACT_NATIVE_VERSION_MAJOR > 0 || REACT_NATIVE_VERSION_MINOR >= 85)
#define RN_HAS_ALWAYS_ON_JSI_PROPS_PARSER 1
#else
#define RN_HAS_ALWAYS_ON_JSI_PROPS_PARSER 0
#endif`
    )
    .replace(
      ctorPattern,
      (match, indent) =>
        `#if RN_HAS_ALWAYS_ON_JSI_PROPS_PARSER
${match}
#else
${indent}react::RawPropsParser(/* useRawPropsJsiValue */ true)) {}
#endif`
    );

  writeFileSync(COMPONENT_FILE, updated);
  console.log(
    'Patched HybridRiveViewComponent.cpp to force the JSI props parser on RN < 0.85'
  );
}

// RCTViewComponentView asserts in updateProps that a subclass replaced the
// base ViewProps default in its constructor; React Native 0.87 turns that
// assertion into an uncaught NSInternalInconsistencyException, so every
// RiveView mount aborts on a debug build. nitrogen 0.36 leaves `_props` at the
// base default; nitrogen 0.37 emits this same assignment.
function defaultPropsInComponentViewInit() {
  if (!existsSync(IOS_COMPONENT_FILE)) {
    console.warn('HybridRiveViewComponent.mm not found, skipping');
    return;
  }

  const content = readFileSync(IOS_COMPONENT_FILE, 'utf-8');
  if (content.includes('defaultSharedProps()')) {
    console.log('HybridRiveViewComponent.mm already initializes _props');
    return;
  }

  const pattern = /^( *)if \(self = \[super init\]\) \{$/m;
  if (!pattern.test(content)) {
    console.warn(
      'init not found in HybridRiveViewComponent.mm — nitrogen output may have changed shape'
    );
    return;
  }

  const updated = content.replace(
    pattern,
    (match, indent) =>
      `${match}\n${indent}  _props = HybridRiveViewShadowNode::defaultSharedProps();`
  );

  writeFileSync(IOS_COMPONENT_FILE, updated);
  console.log('Patched HybridRiveViewComponent.mm to initialize _props');
}

makeHybridRiveViewManagerOpen();
acceptNullForOptionalProps();
forceApplyPropsOnFreshComponentView();
forceJsiPropsParserOnOlderReactNative();
defaultPropsInComponentViewInit();
