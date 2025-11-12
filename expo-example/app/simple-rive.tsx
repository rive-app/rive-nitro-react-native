import { StyleSheet, View, ActivityIndicator } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { RiveView, Fit, useRiveFile } from 'react-native-rive';

export default function RiveScreen() {
  const { riveFile, isLoading, error } = useRiveFile(
    require('@/assets/rive/rating.riv')
  );

  return (
    <ThemedView style={styles.container}>
      <ThemedView style={styles.titleContainer}>
        <ThemedText type="title">Rive Animation</ThemedText>
      </ThemedView>

      <ThemedText style={styles.description}>
        This is a simple Rive animation rendered using react-native-rive.
      </ThemedText>

      <View style={styles.riveContainer}>
        {isLoading ? (
          <ActivityIndicator size="large" color="#0000ff" />
        ) : error ? (
          <ThemedText style={styles.errorText}>{error}</ThemedText>
        ) : riveFile ? (
          <RiveView
            style={styles.rive}
            autoPlay={true}
            fit={Fit.Contain}
            file={riveFile}
          />
        ) : null}
      </View>

      <ThemedView style={styles.infoContainer}>
        <ThemedText type="subtitle">About this example</ThemedText>
        <ThemedText style={styles.infoText}>
          This demonstrates the basic usage of react-native-rive in an Expo app.
          The animation is loaded from a local asset file and automatically
          plays.
        </ThemedText>
      </ThemedView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
  },
  titleContainer: {
    alignItems: 'center',
    marginTop: 20,
    marginBottom: 10,
  },
  description: {
    textAlign: 'center',
    marginBottom: 20,
  },
  riveContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    marginVertical: 20,
  },
  rive: {
    width: '100%',
    height: 300,
  },
  errorText: {
    color: 'red',
    textAlign: 'center',
  },
  infoContainer: {
    marginTop: 20,
    gap: 8,
  },
  infoText: {
    fontSize: 14,
    lineHeight: 20,
  },
});
