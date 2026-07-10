/**
 * tsd pins for useViewModelInstance's overload resolution (`yarn typetest`).
 *
 * - expectDeprecated: the call must resolve to a @deprecated overload
 *   (any call not provably `async: true` — bare, async: false, widened
 *   params, exported param types).
 * - expectNotDeprecated: literal `async: true` calls must stay clean.
 * - expectError pins invalid param combinations.
 * - expectType pins the `required` narrowing behavior.
 */
import {
  expectDeprecated,
  expectNotDeprecated,
  expectError,
  expectType,
  expectAssignable,
} from 'tsd';
import { useViewModelInstance } from '../index';
import type {
  UseViewModelInstanceRequiredResult,
  UseViewModelInstanceResult,
} from '../index';
import type { UseViewModelInstanceFileParams } from '../hooks/useViewModelInstance';
import type { RiveFile } from '../specs/RiveFile.nitro';
import type { ViewModel } from '../specs/ViewModel.nitro';
import type { RiveViewRef } from '../index';

declare const file: RiveFile;
declare const nullableFile: RiveFile | null | undefined;
declare const vm: ViewModel;
declare const ref: RiveViewRef;

// ── must resolve to a @deprecated overload ───────────────────────────
expectDeprecated(useViewModelInstance(file));
expectDeprecated(useViewModelInstance(nullableFile));
expectDeprecated(useViewModelInstance(file, { instanceName: 'X' }));
expectDeprecated(useViewModelInstance(file, { async: false }));
expectDeprecated(useViewModelInstance(vm, { name: 'X' }));
expectDeprecated(useViewModelInstance(ref));

// widened `async: boolean` params resolve to the deprecated overload by
// design — the deprecation message tells callers to re-pin with
// `{ ...params, async: true }`
declare const widened: { async: boolean };
expectDeprecated(useViewModelInstance(file, widened));

// values of the exported param types (async?: boolean) do too
declare const viaExportedType: UseViewModelInstanceFileParams;
expectDeprecated(useViewModelInstance(file, viaExportedType));

// ── must stay non-deprecated ─────────────────────────────────────────
expectNotDeprecated(useViewModelInstance(file, { async: true }));
expectNotDeprecated(useViewModelInstance(nullableFile, { async: true }));
expectNotDeprecated(
  useViewModelInstance(file, { async: true, artboardName: 'Main' })
);
expectNotDeprecated(
  useViewModelInstance(file, { async: true, viewModelName: 'Settings' })
);
expectNotDeprecated(useViewModelInstance(vm, { async: true, useNew: true }));
expectNotDeprecated(useViewModelInstance(ref, { async: true }));
// the documented fix for widened params re-pins the literal at the call:
expectNotDeprecated(
  useViewModelInstance(file, { ...viaExportedType, async: true })
);

// ── result types ─────────────────────────────────────────────────────
// required narrowing needs a literal async AND a non-nullable source
expectType<UseViewModelInstanceRequiredResult>(
  useViewModelInstance(file, { async: true, required: true })
);
// nullable source falls back to the standard result (runtime still throws)
expectType<UseViewModelInstanceResult>(
  useViewModelInstance(nullableFile, { async: true, required: true })
);
// widened params keep the standard result shape
expectType<UseViewModelInstanceResult>(useViewModelInstance(file, widened));
// the required result is a subset of the standard result
expectAssignable<UseViewModelInstanceResult>(
  useViewModelInstance(file, { async: true, required: true })
);

// ── invalid combinations must not compile ────────────────────────────
// artboardName and viewModelName are mutually exclusive
expectError(
  useViewModelInstance(file, {
    async: true,
    artboardName: 'A',
    viewModelName: 'B',
  })
);
// file-source params on a ViewModel source
expectError(useViewModelInstance(vm, { async: true, artboardName: 'A' }));
