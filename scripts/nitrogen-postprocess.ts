import { readFileSync, writeFileSync, existsSync } from 'fs';
import { join } from 'path';

const ROOT = join(__dirname, '..');
const MANAGER_FILE = join(
  ROOT,
  'nitrogen/generated/android/kotlin/com/margelo/nitro/rive/views/HybridRiveViewManager.kt'
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

makeHybridRiveViewManagerOpen();
