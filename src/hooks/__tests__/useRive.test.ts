import { renderHook } from '@testing-library/react-native';
import { useRive } from '../useRive';

describe('useRive', () => {
  it('exposes an undefined (pending) riveViewRef before the view is ready, not null', () => {
    // `undefined` = pending, `null` = failed — the useRiveFile convention.
    // A null here would make useViewModelInstance({async: true})(riveViewRef) settle to
    // a terminal "no ViewModel" during normal mount (and throw with
    // `required: true`) before the view has even attached.
    const { result } = renderHook(() => useRive());
    expect(result.current.riveViewRef).toBeUndefined();
  });
});
