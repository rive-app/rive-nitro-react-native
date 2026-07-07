import { useEffect, useRef, useState } from 'react';
import type { ViewModel, ViewModelInstance } from '../specs/ViewModel.nitro';
import type { RiveFile } from '../specs/RiveFile.nitro';
import type { RiveViewRef } from '../index';
import { callDispose } from '../core/callDispose';
import { ArtboardByName } from '../specs/ArtboardBy';
import type {
  UseViewModelInstanceFileParams,
  UseViewModelInstanceViewModelParams,
  UseViewModelInstanceRefParams,
} from './useViewModelInstance';

type ViewModelSource = ViewModel | RiveFile | RiveViewRef;

function isRiveViewRef(
  source: ViewModelSource | null | undefined
): source is RiveViewRef {
  return source != null && 'getViewModelInstance' in source;
}

function isRiveFile(
  source: ViewModelSource | null | undefined
): source is RiveFile {
  return source != null && 'defaultArtboardViewModelAsync' in source;
}

type CreateInstanceResult = {
  instance: ViewModelInstance | null | undefined;
  needsDispose: boolean;
  error?: string;
};

function errorMessage(e: unknown): string {
  return e instanceof Error ? e.message : String(e);
}

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
      // Some native backends reject on a missing artboard instead of
      // resolving undefined — map both to the same friendly error.
      try {
        viewModel = await source.defaultArtboardViewModelAsync(
          artboardName ? ArtboardByName(artboardName) : undefined
        );
      } catch (e) {
        if (!artboardName) throw e;
        return {
          instance: null,
          needsDispose: false,
          error: `Artboard '${artboardName}' not found or has no ViewModel (${errorMessage(e)})`,
        };
      }
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
    let vmi: ViewModelInstance | undefined;
    if (instanceName) {
      try {
        vmi = await viewModel.createInstanceByNameAsync(instanceName);
      } catch (e) {
        return {
          instance: null,
          needsDispose: false,
          error: `Failed to create ViewModel instance '${instanceName}': ${errorMessage(e)}`,
        };
      }
    } else {
      vmi = await viewModel.createDefaultInstanceAsync();
    }
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
    try {
      vmi = await source.createInstanceByNameAsync(instanceName);
    } catch (e) {
      return {
        instance: null,
        needsDispose: false,
        error: `Failed to create ViewModel instance '${instanceName}': ${errorMessage(e)}`,
      };
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

export type UseViewModelInstanceAsyncResult =
  | { instance: ViewModelInstance; isLoading: false; error: null }
  | { instance: null; isLoading: false; error: Error }
  | { instance: null; isLoading: false; error: null }
  | { instance: undefined; isLoading: true; error: null };

/**
 * Result of {@link useViewModelInstanceAsync} when `required: true` is set.
 * The `null` (error/absent) case is removed — instead the hook throws once the
 * instance resolves to `null`, leaving only the ready and loading states.
 */
type UseViewModelInstanceAsyncRequiredResult =
  | { instance: ViewModelInstance; isLoading: false; error: null }
  | { instance: undefined; isLoading: true; error: null };

const LOADING_RESULT: UseViewModelInstanceAsyncResult = {
  instance: undefined,
  isLoading: true,
  error: null,
};

/**
 * Async version of {@link useViewModelInstance}. Creates a ViewModelInstance
 * using the non-deprecated `*Async` runtime APIs, resolving off the JS thread.
 *
 * Because creation is asynchronous, the instance is not available on the first
 * render. Consumers should guard on the result:
 *
 * ```tsx
 * const { riveFile, error: fileError } = useRiveFile(require('./animation.riv'));
 * const { instance, isLoading, error } = useViewModelInstanceAsync(riveFile);
 * if (fileError || error) return <ErrorScreen error={fileError ?? error} />;
 * if (isLoading || !instance) return <ActivityIndicator />;
 * // ...
 * <RiveView file={riveFile} dataBind={instance} />
 * ```
 *
 * Note: while `source` is `null`/`undefined` the hook stays in the loading
 * state — it cannot tell "still loading" from "failed upstream". If the source
 * comes from {@link useRiveFile}, check that hook's `error` as above; keying a
 * spinner off this hook's `isLoading` alone would spin forever on a failed
 * file load.
 *
 * @param source - The RiveFile, ViewModel, or RiveViewRef to get an instance from
 * @param params - Configuration for which instance to retrieve
 * @returns An object with `instance`, `isLoading`, and `error` (discriminated union)
 *
 * @example
 * ```tsx
 * // From RiveFile (get default instance)
 * const { riveFile } = useRiveFile(require('./animation.riv'));
 * const { instance, isLoading } = useViewModelInstanceAsync(riveFile);
 * ```
 *
 * @example
 * ```tsx
 * // From RiveFile with specific instance name
 * const { instance } = useViewModelInstanceAsync(riveFile, { instanceName: 'PersonInstance' });
 * ```
 *
 * @example
 * ```tsx
 * // From RiveFile with specific ViewModel name
 * const { instance } = useViewModelInstanceAsync(riveFile, { viewModelName: 'Settings' });
 * ```
 *
 * @example
 * ```tsx
 * // Create a new blank instance from ViewModel
 * const viewModel = await file.viewModelByNameAsync('TodoItem');
 * const { instance } = useViewModelInstanceAsync(viewModel, { useNew: true });
 * ```
 *
 * @example
 * ```tsx
 * // With required: true (throws once resolved to null, use with Error Boundary).
 * // Note: instance is still `undefined` while loading — guard on isLoading.
 * const { instance, isLoading } = useViewModelInstanceAsync(riveFile, { required: true });
 * ```
 *
 * @example
 * ```tsx
 * // With onInit to set initial values before the instance is exposed or bound
 * const { instance } = useViewModelInstanceAsync(riveFile, {
 *   onInit: (vmi) => {
 *     vmi.numberProperty('count')?.set(initialCount);
 *   }
 * });
 * ```
 */
// RiveFile overloads
export function useViewModelInstanceAsync(
  source: RiveFile,
  params: UseViewModelInstanceFileParams & { required: true }
): UseViewModelInstanceAsyncRequiredResult;
export function useViewModelInstanceAsync(
  source: RiveFile | null | undefined,
  params?: UseViewModelInstanceFileParams
): UseViewModelInstanceAsyncResult;

// ViewModel overloads
export function useViewModelInstanceAsync(
  source: ViewModel,
  params: UseViewModelInstanceViewModelParams & { required: true }
): UseViewModelInstanceAsyncRequiredResult;
export function useViewModelInstanceAsync(
  source: ViewModel | null | undefined,
  params?: UseViewModelInstanceViewModelParams
): UseViewModelInstanceAsyncResult;

// RiveViewRef overloads
export function useViewModelInstanceAsync(
  source: RiveViewRef,
  params: UseViewModelInstanceRefParams & { required: true }
): UseViewModelInstanceAsyncRequiredResult;
export function useViewModelInstanceAsync(
  source: RiveViewRef | null | undefined,
  params?: UseViewModelInstanceRefParams
): UseViewModelInstanceAsyncResult;

// Implementation
export function useViewModelInstanceAsync(
  source: ViewModelSource | null | undefined,
  params?:
    | UseViewModelInstanceFileParams
    | UseViewModelInstanceViewModelParams
    | UseViewModelInstanceRefParams
): UseViewModelInstanceAsyncResult {
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

  const [result, setResult] =
    useState<UseViewModelInstanceAsyncResult>(LOADING_RESULT);

  useEffect(() => {
    // Reset to the loading state whenever the inputs change so we never expose a
    // stale (and about-to-be-disposed) instance from a previous resolution.
    setResult((prev) => (prev.isLoading ? prev : LOADING_RESULT));

    if (!source) {
      return;
    }

    let cancelled = false;
    let created: CreateInstanceResult | null = null;

    (async () => {
      try {
        const c = await createInstanceAsync(
          source,
          instanceName,
          artboardName,
          viewModelName,
          useNew
        );
        created = c;

        if (cancelled) {
          if (c.needsDispose && c.instance) callDispose(c.instance);
          return;
        }

        if (c.instance) {
          try {
            onInitRef.current?.(c.instance);
          } catch (e) {
            created = null;
            if (c.needsDispose) callDispose(c.instance);
            setResult({
              instance: null,
              isLoading: false,
              error: e instanceof Error ? e : new Error(String(e)),
            });
            return;
          }
          setResult({ instance: c.instance, isLoading: false, error: null });
        } else if (c.error) {
          setResult({
            instance: null,
            isLoading: false,
            error: new Error(c.error),
          });
        } else {
          // Resolved, but there is genuinely no ViewModel (not an error).
          setResult({ instance: null, isLoading: false, error: null });
        }
      } catch (e) {
        if (cancelled) return;
        setResult({
          instance: null,
          isLoading: false,
          error:
            e instanceof Error
              ? e
              : new Error('Failed to create ViewModel instance'),
        });
      }
    })();

    return () => {
      cancelled = true;
      if (created?.needsDispose && created.instance) {
        callDispose(created.instance);
      }
    };
  }, [source, instanceName, artboardName, viewModelName, useNew]);

  if (required && result.instance === null && !result.isLoading) {
    throw new Error(
      result.error
        ? `useViewModelInstanceAsync: ${result.error.message}`
        : 'useViewModelInstanceAsync: Failed to get ViewModelInstance. ' +
            'Ensure the source has a valid ViewModel and instance available.'
    );
  }

  return result;
}
