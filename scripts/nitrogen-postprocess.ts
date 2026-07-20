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
  const pattern =
    /^( *)return (CachedProp<std::optional<.+>>)::fromRawValue\(\*runtime, value, (sourceProps\.\w+)\);$/gm;
  const updated = content.replace(
    pattern,
    (match, indent, cachedProp, sourceProp) =>
      `${indent}if (value.isNull()) return ${cachedProp}::fromRawValue(*runtime, jsi::Value::undefined(), ${sourceProp});\n${match}`
  );

  if (content === updated) {
    if (content.includes('value.isNull()')) {
      console.log('HybridRiveViewComponent.cpp already accepts null props');
    } else {
      console.warn(
        'No optional CachedProp parse sites found in HybridRiveViewComponent.cpp — nitrogen output may have changed shape'
      );
    }
    return;
  }

  writeFileSync(COMPONENT_FILE, updated);
  console.log(
    'Patched HybridRiveViewComponent.cpp to accept null for optional props'
  );
}

makeHybridRiveViewManagerOpen();
acceptNullForOptionalProps();
