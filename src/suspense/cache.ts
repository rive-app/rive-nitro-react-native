import type { RiveFile } from '../specs/RiveFile.nitro';
import type { RiveFileInput } from '../hooks/useRiveFile';

export interface CacheEntry {
  riveFile: RiveFile;
  promise?: Promise<RiveFile>;
  error?: Error;
  refCount: number;
}

export interface RiveFileCache {
  get(key: string): CacheEntry | undefined;
  set(key: string, entry: CacheEntry): void;
  has(key: string): boolean;
  delete(key: string): void;
  clear(): void;
  size: number;
}

export function generateCacheKey(input: RiveFileInput): string {
  if (typeof input === 'number') {
    return `require:${input}`;
  }

  if (typeof input === 'string') {
    return `url:${input}`;
  }

  if (typeof input === 'object' && 'uri' in input) {
    return `uri:${input.uri}`;
  }

  if (input instanceof ArrayBuffer) {
    const view = new Uint8Array(input);
    let hash = 0;
    for (let i = 0; i < Math.min(view.length, 1000); i++) {
      const byte = view[i];
      // eslint-disable-next-line no-bitwise
      hash = ((hash << 5) - hash + (byte ?? 0)) | 0;
    }
    return `arraybuffer:${hash}:${input.byteLength}`;
  }

  throw new Error('Invalid RiveFileInput type');
}

export class RiveFileCacheImpl implements RiveFileCache {
  private entries = new Map<string, CacheEntry>();

  get(key: string): CacheEntry | undefined {
    return this.entries.get(key);
  }

  set(key: string, entry: CacheEntry): void {
    this.entries.set(key, entry);
  }

  has(key: string): boolean {
    return this.entries.has(key);
  }

  delete(key: string): void {
    const entry = this.entries.get(key);
    if (entry) {
      entry.riveFile.release();
      this.entries.delete(key);
    }
  }

  clear(): void {
    for (const entry of this.entries.values()) {
      entry.riveFile.release();
    }
    this.entries.clear();
  }

  get size(): number {
    return this.entries.size;
  }
}

export function createRiveFileCache(): RiveFileCache {
  return new RiveFileCacheImpl();
}
