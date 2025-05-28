import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { useState, useEffect } from 'react';
import {
  Fit,
  RiveView,
  RiveFileFactory,
  useRive,
  type RiveFile,
} from 'react-native-rive';

export default function StateMachineInputsExample() {
  const { riveViewRef, setHybridRef } = useRive();
  const [riveFile, setRiveFile] = useState<RiveFile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let currentFile: RiveFile | null = null;

    const loadRiveFile = async () => {
      try {
        const file = await RiveFileFactory.fromSource(
          require('../../assets/rive/rating.riv')
        );
        currentFile = file;
        setRiveFile(file);
        setIsLoading(false);
        setError(null);
      } catch (err) {
        setError(
          err instanceof Error ? err.message : 'Failed to load Rive file'
        );
        setIsLoading(false);
      }
    };

    loadRiveFile();

    // Cleanup function to release the Rive file when component unmounts
    return () => {
      if (currentFile) {
        currentFile.release();
      }
    };
  }, []);

  useEffect(() => {
    if (riveViewRef) {
      try {
        // Original value
        console.log(
          'Number value: ',
          riveViewRef.getNumberInputValue('rating')
        );
        // Set the value of the input
        riveViewRef.setNumberInputValue('rating', 3.0);
        // On Android, this will return the value of the input after it has been set the next frame
        console.log(
          'Number value: ',
          riveViewRef.getNumberInputValue('rating')
        );
        // Add a delay to allow the view controller to be ready
        setTimeout(() => {
          console.log(
            'Number value after delay: ',
            riveViewRef.getNumberInputValue('rating')
          );
        }, 16);
      } catch (err) {
        console.error(err);
      }
    }
  }, [riveViewRef]);

  return (
    <View style={styles.container}>
      <View style={styles.riveContainer}>
        {isLoading ? (
          <ActivityIndicator size="large" color="#0000ff" />
        ) : error ? (
          <Text style={styles.errorText}>{error}</Text>
        ) : riveFile ? (
          <RiveView
            style={styles.rive}
            autoBind={false}
            autoPlay={true}
            fit={Fit.Contain}
            file={riveFile}
            hybridRef={setHybridRef}
          />
        ) : null}
      </View>
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
});
