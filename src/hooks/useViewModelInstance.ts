import { useMemo, useEffect, useRef } from 'react';
import type { ViewModel, ViewModelInstance } from '../specs/ViewModel.nitro';
import type { RiveFile } from '../specs/RiveFile.nitro';
import type { RiveViewRef } from '../index';
import { callDispose } from '../core/callDispose';
import { ArtboardByName } from '../specs/ArtboardBy';

interface UseViewModelInstanceBaseParams {
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

export interface UseViewModelInstanceFileParams
  extends UseViewModelInstanceBaseParams {
  /**
   * The name of the artboard to get the ViewModel from.
   * If not provided, uses the default artboard.
   */
  artboardName?: string;
  /**
   * The name of the ViewModel to use (uses `viewModelByName()`).
   * If not provided, uses `defaultArtboardViewModel()`.
   */
  viewModelName?: string;
  /**
   * The ViewModel instance name (uses `createInstanceByName()`).
   * If not provided, creates the default instance.
   */
  instanceName?: string;
}

export interface UseViewModelInstanceViewModelParams
  extends UseViewModelInstanceBaseParams {
  /**
   * The ViewModel instance name (uses `createInstanceByName()`).
   * If not provided, creates the default instance.
   */
  name?: string;
  /**
   * Create a new (blank) instance from the ViewModel.
   */
  useNew?: boolean;
}

export type UseViewModelInstanceRefParams = UseViewModelInstanceBaseParams;

type ViewModelSource = ViewModel | RiveFile | RiveViewRef;

function isRiveViewRef(source: ViewModelSource | null): source is RiveViewRef {
  return source !== null && 'getViewModelInstance' in source;
}

function isRiveFile(source: ViewModelSource | null): source is RiveFile {
  return source !== null && 'defaultArtboardViewModel' in source;
}

type CreateInstanceResult = {
  instance: ViewModelInstance | null;
  needsDispose: boolean;
  error?: string;
};

function createInstance(
  source: ViewModelSource | null,
  instanceName: string | undefined,
  artboardName: string | undefined,
  viewModelName: string | undefined,
  useNew: boolean
): CreateInstanceResult {
  if (!source) {
    return { instance: null, needsDispose: false };
  }

  if (isRiveViewRef(source)) {
    const vmi = source.getViewModelInstance();
    return { instance: vmi ?? null, needsDispose: false };
  }

  if (isRiveFile(source)) {
    let viewModel: ViewModel | undefined;
    if (viewModelName) {
      viewModel = source.viewModelByName(viewModelName);
      if (!viewModel) {
        return {
          instance: null,
          needsDispose: false,
          error: `ViewModel '${viewModelName}' not found`,
        };
      }
    } else {
      viewModel = source.defaultArtboardViewModel(
        artboardName ? ArtboardByName(artboardName) : undefined
      );
      if (!viewModel) {
        if (artboardName) {
          return {
            instance: null,
            needsDispose: false,
            error: `Artboard '${artboardName}' not found or has no ViewModel`,
          };
        }
        return { instance: null, needsDispose: false };
      }
    }
    const vmi = instanceName
      ? viewModel.createInstanceByName(instanceName)
      : viewModel.createDefaultInstance();
    if (!vmi && instanceName) {
      return {
        instance: null,
        needsDispose: false,
        error: `ViewModel instance '${instanceName}' not found`,
      };
    }
    return { instance: vmi ?? null, needsDispose: true };
  }

  // ViewModel source
  let vmi: ViewModelInstance | undefined;
  if (instanceName) {
    vmi = source.createInstanceByName(instanceName);
    if (!vmi) {
      return {
        instance: null,
        needsDispose: false,
        error: `ViewModel instance '${instanceName}' not found`,
      };
    }
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
 * @param params - Configuration for which instance to retrieve
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
 * // From RiveFile with specific instance name
 * const { riveFile } = useRiveFile(require('./animation.riv'));
 * const instance = useViewModelInstance(riveFile, { instanceName: 'PersonInstance' });
 * ```
 *
 * @example
 * ```tsx
 * // From RiveFile with specific ViewModel name
 * const { riveFile } = useRiveFile(require('./animation.riv'));
 * const instance = useViewModelInstance(riveFile, { viewModelName: 'Settings' });
 * ```
 *
 * @example
 * ```tsx
 * // From RiveFile with specific artboard
 * const { riveFile } = useRiveFile(require('./animation.riv'));
 * const instance = useViewModelInstance(riveFile, { artboardName: 'MainArtboard' });
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
// RiveFile overloads
export function useViewModelInstance(
  source: RiveFile,
  params: UseViewModelInstanceFileParams & { required: true }
): ViewModelInstance;
export function useViewModelInstance(
  source: RiveFile | null,
  params?: UseViewModelInstanceFileParams
): ViewModelInstance | null;

// ViewModel overloads
export function useViewModelInstance(
  source: ViewModel,
  params: UseViewModelInstanceViewModelParams & { required: true }
): ViewModelInstance;
export function useViewModelInstance(
  source: ViewModel | null,
  params?: UseViewModelInstanceViewModelParams
): ViewModelInstance | null;

// RiveViewRef overloads
export function useViewModelInstance(
  source: RiveViewRef,
  params: UseViewModelInstanceRefParams & { required: true }
): ViewModelInstance;
export function useViewModelInstance(
  source: RiveViewRef | null,
  params?: UseViewModelInstanceRefParams
): ViewModelInstance | null;

// Implementation
export function useViewModelInstance(
  source: ViewModelSource | null,
  params?:
    | UseViewModelInstanceFileParams
    | UseViewModelInstanceViewModelParams
    | UseViewModelInstanceRefParams
): ViewModelInstance | null {
  const fileInstanceName = (
    params as UseViewModelInstanceFileParams | undefined
  )?.instanceName;
  const viewModelInstanceName = (
    params as UseViewModelInstanceViewModelParams | undefined
  )?.name;
  const instanceName = fileInstanceName ?? viewModelInstanceName;
  const artboardName = (params as UseViewModelInstanceFileParams | undefined)
    ?.artboardName;
  const viewModelName = (params as UseViewModelInstanceFileParams | undefined)
    ?.viewModelName;
  const useNew =
    (params as UseViewModelInstanceViewModelParams | undefined)?.useNew ??
    false;
  const required = params?.required ?? false;
  const onInit = params?.onInit;

  const prevInstanceRef = useRef<{
    instance: ViewModelInstance | null;
    needsDispose: boolean;
  } | null>(null);

  const result = useMemo(() => {
    const created = createInstance(
      source,
      instanceName,
      artboardName,
      viewModelName,
      useNew
    );
    if (created.instance && onInit) {
      onInit(created.instance);
    }
    return created;
    // eslint-disable-next-line react-hooks/exhaustive-deps -- onInit excluded intentionally
  }, [source, instanceName, artboardName, viewModelName, useNew]);

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
      result.error
        ? `useViewModelInstance: ${result.error}`
        : 'useViewModelInstance: Failed to get ViewModelInstance. ' +
          'Ensure the source has a valid ViewModel and instance available.'
    );
  }

  return result.instance;
}
