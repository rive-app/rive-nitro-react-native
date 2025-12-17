import { useMemo, useEffect, useRef } from 'react';
import type { ViewModel, ViewModelInstance } from '../specs/ViewModel.nitro';
import type { RiveFile } from '../specs/RiveFile.nitro';
import type { RiveViewRef } from '../index';
import { callDispose } from '../core/callDispose';

export interface UseViewModelInstanceParams {
  /**
   * Get a specifically named instance from the ViewModel.
   */
  name?: string;
  /**
   * Create a new (blank) instance from the ViewModel.
   */
  useNew?: boolean;
  /**
   * If true, throws an error when the instance cannot be obtained.
   * This is useful with Error Boundaries and ensures TypeScript knows
   * the return value is non-null.
   */
  required?: boolean;
  /**
   * Called synchronously when a new instance is created, before the hook returns.
   * Use this to set initial values that need to be available immediately.
   * Note: This callback is excluded from deps - changing it won't recreate the instance.
   */
  onInit?: (instance: ViewModelInstance) => void;
}

type ViewModelSource = ViewModel | RiveFile | RiveViewRef;

function isRiveViewRef(source: ViewModelSource | null): source is RiveViewRef {
  return (
    source !== null && source !== undefined && 'getViewModelInstance' in source
  );
}

function isRiveFile(source: ViewModelSource | null): source is RiveFile {
  return (
    source !== null &&
    source !== undefined &&
    'defaultArtboardViewModel' in source
  );
}

function createInstance(
  source: ViewModelSource | null,
  name: string | undefined,
  useNew: boolean
): { instance: ViewModelInstance | null; needsDispose: boolean } {
  if (!source) {
    return { instance: null, needsDispose: false };
  }

  if (isRiveViewRef(source)) {
    const vmi = source.getViewModelInstance();
    return { instance: vmi ?? null, needsDispose: false };
  }

  if (isRiveFile(source)) {
    const viewModel = source.defaultArtboardViewModel();
    const vmi = viewModel?.createDefaultInstance();
    return { instance: vmi ?? null, needsDispose: true };
  }

  // ViewModel source
  let vmi: ViewModelInstance | undefined;
  if (name) {
    vmi = source.createInstanceByName(name);
  } else if (useNew) {
    vmi = source.createInstance();
  } else {
    vmi = source.createDefaultInstance();
  }
  return { instance: vmi ?? null, needsDispose: true };
}

/**
 * Hook for getting a ViewModelInstance from a RiveFile, ViewModel, or RiveViewRef.
 *
 * @param source - The RiveFile, ViewModel, or RiveViewRef to get an instance from
 * @param params - Configuration for which instance to retrieve (only used with ViewModel)
 * @returns The ViewModelInstance or null if not found
 *
 * @example
 * ```tsx
 * // From RiveFile (get default instance)
 * const { riveFile } = useRiveFile(require('./animation.riv'));
 * const instance = useViewModelInstance(riveFile);
 * ```
 *
 * @example
 * ```tsx
 * // From RiveViewRef (get auto-bound instance)
 * const { riveViewRef, setHybridRef } = useRive();
 * const instance = useViewModelInstance(riveViewRef);
 * ```
 *
 * @example
 * ```tsx
 * // From ViewModel
 * const viewModel = file.viewModelByName('main');
 * const instance = useViewModelInstance(viewModel);
 * ```
 *
 * @example
 * ```tsx
 * // Create a new blank instance from ViewModel
 * const viewModel = file.viewModelByName('TodoItem');
 * const newInstance = useViewModelInstance(viewModel, { useNew: true });
 * ```
 *
 * @example
 * ```tsx
 * // With required: true (throws if null, use with Error Boundary)
 * const instance = useViewModelInstance(riveFile, { required: true });
 * // instance is guaranteed to be non-null here
 * ```
 *
 * @example
 * ```tsx
 * // With onInit to set initial values synchronously
 * const instance = useViewModelInstance(riveFile, {
 *   onInit: (vmi) => {
 *     vmi.numberProperty('count').set(initialCount);
 *     vmi.stringProperty('name').set(userName);
 *   }
 * });
 * // Values are already set here
 * ```
 */
export function useViewModelInstance(
  source: ViewModelSource,
  params: UseViewModelInstanceParams & { required: true }
): ViewModelInstance;
export function useViewModelInstance(
  source: ViewModelSource | null,
  params?: UseViewModelInstanceParams
): ViewModelInstance | null;
export function useViewModelInstance(
  source: ViewModelSource | null,
  params?: UseViewModelInstanceParams
): ViewModelInstance | null {
  const name = params?.name;
  const useNew = params?.useNew ?? false;
  const required = params?.required ?? false;
  const onInit = params?.onInit;

  const prevInstanceRef = useRef<{
    instance: ViewModelInstance | null;
    needsDispose: boolean;
  } | null>(null);

  const result = useMemo(() => {
    const created = createInstance(source, name, useNew);
    if (created.instance && onInit) {
      onInit(created.instance);
    }
    return created;
    // eslint-disable-next-line react-hooks/exhaustive-deps -- onInit excluded intentionally
  }, [source, name, useNew]);

  // Dispose previous instance if it changed and needed disposal
  if (
    prevInstanceRef.current &&
    prevInstanceRef.current.instance !== result.instance &&
    prevInstanceRef.current.needsDispose &&
    prevInstanceRef.current.instance
  ) {
    callDispose(prevInstanceRef.current.instance);
  }
  prevInstanceRef.current = result;

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (
        prevInstanceRef.current?.needsDispose &&
        prevInstanceRef.current.instance
      ) {
        callDispose(prevInstanceRef.current.instance);
        prevInstanceRef.current = null;
      }
    };
  }, []);

  if (required && result.instance === null) {
    throw new Error(
      'useViewModelInstance: Failed to get ViewModelInstance. ' +
        'Ensure the source has a valid ViewModel and instance available.'
    );
  }

  return result.instance;
}
