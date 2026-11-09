import { useEffect, useInsertionEffect, useRef } from 'react';

/**
 * Counts the effects that hold a native object and releases it once none do.
 *
 * The release waits for a microtask so that every passive cleanup of the same
 * commit runs first: React runs a deletion's passive cleanups parent before
 * child, and a child may still unsubscribe from the object (#407).
 */
export class Retainer {
  private count = 0;
  released = false;

  constructor(private readonly onRelease: () => void) {}

  retain(): () => void {
    if (__DEV__ && this.released) {
      console.error(
        'react-native-rive: a component was shown again after its native ' +
          'objects were released. React may have changed how <Activity> ' +
          'runs insertion effects (#448).'
      );
    }
    this.count++;
    return () => {
      if (--this.count > 0) return;
      queueMicrotask(() => {
        if (this.count > 0 || this.released) return;
        this.released = true;
        this.onRelease();
      });
    };
  }
}

/**
 * Runs `onUnmount` on a real unmount, not on the passive cleanups of an
 * `<Activity>` hide, Strict Mode or Fast Refresh, which keep the component's
 * refs and values (#448).
 *
 * Hiding runs no insertion cleanup, so the insertion effect holds the component
 * until it is deleted. React before 19.3 runs no cleanup for a deleted hidden
 * subtree, nor an insertion cleanup for a Suspense-hidden one, so those cases
 * wait for GC.
 */
export function useUnmountEffect(onUnmount: () => void): void {
  const onUnmountRef = useRef(onUnmount);
  onUnmountRef.current = onUnmount;
  const retainerRef = useRef<Retainer | null>(null);
  retainerRef.current ??= new Retainer(() => onUnmountRef.current());
  const retainer = retainerRef.current;

  useInsertionEffect(() => retainer.retain(), [retainer]);
  useEffect(() => retainer.retain(), [retainer]);
}
