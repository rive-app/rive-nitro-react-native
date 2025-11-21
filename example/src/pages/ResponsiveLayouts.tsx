import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { Fit, RiveView, useRiveFile } from '@rive-app/react-native';
import { type Metadata } from '../helpers/metadata';

/**
 * Demonstrates responsive layouts using Fit.Layout and layoutScaleFactor
 *
 * See https://rive.app/docs/runtimes/layout
 */
export default function ResponsiveLayoutsExample() {
  const { riveFile, isLoading, error } = useRiveFile(
    require('../../assets/rive/layouts_demo.riv')
  );

  return (
    <View style={styles.container}>
      {isLoading ? (
        <ActivityIndicator size="large" color="#0000ff" />
      ) : error ? (
        <Text style={styles.errorText}>{error}</Text>
      ) : riveFile ? (
        <RiveView
          file={riveFile}
          fit={Fit.Layout}
          layoutScaleFactor={1} // adjust the layout scale factor to control the layout scale
          style={styles.rive}
        />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  // Adjust the container size and the layout will adjust based on the .riv file layout rules
  container: {
    width: '100%',
    height: '100%',
  },
  rive: {
    justifyContent: 'center',
    alignItems: 'center',
    width: '100%',
    height: '100%',
  },
  errorText: {
    color: 'red',
    textAlign: 'center',
    padding: 20,
  },
});

ResponsiveLayoutsExample.metadata = {
  name: 'Responsive Layouts',
  description: 'Sample .riv file with responsive layouts',
} satisfies Metadata;
