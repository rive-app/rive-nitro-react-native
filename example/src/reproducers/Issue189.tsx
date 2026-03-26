/**
 * Reproducer for https://github.com/rive-app/rive-nitro-react-native/issues/189
 *
 * [Android] Rive files that have ViewModels but no default ViewModel for the
 * artboard freeze when dataBind is not explicitly set (defaults to Auto).
 *
 * Root cause: in Auto mode Android checks viewModelCount > 0 and passes
 * autoBind=true to setRiveFile. The Rive SDK then throws
 * "No default ViewModel found for artboard" when the artboard has no default
 * ViewModel assigned, which freezes the animation.
 *
 * Fix: don't use SDK-level autoBind for Auto mode. Let bindToStateMachine
 * handle it — it already catches ViewModelException gracefully.
 *
 * Marketplace: https://rive.app/community/files/27026-50856-no-default-vm-for-artboard/
 *
 * Expected: bouncing animation plays on both platforms
 * Actual (Android, unfixed): animation freezes, ViewModelInstanceNotFound error
 */

import { View, StyleSheet, Text } from 'react-native';
import { RiveView, useRiveFile } from '@rive-app/react-native';
import { type Metadata } from '../shared/metadata';

export default function Issue189Page() {
  const { riveFile, error } = useRiveFile(
    require('../../assets/rive/nodefaultbouncing.riv')
  );

  return (
    <View style={styles.container}>
      {error != null && (
        <Text style={styles.errorText}>Error: {String(error)}</Text>
      )}
      {riveFile && (
        <RiveView
          file={riveFile}
          autoPlay={true}
          // No dataBind prop — defaults to Auto. On Android (unfixed) this
          // triggers "No default ViewModel found for artboard" and freezes.
          style={styles.rive}
        />
      )}
    </View>
  );
}

Issue189Page.metadata = {
  name: 'Issue #189',
  description:
    '[Android] Animation with ViewModels but no artboard default freezes in Auto dataBind mode',
} satisfies Metadata;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  errorText: {
    color: 'red',
    textAlign: 'center',
    padding: 8,
  },
  rive: {
    flex: 1,
    width: '100%',
  },
});
