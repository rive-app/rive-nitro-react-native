import { test } from 'node:test';
import { existsSync, readFileSync } from 'fs';
import { resolve } from 'path';

const ROOT = resolve(import.meta.dirname, '../..');
const BACKPORT = resolve(ROOT, 'ios/LibcxxExceptionPtrBackport.mm');
// First Nitro release expected to ship margelo/nitro#1824.
const FIXED_NITRO = [0, 37, 2];

function peerMinimum(range: string): number[] {
  const match = range.match(/>=\s*(\d+)\.(\d+)\.(\d+)/);
  if (!match) throw new Error(`Unexpected Nitro peer range: ${range}`);
  return match.slice(1).map(Number);
}

function isAtLeast(version: number[], minimum: number[]): boolean {
  for (let i = 0; i < minimum.length; i++) {
    if (version[i] !== minimum[i]) return version[i]! > minimum[i]!;
  }
  return true;
}

test('libc++ exception_ptr backport is removed once Nitro ships the fix', () => {
  const pkg = JSON.parse(readFileSync(resolve(ROOT, 'package.json'), 'utf8'));
  const minimum = peerMinimum(
    pkg.peerDependencies['react-native-nitro-modules']
  );
  if (isAtLeast(minimum, FIXED_NITRO) && existsSync(BACKPORT)) {
    throw new Error(
      'The Nitro peer minimum includes margelo/nitro#1824: delete ios/LibcxxExceptionPtrBackport.mm, its README note and this test'
    );
  }
});
