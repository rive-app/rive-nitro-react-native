import { useEffect, useMemo, useRef, useState } from 'react';
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
   * Called when a new instance is created, before the hook publishes it.
   * Use this to set initial values so they are applied before consumers see
   * the instance.
   * Note: This callback is excluded from deps - changing it won't recreate the instance.
   */
  onInit?: (instance: ViewModelInstance) => void;
}

interface UseViewModelInstanceFileBaseParams
  extends UseViewModelInstanceBaseParams {
  /**
   * The ViewModel instance name (uses `createInstanceByName()`).
   * If not provided, creates the default instance.
   */
  instanceName?: string;
}

/**
 * Use the ViewModel assigned to the default artboard.
 */
interface UseViewModelInstanceFileDefault
  extends UseViewModelInstanceFileBaseParams {
  artboardName?: never;
  viewModelName?: never;
}

/**
 * Use the ViewModel assigned to a specific artboard.
 */
interface UseViewModelInstanceFileByArtboard
  extends UseViewModelInstanceFileBaseParams {
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
interface UseViewModelInstanceFileByViewModelName
  extends UseViewModelInstanceFileBaseParams {
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

async function createInstanceAsync(
  source: ViewModelSource | null | undefined,
  instanceName: string | undefined,
  artboardName: string | undefined,
  viewModelName: string | undefined,
  useNew: boolean
): Promise<CreateInstanceResult> {
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
      viewModel = await source.viewModelByNameAsync(viewModelName);
      if (!viewModel) {
        return {
          instance: null,
          needsDispose: false,
          error: `ViewModel '${viewModelName}' not found`,
        };
      }
    } else {
      viewModel = await source.defaultArtboardViewModelAsync(
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
    try {
      let vmi: ViewModelInstance | undefined;
      if (instanceName) {
        try {
          vmi = await viewModel.createInstanceByNameAsync(instanceName);
        } catch (e) {
          console.warn(
            `createInstanceByNameAsync('${instanceName}') failed:`,
            e
          );
        }
        if (!vmi) {
          return {
            instance: null,
            needsDispose: false,
            error: `ViewModel instance '${instanceName}' not found`,
          };
        }
      } else {
        vmi = await viewModel.createDefaultInstanceAsync();
      }
      return { instance: vmi ?? null, needsDispose: true };
    } finally {
      // The intermediate ViewModel wrapper is hook-internal; disposing it
      // releases the native resources it owns (e.g. the artboard resolved
      // for DefaultForArtboard sources on the experimental backend).
      callDispose(viewModel);
    }
  }

  // ViewModel source (caller-owned — not disposed here)
  let vmi: ViewModelInstance | undefined;
  if (instanceName) {
    try {
      vmi = await source.createInstanceByNameAsync(instanceName);
    } catch (e) {
      console.warn(`createInstanceByNameAsync('${instanceName}') failed:`, e);
    }
    if (!vmi) {
      return {
        instance: null,
        needsDispose: false,
        error: `ViewModel instance '${instanceName}' not found`,
      };
    }
  } else if (useNew) {
    vmi = await source.createBlankInstanceAsync();
  } else {
    vmi = await source.createDefaultInstanceAsync();
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

  const [result, setResult] = useState<CreateInstanceResult>({
    instance: undefined,
    needsDispose: false,
  });

  useEffect(() => {
    let cancelled = false;
    let created: CreateInstanceResult | null = null;
    // Back to the loading state while the new instance resolves.
    setResult({ instance: undefined, needsDispose: false });
    createInstanceAsync(
      source,
      instanceName,
      artboardName,
      viewModelName,
      useNew
    ).then(
      (r) => {
        if (cancelled) {
          if (r.needsDispose && r.instance) callDispose(r.instance);
          return;
        }
        created = r;
        if (r.instance && onInitRef.current) {
          onInitRef.current(r.instance);
        }
        setResult(r);
      },
      (e: unknown) => {
        if (cancelled) return;
        const message = e instanceof Error ? e.message : String(e);
        setResult({ instance: null, needsDispose: false, error: message });
      }
    );
    return () => {
      cancelled = true;
      if (created?.needsDispose && created.instance) {
        callDispose(created.instance);
      }
    };
  }, [source, instanceName, artboardName, viewModelName, useNew]);

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
