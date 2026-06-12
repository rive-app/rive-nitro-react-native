// TODO: migrate createInstance/createInstanceByName/etc to async equivalents
/* eslint-disable @typescript-eslint/no-deprecated */
import { useMemo, useRef } from 'react';
import type { ViewModel, ViewModelInstance } from '../specs/ViewModel.nitro';
import type { RiveFile } from '../specs/RiveFile.nitro';
import type { RiveFileSchema, TypedRiveFile } from '../core/TypedRiveFile';
import type { TypedViewModelInstance } from '../core/TypedViewModelInstance';
import type { RiveViewRef } from '../index';
import { callDispose } from '../core/callDispose';
import { ArtboardByName } from '../specs/ArtboardBy';
import { useDisposableMemo } from './useDisposableMemo';
import { useViewModelInstanceAsync } from './useViewModelInstanceAsync';

interface UseViewModelInstanceBaseParams {
  /**
   * Create the instance via the async runtime APIs (off the JS thread).
   * While creation is in flight the hook reports `isLoading: true` with an
   * `undefined` instance. Will become the default in the next major.
   *
   * Must stay constant for the lifetime of the component — it selects
   * between two hook implementations.
   */
  async?: boolean;
  /**
   * If true, throws an error when the instance cannot be obtained.
   * This is useful with Error Boundaries and ensures TypeScript knows
   * the return value is non-null.
   */
  required?: boolean;
  /**
   * Called when a new instance is created, before the hook exposes it —
   * synchronously during render without `async: true`, or right after the
   * instance resolves (before it is published) with `async: true`.
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
    let vmi: ViewModelInstance | undefined;
    if (instanceName) {
      try {
        vmi = viewModel.createInstanceByName(instanceName);
      } catch (e) {
        console.warn(`createInstanceByName('${instanceName}') failed:`, e);
      }
    } else {
      vmi = viewModel.createDefaultInstance();
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
      vmi = source.createInstanceByName(instanceName);
    } catch (e) {
      console.warn(`createInstanceByName('${instanceName}') failed:`, e);
    }
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
  | { instance: ViewModelInstance; isLoading: false; error: null }
  | { instance: null; isLoading: false; error: Error }
  | { instance: null; isLoading: false; error: null }
  | { instance: undefined; isLoading: true; error: null };

/**
 * Result of {@link useViewModelInstance} when `required: true` is set.
 * The `null` (error/absent) case is removed — instead the hook throws once the
 * instance resolves to `null`, leaving only the ready and loading states.
 */
export type UseViewModelInstanceRequiredResult =
  | { instance: ViewModelInstance; isLoading: false; error: null }
  | { instance: undefined; isLoading: true; error: null };

/**
 * Hook for getting a ViewModelInstance from a RiveFile, ViewModel, or RiveViewRef.
 *
 * Pass `async: true` to create the instance via the async runtime APIs,
 * resolving off the JS thread. The instance is then not available on the
 * first render — guard on the result:
 *
 * ```tsx
 * const { riveFile, error: fileError } = useRiveFile(require('./animation.riv'));
 * const { instance, isLoading, error } = useViewModelInstance(riveFile, { async: true });
 * if (fileError || error) return <ErrorScreen error={fileError ?? error} />;
 * if (isLoading || !instance) return <ActivityIndicator />;
 * // ...
 * <RiveView file={riveFile} dataBind={instance} />
 * ```
 *
 * Without `async: true` (deprecated) the instance is created synchronously
 * during render via deprecated runtime APIs that block the JS thread. The
 * async path will become the default in the next major.
 *
 * In both modes, a `null` source settles to a terminal
 * `{ instance: null, isLoading: false }` while an `undefined` source keeps
 * the hook loading. This mirrors {@link useRiveFile} (`riveFile: undefined`
 * while loading, `null` on error) and `useRive` (`riveViewRef: undefined`
 * until the view is ready, `null` on failure) — so when chaining, check the
 * upstream hook's own `error`, since this hook cannot observe why the source
 * is absent.
 *
 * @param source - The RiveFile, ViewModel, or RiveViewRef to get an instance from
 * @param params - Configuration for which instance to retrieve
 * @returns An object with `instance`, `isLoading`, and `error` (discriminated union)
 *
 * @example
 * ```tsx
 * // From RiveFile (get default instance)
 * const { riveFile } = useRiveFile(require('./animation.riv'));
 * const { instance, isLoading } = useViewModelInstance(riveFile, { async: true });
 * ```
 *
 * @example
 * ```tsx
 * // From RiveFile with specific instance name
 * const { instance } = useViewModelInstance(riveFile, { async: true, instanceName: 'PersonInstance' });
 * ```
 *
 * @example
 * ```tsx
 * // From RiveFile with specific ViewModel name
 * const { instance } = useViewModelInstance(riveFile, { async: true, viewModelName: 'Settings' });
 * ```
 *
 * @example
 * ```tsx
 * // From RiveFile with specific artboard
 * const { instance } = useViewModelInstance(riveFile, { async: true, artboardName: 'MainArtboard' });
 * ```
 *
 * @example
 * ```tsx
 * // From RiveViewRef (waits for the view's auto-bound instance)
 * const { riveViewRef, setHybridRef } = useRive();
 * const { instance } = useViewModelInstance(riveViewRef, { async: true });
 * ```
 *
 * @example
 * ```tsx
 * // Create a new blank instance from ViewModel
 * const { instance } = useViewModelInstance(viewModel, { async: true, useNew: true });
 * ```
 *
 * @example
 * ```tsx
 * // With required: true (throws once resolved to null, use with Error Boundary).
 * // Note: instance is still `undefined` while loading — guard on isLoading.
 * // The required-narrowed return type applies only when the source's TYPE is
 * // non-nullable; with a nullable source (e.g. straight from useRiveFile) the
 * // call resolves to the standard overload — the runtime throw still applies.
 * const { instance, isLoading } = useViewModelInstance(riveFile, { async: true, required: true });
 * ```
 *
 * @example
 * ```tsx
 * // With onInit to set initial values before the instance is exposed or bound
 * const { instance } = useViewModelInstance(riveFile, {
 *   async: true,
 *   onInit: (vmi) => {
 *     vmi.numberProperty('count')?.set(initialCount);
 *   }
 * });
 * ```
 */
// Typed overload: TypedRiveFile + literal viewModelName → TypedViewModelInstance
export function useViewModelInstance<
  T extends RiveFileSchema,
  N extends Extract<keyof T['viewModels'], string>,
>(
  source: TypedRiveFile<T> | null | undefined,
  params: UseViewModelInstanceFileParams & { viewModelName: N }
): {
  instance: TypedViewModelInstance<T, N> | null | undefined;
  error: Error | null;
};

// RiveFile overloads
export function useViewModelInstance(
  source: RiveFile,
  params: UseViewModelInstanceFileParams & { async: true; required: true }
): UseViewModelInstanceRequiredResult;
export function useViewModelInstance(
  source: RiveFile | null | undefined,
  params: UseViewModelInstanceFileParams & { async: true }
): UseViewModelInstanceResult;
/** @deprecated Pass `async: true` — without it the instance is created synchronously via deprecated runtime APIs that block the JS thread. `async: true` becomes the default in the next major. If your params object's `async` widened to `boolean`, re-pin it at the call site: `{ ...params, async: true }`. */
export function useViewModelInstance(
  source: RiveFile,
  params: UseViewModelInstanceFileParams & { required: true }
): UseViewModelInstanceRequiredResult;
/** @deprecated Pass `async: true` — without it the instance is created synchronously via deprecated runtime APIs that block the JS thread. `async: true` becomes the default in the next major. If your params object's `async` widened to `boolean`, re-pin it at the call site: `{ ...params, async: true }`. */
export function useViewModelInstance(
  source: RiveFile | null | undefined,
  params?: UseViewModelInstanceFileParams
): UseViewModelInstanceResult;

// ViewModel overloads
export function useViewModelInstance(
  source: ViewModel,
  params: UseViewModelInstanceViewModelParams & { async: true; required: true }
): UseViewModelInstanceRequiredResult;
export function useViewModelInstance(
  source: ViewModel | null | undefined,
  params: UseViewModelInstanceViewModelParams & { async: true }
): UseViewModelInstanceResult;
/** @deprecated Pass `async: true` — without it the instance is created synchronously via deprecated runtime APIs that block the JS thread. `async: true` becomes the default in the next major. If your params object's `async` widened to `boolean`, re-pin it at the call site: `{ ...params, async: true }`. */
export function useViewModelInstance(
  source: ViewModel,
  params: UseViewModelInstanceViewModelParams & { required: true }
): UseViewModelInstanceRequiredResult;
/** @deprecated Pass `async: true` — without it the instance is created synchronously via deprecated runtime APIs that block the JS thread. `async: true` becomes the default in the next major. If your params object's `async` widened to `boolean`, re-pin it at the call site: `{ ...params, async: true }`. */
export function useViewModelInstance(
  source: ViewModel | null | undefined,
  params?: UseViewModelInstanceViewModelParams
): UseViewModelInstanceResult;

// RiveViewRef overloads
export function useViewModelInstance(
  source: RiveViewRef,
  params: UseViewModelInstanceRefParams & { async: true; required: true }
): UseViewModelInstanceRequiredResult;
export function useViewModelInstance(
  source: RiveViewRef | null | undefined,
  params: UseViewModelInstanceRefParams & { async: true }
): UseViewModelInstanceResult;
/** @deprecated Pass `async: true` — without it the instance is created synchronously via deprecated runtime APIs that block the JS thread. `async: true` becomes the default in the next major. If your params object's `async` widened to `boolean`, re-pin it at the call site: `{ ...params, async: true }`. */
export function useViewModelInstance(
  source: RiveViewRef,
  params: UseViewModelInstanceRefParams & { required: true }
): UseViewModelInstanceRequiredResult;
/** @deprecated Pass `async: true` — without it the instance is created synchronously via deprecated runtime APIs that block the JS thread. `async: true` becomes the default in the next major. If your params object's `async` widened to `boolean`, re-pin it at the call site: `{ ...params, async: true }`. */
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
  const isAsync = params?.async ?? false;
  // The flag selects between two hook implementations (different hook
  // orders), so it must stay constant for the lifetime of the component —
  // documented on the param. React's own failure for a flip is the cryptic
  // "Rendered more hooks than during the previous render"; explain first.
  const initialAsyncRef = useRef(isAsync);
  if (initialAsyncRef.current !== isAsync) {
    console.error(
      'useViewModelInstance: the `async` param changed between renders ' +
        `(${String(initialAsyncRef.current)} → ${String(isAsync)}). It selects ` +
        'between two hook implementations, so it must stay constant for the ' +
        'lifetime of the component; remount (e.g. change `key`) to switch modes.'
    );
    initialAsyncRef.current = isAsync;
  }
  if (isAsync) {
    // eslint-disable-next-line react-hooks/rules-of-hooks
    return useViewModelInstanceAsync(
      source as RiveFile | null | undefined,
      params as UseViewModelInstanceFileParams
    );
  }
  // eslint-disable-next-line react-hooks/rules-of-hooks
  return useViewModelInstanceSync(source, params);
}

function useViewModelInstanceSync(
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

  if (result.instance === undefined && source === null) {
    // Source resolved to absent/failed rather than pending (`useRiveFile`
    // returns null on load error, undefined while loading) — settle to a
    // terminal null instead of reporting isLoading forever, mirroring the
    // async path.
    if (required) {
      throw new Error(
        'useViewModelInstance: source is null — the file or view failed to ' +
          "resolve upstream (if it comes from useRiveFile or useRive, check that hook's error)."
      );
    }
    return { instance: null, isLoading: false, error: null };
  }

  if (required && result.instance === null) {
    throw new Error(
      result.error
        ? `useViewModelInstance: ${result.error}`
        : 'useViewModelInstance: Failed to get ViewModelInstance. ' +
            'Ensure the source has a valid ViewModel and instance available.'
    );
  }

  if (result.instance) {
    return { instance: result.instance, isLoading: false, error: null };
  }
  if (result.instance === undefined) {
    // Source not resolved yet (e.g. the file is still loading).
    return { instance: undefined, isLoading: true, error: null };
  }
  return { instance: null, isLoading: false, error };
}
