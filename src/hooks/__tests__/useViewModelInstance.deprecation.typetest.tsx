/**
 * Type-level pins for useViewModelInstance's overload resolution.
 *
 * This file is a lint/compile target, not a runtime suite: eslint runs it
 * with `reportUnusedDisableDirectives: 'error'` (see eslint.config.mjs), so
 * - calls that MUST resolve to a @deprecated overload carry a
 *   `eslint-disable-next-line @typescript-eslint/no-deprecated` — if the
 *   resolution ever changes, the directive becomes unused and lint fails;
 * - calls that MUST stay non-deprecated are written bare — if they ever
 *   resolve to a deprecated overload, `no-deprecated` fails directly;
 * - `@ts-expect-error` pins invalid combinations at the compiler level.
 */
import {
  useViewModelInstance,
  type UseViewModelInstanceFileParams,
  type UseViewModelInstanceRequiredResult,
  type UseViewModelInstanceResult,
} from '../useViewModelInstance';
import type { RiveFile } from '../../specs/RiveFile.nitro';
import type { ViewModel } from '../../specs/ViewModel.nitro';
import type { RiveViewRef } from '../../index';

export function useDeprecationResolutionPins(
  file: RiveFile,
  vm: ViewModel,
  ref: RiveViewRef
) {
  // ── must be DEPRECATED (directive required; unused directive = lint error)
  // eslint-disable-next-line @typescript-eslint/no-deprecated
  const bare = useViewModelInstance(file);
  // eslint-disable-next-line @typescript-eslint/no-deprecated
  const noAsync = useViewModelInstance(file, { instanceName: 'X' });
  // eslint-disable-next-line @typescript-eslint/no-deprecated
  const asyncFalse = useViewModelInstance(file, { async: false });

  const widened = { async: true }; // widens to { async: boolean }
  // eslint-disable-next-line @typescript-eslint/no-deprecated
  const fromWidened = useViewModelInstance(file, widened);

  const viaExportedType: UseViewModelInstanceFileParams = { async: true };
  // eslint-disable-next-line @typescript-eslint/no-deprecated
  const fromExportedType = useViewModelInstance(file, viaExportedType);

  // eslint-disable-next-line @typescript-eslint/no-deprecated
  const vmSource = useViewModelInstance(vm, { name: 'X' });
  // eslint-disable-next-line @typescript-eslint/no-deprecated
  const refSource = useViewModelInstance(ref);

  // ── must stay NON-deprecated (bare calls; no-deprecated fails on regress)
  const asyncFile = useViewModelInstance(file, { async: true });
  const asyncArtboard = useViewModelInstance(file, {
    async: true,
    artboardName: 'Main',
  });
  const asyncVm = useViewModelInstance(vm, { async: true, useNew: true });
  const asyncRef = useViewModelInstance(ref, { async: true });
  // The documented fix for widened params re-pins the literal at the call:
  const repinned = useViewModelInstance(file, {
    ...viaExportedType,
    async: true,
  });

  // ── required narrowing only with a literal async on a non-null source
  const req: UseViewModelInstanceRequiredResult = useViewModelInstance(file, {
    async: true,
    required: true,
  });
  // Widened params lose the narrowing (resolve to the plain deprecated
  // overload) but must still compile:
  // eslint-disable-next-line @typescript-eslint/no-deprecated
  const reqWidened: UseViewModelInstanceResult = useViewModelInstance(
    file,
    viaExportedType
  );

  // ── invalid combinations must not compile
  // @ts-expect-error artboardName and viewModelName are mutually exclusive
  const invalid = useViewModelInstance(file, {
    async: true,
    artboardName: 'A',
    viewModelName: 'B',
  });

  return {
    bare,
    noAsync,
    asyncFalse,
    fromWidened,
    fromExportedType,
    vmSource,
    refSource,
    asyncFile,
    asyncArtboard,
    asyncVm,
    asyncRef,
    repinned,
    req,
    reqWidened,
    invalid,
  };
}

// jest picks up every file under __tests__ — the real gates for this file
// are `yarn tsc` and `yarn lint` (see header).
describe('useViewModelInstance deprecation type pins', () => {
  it('is enforced by tsc and eslint, not at runtime', () => {
    expect(typeof useDeprecationResolutionPins).toBe('function');
  });
});
