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
  error?: Error;
};

// The message stays clean and stable ("… not found"); when the native call
// *rejected* the runtime error is attached as `cause` so its diagnostic is
// preserved without leaking into the message. Only some backends reject on a
// bad name (the new iOS backend throws `invalidViewModelInstance`); the
// legacy backends and Android's pre-check resolve null instead, so a missing
// `cause` is normal. See #305.
function instanceNotFoundError(instanceName: string, cause?: unknown): Error {
  return new Error(
    `ViewModel instance '${instanceName}' not found`,
    cause !== undefined ? { cause } : undefined
  );
}

// The view's auto-bound instance resolves asynchronously a short time after
// the ref is assigned and there is no native bind-complete signal to await
// yet, so a one-shot getViewModelInstance() read would settle a terminal null
// on fast mounts. Poll briefly instead; a view with no data binding resolves
// null after the timeout (late, but the correct terminal state).
const REF_BIND_POLL_MS = 50;
const REF_BIND_TIMEOUT_MS = 5000;

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function createInstanceAsync(
  source: ViewModelSource | null | undefined,
  instanceName: string | undefined,
  artboardName: string | undefined,
  viewModelName: string | undefined,
  useNew: boolean,
  isCancelled: () => boolean
): Promise<CreateInstanceResult> {
  if (!source) {
    return { instance: undefined, needsDispose: false };
  }

  if (isRiveViewRef(source)) {
    let vmi = source.getViewModelInstance();
    const deadline = Date.now() + REF_BIND_TIMEOUT_MS;
    while (!vmi && Date.now() < deadline && !isCancelled()) {
      await sleep(REF_BIND_POLL_MS);
      vmi = source.getViewModelInstance();
    }
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
          error: new Error(`ViewModel '${viewModelName}' not found`),
        };
      }
    } else {
      let artboardCause: unknown;
      try {
        viewModel = await source.defaultArtboardViewModelAsync(
          artboardName ? ArtboardByName(artboardName) : undefined
        );
      } catch (e) {
        // The new backend *throws* on an unknown artboard name (iOS
        // `createArtboard`, Android `Artboard.fromFile`) while the legacy
        // backend resolves undefined — map the rejection to the same
        // not-found error below, preserving the native diagnostic as `cause`.
        // Without a name a rejection is a real error.
        if (!artboardName) throw e;
        artboardCause = e;
        viewModel = undefined;
      }
      if (!viewModel) {
        if (artboardName) {
          return {
            instance: null,
            needsDispose: false,
            error: new Error(
              `Artboard '${artboardName}' not found or has no ViewModel`,
              artboardCause !== undefined ? { cause: artboardCause } : undefined
            ),
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
          return {
            instance: null,
            needsDispose: false,
            error: instanceNotFoundError(instanceName, e),
          };
        }
      } else {
        vmi = await viewModel.createDefaultInstanceAsync();
      }
      if (!vmi && instanceName) {
        return {
          instance: null,
          needsDispose: false,
          error: instanceNotFoundError(instanceName),
        };
      }
      return { instance: vmi ?? null, needsDispose: true };
    } finally {
      // The intermediate ViewModel wrapper is hook-internal; disposing it
      // releases the native resources it owns (e.g. the artboard resolved
      // for DefaultForArtboard sources on the new runtime).
      callDispose(viewModel);
    }
  }

  // ViewModel source (caller-owned — not disposed here)
  let vmi: ViewModelInstance | undefined;
  if (instanceName) {
    try {
      vmi = await source.createInstanceByNameAsync(instanceName);
    } catch (e) {
      return {
        instance: null,
        needsDispose: false,
        error: instanceNotFoundError(instanceName, e),
      };
    }
    if (!vmi) {
      return {
        instance: null,
        needsDispose: false,
        error: instanceNotFoundError(instanceName),
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
 * Implementation behind `useViewModelInstance(source, { async: true })` — not
 * exported publicly. Creates a ViewModelInstance using the non-deprecated
 * `*Async` runtime APIs, resolving off the JS thread.
 *
 * Because creation is asynchronous, the instance is not available on the first
 * render. Consumers should guard on the result:
 *
 * ```tsx
 * const { instance, isLoading, error } = useViewModelInstanceAsync(riveFile);
 * if (isLoading || !instance) return <ActivityIndicator />;
 * // ...
 * <RiveView file={riveFile} dataBind={instance} />
 * ```
 *
 * A `null` source resolves to a terminal `{ instance: null, isLoading: false }`
 * (not perpetual loading), while an `undefined` source keeps the hook loading.
 * This mirrors {@link useRiveFile} (`riveFile: undefined` while loading,
 * `null` on error) and `useRive` (`riveViewRef: undefined` until the view is
 * ready, `null` on failure) — so when chaining, check the upstream hook's own
 * `error`, since this hook cannot observe why the source is absent:
 *
 * ```tsx
 * const { riveFile, error: fileError } = useRiveFile(source);
 * const { instance, isLoading } = useViewModelInstanceAsync(riveFile);
 * if (fileError) return <Text>{fileError.message}</Text>;
 * if (isLoading || !instance) return <ActivityIndicator />;
 * ```
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

  // Reset to the loading state during render (not in the effect) when the
  // inputs change: an effect-time reset would let React commit one frame
  // pairing the new source with the previous (about-to-be-disposed) instance
  // at isLoading: false — a mismatch consumer guards cannot catch, and the
  // old instance would be disposed while still committed as e.g. a view's
  // dataBind. Resetting mid-render makes React re-render before committing.
  const [prevDeps, setPrevDeps] = useState<readonly unknown[]>([
    source,
    instanceName,
    artboardName,
    viewModelName,
    useNew,
  ]);
  const deps = [source, instanceName, artboardName, viewModelName, useNew];
  if (deps.some((d, i) => d !== prevDeps[i])) {
    setPrevDeps(deps);
    setResult((prev) => (prev.isLoading ? prev : LOADING_RESULT));
  }

  useEffect(() => {
    if (source === null) {
      // Source resolved to absent/failed rather than pending. `useRiveFile`
      // returns `riveFile: null` on load error (vs `undefined` while loading),
      // so settle to a terminal null instead of spinning forever — otherwise a
      // consumer keying a spinner off `isLoading` hangs with no signal. The
      // file's own `error` carries the reason.
      setResult({ instance: null, isLoading: false, error: null });
      return;
    }

    if (!source) {
      // `undefined`: not resolved yet (e.g. the file is still loading).
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
          useNew,
          () => cancelled
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
          setResult({ instance: null, isLoading: false, error: c.error });
        } else {
          // Resolved, but there is genuinely no ViewModel (not an error).
          setResult({ instance: null, isLoading: false, error: null });
        }
      } catch (e) {
        if (cancelled) return;
        setResult({
          instance: null,
          isLoading: false,
          error: e instanceof Error ? e : new Error(String(e)),
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
    // The public entry point is useViewModelInstance — don't leak this
    // internal hook's name into user-facing errors.
    if (source === null) {
      throw new Error(
        'useViewModelInstance: source is null — the file or view failed to ' +
          "resolve upstream (if it comes from useRiveFile or useRive, check that hook's error)."
      );
    }
    throw new Error(
      result.error
        ? `useViewModelInstance: ${result.error.message}`
        : 'useViewModelInstance: Failed to get ViewModelInstance. ' +
          'Ensure the source has a valid ViewModel and instance available.'
    );
  }

  return result;
}
