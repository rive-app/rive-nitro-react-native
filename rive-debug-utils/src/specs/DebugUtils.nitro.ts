import type { HybridObject } from 'react-native-nitro-modules';

/**
 * Native test helpers for the example apps (Android only).
 *
 * Simulates what Fabric view recycling does to a dropped view: keeps a
 * reference to the Android view across the React unmount, then re-attaches it
 * to the window. Exceptions from re-attaching are reported back to JS instead
 * of crashing the app, so reproducer pages can display the result.
 */
export interface DebugUtils extends HybridObject<{
  android: 'kotlin';
}> {
  /**
   * Finds the first view whose class name is `viewClassName` in the current
   * activity's hierarchy and keeps a strong reference to it.
   * Returns whether a view was found.
   */
  captureView(viewClassName: string): Promise<boolean>;

  /**
   * Re-attaches the captured view to the window (as Fabric view recycling
   * would). Returns 'no-crash' on success, or the exception + stack trace.
   */
  reattachCapturedView(): Promise<string>;

  /** Detaches the captured view (if any) and drops the reference. */
  releaseCapturedView(): Promise<void>;
}
