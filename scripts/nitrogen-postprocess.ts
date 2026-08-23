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
// null, expected a String". Since nitro 0.37 the conversion happens inside
// ReactProp::fromRawValue (a library header, not generated code), so instead
// of editing the parse site we inject a wrapper that peeks at the raw value
// first (via the public RawPropsCompat::at) and parses a null-valued optional
// prop as a cleared one, never handing the null to nitro.
// Remove once fixed upstream: https://github.com/mrousavy/nitro/issues/1184
const NULL_AS_CLEARED_HELPER = `
  template <typename T> struct RiveIsOptional final : std::false_type {};
  template <typename T> struct RiveIsOptional<std::optional<T>> final : std::true_type {};

  // Fabric sends \`null\` (not \`undefined\`) when a prop is removed, but Nitro's
  // JSIConverter<std::optional<T>> only maps \`undefined\` to nullopt, so parsing
  // a cleared optional prop throws. Parse a null-valued optional prop as a
  // cleared prop instead. https://github.com/mrousavy/nitro/issues/1184
  template <typename T>
  nitro::ReactProp<T> parseNullAsCleared(const char* viewName, const char* propName,
                                         const react::RawProps& rawProps,
                                         const nitro::ReactProp<T>& sourceProp) {
    if constexpr (RiveIsOptional<T>::value) {
      const react::RawValue* rawValue = nitro::RawPropsCompat::at(rawProps, propName);
      if (rawValue != nullptr) {
        auto [runtime, value] = static_cast<std::pair<jsi::Runtime*, jsi::Value>>(*rawValue);
        if (value.isNull() && !nitro::JSIConverter<T>::canConvert(*runtime, value)) {
          return nitro::ReactProp<T>();
        }
      }
    }
    return nitro::ReactProp<T>::fromRawValue(viewName, propName, rawProps, sourceProp);
  }
`;

function acceptNullForOptionalProps() {
  if (!existsSync(COMPONENT_FILE)) {
    console.warn('HybridRiveViewComponent.cpp not found, skipping');
    return;
  }

  const content = readFileSync(COMPONENT_FILE, 'utf-8');
  if (content.includes('parseNullAsCleared')) {
    console.log('HybridRiveViewComponent.cpp already accepts null props');
    return;
  }

  const anchor = '  using namespace facebook;\n';
  const callSite = /nitro::ReactProp<(std::optional<.+>)>::fromRawValue\(/g;
  if (!content.includes(anchor) || !callSite.test(content)) {
    console.warn(
      'No optional ReactProp parse sites found in HybridRiveViewComponent.cpp — nitrogen output may have changed shape'
    );
    return;
  }
  callSite.lastIndex = 0;

  const updated = content
    .replace(anchor, anchor + NULL_AS_CLEARED_HELPER)
    .replace(callSite, (_match, type) => `parseNullAsCleared<${type}>(`);

  writeFileSync(COMPONENT_FILE, updated);
  console.log(
    'Patched HybridRiveViewComponent.cpp to accept null for optional props'
  );
}

makeHybridRiveViewManagerOpen();
acceptNullForOptionalProps();
