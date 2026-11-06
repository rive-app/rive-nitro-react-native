import { useEffect, useInsertionEffect, useRef } from 'react';

/**
 * Runs `onUnmount` on a real unmount, not on the passive cleanups of an
 * `<Activity>` hide, Strict Mode or Fast Refresh, which keep the component's
 * refs and values (#448).
 *
 * The insertion cleanup only sets a flag because it runs in the mutation phase,
 * ahead of passive cleanups that may still call into the object (#407).
 *
 * An already hidden subtree has no passive cleanup left, so it releases in a
 * microtask that a Fast Refresh can cancel; React before 19.3 runs no cleanup
 * there, nor an insertion cleanup for a Suspense-hidden subtree, so those cases
 * wait for GC.
 */
export function useUnmountEffect(onUnmount: () => void): void {
  const state = useRef({ connected: false, unmounting: false });
  const onUnmountRef = useRef(onUnmount);
  onUnmountRef.current = onUnmount;

  useInsertionEffect(() => {
    const current = state.current;
    current.unmounting = false;
    return () => {
      current.unmounting = true;
      if (current.connected) return;
      queueMicrotask(() => {
        if (current.unmounting) onUnmountRef.current();
      });
    };
  }, []);

  useEffect(() => {
    const current = state.current;
    current.connected = true;
    return () => {
      current.connected = false;
      if (current.unmounting) onUnmountRef.current();
    };
  }, []);
}
