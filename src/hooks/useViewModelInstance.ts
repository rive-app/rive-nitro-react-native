// TODO: migrate createInstance/createInstanceByName/etc to async equivalents
/* eslint-disable @typescript-eslint/no-deprecated */
import { useMemo, useRef } from 'react';
import type { ViewModel, ViewModelInstance } from '../specs/ViewModel.nitro';
import type { RiveFile } from '../specs/RiveFile.nitro';
import type { RiveViewRef } from '../index';
import { callDispose } from '../core/callDispose';
import { ArtboardByName } from '../specs/ArtboardBy';
import { useDisposableMemo } from './useDisposableMemo';

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

interface UseViewModelInstanceFileBaseParams extends UseViewModelInstanceBaseParams {
  /**
   * The ViewModel instance name (uses `createInstanceByName()`).
   * If not provided, creates the default instance.
   */
  instanceName?: string;
}

/**
 * Use the ViewModel assigned to the default artboard.
 */
interface UseViewModelInstanceFileDefault extends UseViewModelInstanceFileBaseParams {
  artboardName?: never;
  viewModelName?: never;
}

/**
 * Use the ViewModel assigned to a specific artboard.
 */
interface UseViewModelInstanceFileByArtboard extends UseViewModelInstanceFileBaseParams {
  /**
   * Get the ViewModel assigned to this artboard.
   */
  artboardName: string;
  viewModelName?: never;
}

/**
 * Use a ViewModel by name (file-wide lookup).
 * ViewModels are defined at the file level, not per-artboard.
 */
interface UseViewModelInstanceFileByViewModelName extends UseViewModelInstanceFileBaseParams {
  artboardName?: never;
  /**
   * The name of the ViewModel to use (uses `viewModelByName()`).
   * ViewModels are defined at the file level and looked up by name across the entire file.
   */
  viewModelName: string;
}

export type UseViewModelInstanceFileParams =
  | UseViewModelInstanceFileDefault
  | UseViewModelInstanceFileByArtboard
  | UseViewModelInstanceFileByViewModelName;

export interface UseViewModelInstanceViewModelParams extends UseViewModelInstanceBaseParams {
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

function isRiveViewRef(
  source: ViewModelSource | null | undefined
): source is RiveViewRef {
  return source != null && 'getViewModelInstance' in source;
}

function isRiveFile(
  source: ViewModelSource | null | undefined
): source is RiveFile {
  return source != null && 'defaultArtboardViewModel' in source;
}

type CreateInstanceResult = {
  instance: ViewModelInstance | null | undefined;
  needsDispose: boolean;
  error?: string;
};

function createInstance(
  source: ViewModelSource | null | undefined,
  instanceName: string | undefined,
  artboardName: string | undefined,
  viewModelName: string | undefined,
  useNew: boolean
): CreateInstanceResult {
  if (!source) {
    return { instance: undefined, needsDispose: false };
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

export type UseViewModelInstanceResult =
  | { instance: ViewModelInstance; error: null }
  | { instance: null; error: Error }
  | { instance: null; error: null }
  | { instance: undefined; error: null };

/**
 * Hook for getting a ViewModelInstance from a RiveFile, ViewModel, or RiveViewRef.
 *
 * @deprecated Use {@link useViewModelInstanceAsync} instead. This hook creates the
 * instance synchronously via deprecated runtime APIs that access the Rive runtime on
 * the JS thread; the async variant uses the non-deprecated `*Async` APIs.
 *
 * @param source - The RiveFile, ViewModel, or RiveViewRef to get an instance from
 * @param params - Configuration for which instance to retrieve
 * @returns An object with `instance` and `error` (discriminated union)
 *
 * @example
 * ```tsx
 * // From RiveFile (get default instance)
 * const { riveFile } = useRiveFile(require('./animation.riv'));
 * const { instance } = useViewModelInstance(riveFile);
 * ```
 *
 * @example
 * ```tsx
 * // From RiveFile with specific instance name
 * const { riveFile } = useRiveFile(require('./animation.riv'));
 * const { instance } = useViewModelInstance(riveFile, { instanceName: 'PersonInstance' });
 * ```
 *
 * @example
 * ```tsx
 * // From RiveFile with specific ViewModel name
 * const { riveFile } = useRiveFile(require('./animation.riv'));
 * const { instance } = useViewModelInstance(riveFile, { viewModelName: 'Settings' });
 * ```
 *
 * @example
 * ```tsx
 * // From RiveFile with specific artboard
 * const { riveFile } = useRiveFile(require('./animation.riv'));
 * const { instance } = useViewModelInstance(riveFile, { artboardName: 'MainArtboard' });
 * ```
 *
 * @example
 * ```tsx
 * // From RiveViewRef (get auto-bound instance)
 * const { riveViewRef, setHybridRef } = useRive();
 * const { instance } = useViewModelInstance(riveViewRef);
 * ```
 *
 * @example
 * ```tsx
 * // From ViewModel
 * const viewModel = file.viewModelByName('main');
 * const { instance } = useViewModelInstance(viewModel);
 * ```
 *
 * @example
 * ```tsx
 * // Create a new blank instance from ViewModel
 * const viewModel = file.viewModelByName('TodoItem');
 * const { instance } = useViewModelInstance(viewModel, { useNew: true });
 * ```
 *
 * @example
 * ```tsx
 * // With required: true (throws if null, use with Error Boundary)
 * const { instance } = useViewModelInstance(riveFile, { required: true });
 * // instance is guaranteed to be non-null here
 * ```
 *
 * @example
 * ```tsx
 * // With onInit to set initial values synchronously
 * const { instance } = useViewModelInstance(riveFile, {
 *   onInit: (vmi) => {
 *     vmi.numberProperty('count').set(initialCount);
 *     vmi.stringProperty('name').set(userName);
 *   }
 * });
 * ```
 *
 * @example
 * ```tsx
 * // Error handling
 * const { instance, error } = useViewModelInstance(riveFile, { viewModelName: 'Missing' });
 * if (error) console.error(error.message);
 * ```
 */
// RiveFile overloads
export function useViewModelInstance(
  source: RiveFile,
  params: UseViewModelInstanceFileParams & { required: true }
):
  | { instance: ViewModelInstance; error: null }
  | { instance: undefined; error: null };
export function useViewModelInstance(
  source: RiveFile | null | undefined,
  params?: UseViewModelInstanceFileParams
): UseViewModelInstanceResult;

// ViewModel overloads
export function useViewModelInstance(
  source: ViewModel,
  params: UseViewModelInstanceViewModelParams & { required: true }
):
  | { instance: ViewModelInstance; error: null }
  | { instance: undefined; error: null };
export function useViewModelInstance(
  source: ViewModel | null | undefined,
  params?: UseViewModelInstanceViewModelParams
): UseViewModelInstanceResult;

// RiveViewRef overloads
export function useViewModelInstance(
  source: RiveViewRef,
  params: UseViewModelInstanceRefParams & { required: true }
):
  | { instance: ViewModelInstance; error: null }
  | { instance: undefined; error: null };
export function useViewModelInstance(
  source: RiveViewRef | null | undefined,
  params?: UseViewModelInstanceRefParams
): UseViewModelInstanceResult;

// Implementation
export function useViewModelInstance(
  source: ViewModelSource | null | undefined,
  params?:
    | UseViewModelInstanceFileParams
    | UseViewModelInstanceViewModelParams
    | UseViewModelInstanceRefParams
): UseViewModelInstanceResult {
  const fileInstanceName = (params as { instanceName?: string } | undefined)
    ?.instanceName;
  const viewModelInstanceName = (params as { name?: string } | undefined)?.name;
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

  const onInitRef = useRef(onInit);
  onInitRef.current = onInit;

  const result = useDisposableMemo(
    () => {
      const created = createInstance(
        source,
        instanceName,
        artboardName,
        viewModelName,
        useNew
      );
      if (created.instance && onInitRef.current) {
        onInitRef.current(created.instance);
      }
      return created;
    },
    (r) => {
      if (r.needsDispose && r.instance) {
        callDispose(r.instance);
      }
    },
    [source, instanceName, artboardName, viewModelName, useNew]
  );

  const error = useMemo(
    () => (result.error ? new Error(result.error) : null),
    [result.error]
  );

  if (required && result.instance === null) {
    throw new Error(
      result.error
        ? `useViewModelInstance: ${result.error}`
        : 'useViewModelInstance: Failed to get ViewModelInstance. ' +
            'Ensure the source has a valid ViewModel and instance available.'
    );
  }

  if (result.instance) {
    return { instance: result.instance, error: null };
  }
  if (result.instance === undefined) {
    return { instance: undefined, error: null };
  }
  return { instance: null, error };
}
