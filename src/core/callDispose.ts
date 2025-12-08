const NITRO_DISPOSE_ERROR = 'failed to define internal native state property';

interface Disposable {
  dispose(): void;
}

/** Safely calls dispose(), ignoring errors from https://github.com/mrousavy/nitro/issues/1083 */
export function callDispose(obj: Disposable): void {
  try {
    obj.dispose();
  } catch (error) {
    const message =
      error instanceof Error ? error.message : String(error ?? '');
    if (!message.includes(NITRO_DISPOSE_ERROR)) {
      throw error;
    }
  }
}
