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
// null, expected a String". Treat null like undefined for optional props.
// Remove once fixed upstream: https://github.com/mrousavy/nitro/issues/1184
function acceptNullForOptionalProps() {
  if (!existsSync(COMPONENT_FILE)) {
    console.warn('HybridRiveViewComponent.cpp not found, skipping');
    return;
  }

  const content = readFileSync(COMPONENT_FILE, 'utf-8');
  if (content.includes('fromRawValueAcceptingNull')) {
    console.log('HybridRiveViewComponent.cpp already accepts null props');
    return;
  }

  const parseSite =
    /nitro::ReactProp<(std::optional<[^\n]+>)>::fromRawValue\(/g;
  const anchor = '  using namespace facebook;\n';
  if (!parseSite.test(content) || !content.includes(anchor)) {
    console.warn(
      'No optional ReactProp parse sites found in HybridRiveViewComponent.cpp — nitrogen output may have changed shape'
    );
    return;
  }
  parseSite.lastIndex = 0;

  const helper = `
  namespace {
    template <typename T>
    nitro::ReactProp<T> fromRawValueAcceptingNull(const char* viewName, const char* propName,
                                                  const react::RawProps& rawProps,
                                                  const nitro::ReactProp<T>& previousProp) {
      const react::RawValue* rawValue = nitro::RawPropsCompat::at(rawProps, propName);
      if (rawValue != nullptr) {
        auto [runtime, value] = static_cast<std::pair<jsi::Runtime*, jsi::Value>>(*rawValue);
        if (value.isNull()) {
          if (previousProp.isProvided() && !previousProp.get().has_value()) {
            return previousProp;
          }
          JSICacheReference cache = JSICache::getOrCreateCache(*runtime);
          return nitro::ReactProp<T>(T(std::nullopt), cache.makeShared(jsi::Value::undefined()));
        }
      }
      return nitro::ReactProp<T>::fromRawValue(viewName, propName, rawProps, previousProp);
    }
  } // namespace
`;

  const updated = content
    .replace(anchor, anchor + helper)
    .replace(parseSite, 'fromRawValueAcceptingNull<$1>(');

  writeFileSync(COMPONENT_FILE, updated);
  console.log(
    'Patched HybridRiveViewComponent.cpp to accept null for optional props'
  );
}

makeHybridRiveViewManagerOpen();
acceptNullForOptionalProps();
