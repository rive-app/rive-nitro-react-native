import { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Button,
  ActivityIndicator,
} from 'react-native';
import { Fit, RiveView, useRiveFile } from '@rive-app/react-native';
import { type Metadata } from '../helpers/metadata';

export default function ResponsiveLayoutsExample() {
  const { riveFile, isLoading, error } = useRiveFile(
    require('../../assets/rive/layouts_demo.riv')
  );
  const [scaleFactor, setScaleFactor] = useState(4.0);

  const increaseScale = () => setScaleFactor((prev) => prev + 0.5);
  const decreaseScale = () =>
    setScaleFactor((prev) => Math.max(0.5, prev - 0.5));

  return (
    <View style={styles.container}>
      {isLoading ? (
        <ActivityIndicator size="large" style={styles.rive} />
      ) : error ? (
        <Text style={styles.errorText}>{error}</Text>
      ) : riveFile ? (
        <RiveView
          file={riveFile}
          fit={Fit.Layout}
          layoutScaleFactor={scaleFactor}
          style={styles.rive}
          autoPlay={true}
        />
      ) : null}
      <View style={styles.controls}>
        <Text style={styles.label}>Layout Scale Factor</Text>
        <View style={styles.scaleControls}>
          <Button title="-" onPress={decreaseScale} />
          <View style={styles.scaleText}>
            <Text>{scaleFactor.toFixed(1)}x</Text>
          </View>
          <Button title="+" onPress={increaseScale} />
        </View>
      </View>
    </View>
  );
}

ResponsiveLayoutsExample.metadata = {
  name: 'Responsive Layouts',
  description: 'Interactive layout scale factor controls',
} satisfies Metadata;

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  rive: {
    width: '100%',
    flex: 1,
  },
  controls: {
    padding: 16,
    alignItems: 'center',
  },
  scaleControls: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 16,
    gap: 16,
  },
  scaleText: {
    minWidth: 50,
    alignItems: 'center',
  },
  label: {
    fontSize: 16,
    fontWeight: '500',
    marginTop: 16,
  },
  errorText: {
    color: 'red',
    textAlign: 'center',
    padding: 20,
    flex: 1,
  },
});
