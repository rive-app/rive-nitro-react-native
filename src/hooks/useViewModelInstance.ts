import { useState, useEffect } from 'react';
import type { ViewModel, ViewModelInstance } from '../specs/ViewModel.nitro';
import type { RiveViewRef } from '../index';

export interface UseViewModelInstanceParams {
  /**
   * Get a specifically named instance from the ViewModel.
   */
  name?: string;
  /**
   * Create a new (blank) instance from the ViewModel.
   */
  useNew?: boolean;
}

type ViewModelSource = ViewModel | RiveViewRef | null | undefined;

function isRiveViewRef(source: ViewModelSource): source is RiveViewRef {
  return (
    source !== null && source !== undefined && 'getViewModelInstance' in source
  );
}

/**
 * Hook for getting a ViewModelInstance from a ViewModel or RiveViewRef.
 *
 * @param source - The ViewModel or RiveViewRef to get an instance from
 * @param params - Configuration for which instance to retrieve (only used with ViewModel)
 * @returns The ViewModelInstance or null if not found
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
 */
export function useViewModelInstance(
  source: ViewModelSource,
  params?: UseViewModelInstanceParams
): ViewModelInstance | null {
  const [instance, setInstance] = useState<ViewModelInstance | null>(null);

  const name = params?.name;
  const useNew = params?.useNew ?? false;

  useEffect(() => {
    if (!source) {
      setInstance(null);
      return;
    }

    if (isRiveViewRef(source)) {
      const vmi = source.getViewModelInstance();
      setInstance(vmi ?? null);
      return;
    }

    let vmi: ViewModelInstance | undefined;
    if (name) {
      vmi = source.createInstanceByName(name);
    } else if (useNew) {
      vmi = source.createInstance();
    } else {
      vmi = source.createDefaultInstance();
    }
    setInstance(vmi ?? null);

    return () => {
      if (vmi) {
        vmi.dispose();
      }
    };
  }, [source, name, useNew]);

  return instance;
}
