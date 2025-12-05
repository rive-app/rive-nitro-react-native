import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { Fit, RiveView, useRive, useRiveFile } from 'react-native-rive';
import { type Metadata } from '../helpers/metadata';

/**
 * A secondary view with a Rive animation
 */
export default function EventsDetailView() {
  const { setHybridRef } = useRive();
  const { riveFile, isLoading, error } = useRiveFile(
    require('../../assets/rive/rewards.riv')
  );

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Detail View</Text>
      <Text style={styles.subtitle}>
        This is a separate view with a different Rive animation
      </Text>
      <View style={styles.riveContainer}>
        {isLoading ? (
          <ActivityIndicator size="large" color="#0000ff" />
        ) : error ? (
          <Text style={styles.errorText}>{error}</Text>
        ) : riveFile ? (
          <RiveView
            style={styles.rive}
            autoPlay={true}
            fit={Fit.Contain}
            file={riveFile}
            hybridRef={setHybridRef}
          />
        ) : null}
      </View>
      <Text style={styles.instructions}>
        Press the back button to return to the Events example
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    padding: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
    marginTop: 20,
    marginBottom: 10,
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 20,
  },
  riveContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
    borderRadius: 10,
    overflow: 'hidden',
  },
  rive: {
    width: '100%',
    height: '100%',
  },
  errorText: {
    color: 'red',
    textAlign: 'center',
    padding: 20,
  },
  instructions: {
    fontSize: 14,
    color: '#999',
    textAlign: 'center',
    marginTop: 20,
    fontStyle: 'italic',
  },
});

EventsDetailView.metadata = {
  name: 'Events Detail',
  description: 'A secondary view with a Rive animation',
} satisfies Metadata;
