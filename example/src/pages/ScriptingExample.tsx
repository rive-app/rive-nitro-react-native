/*
  Rive React Native Scripting Example

  Resources:
  - Rive Scripting: https://rive.app/docs/scripting
*/

import { View, StyleSheet } from 'react-native';
import { RiveView, useRiveFile, DataBindMode } from '@rive-app/react-native';
import type { Metadata } from '../helpers/metadata';

export default function ScriptingExample() {
  const { riveFile } = useRiveFile(require('../../assets/rive/blinko.riv'));

  return (
    <View style={styles.container}>
      {riveFile && (
        <RiveView
          file={riveFile}
          style={styles.rive}
          dataBind={DataBindMode.Auto}
        />
      )}
    </View>
  );
}

ScriptingExample.metadata = {
  name: 'Scripting',
  description: 'A .riv file using Rive Scripting',
} satisfies Metadata;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rive: {
    width: '100%',
    height: '100%',
  },
});
