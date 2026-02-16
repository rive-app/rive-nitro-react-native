import { View, StyleSheet } from 'react-native';
import { RiveView, useRiveFile, Fit } from '@rive-app/react-native';
import type { Metadata } from '../shared/metadata';

export default function ClickCount() {
  const { riveFile } = useRiveFile(
    require('../../assets/rive/click-count.riv')
  );

  return (
    <View style={styles.container}>
      {riveFile && (
        <RiveView
          file={riveFile}
          fit={Fit.Contain}
          style={styles.rive}
          autoPlay={true}
        />
      )}
    </View>
  );
}

ClickCount.metadata = {
  name: 'Click Count',
  description: 'Simple click counter to test touch handling',
  order: 0,
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
