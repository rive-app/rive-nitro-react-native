import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { useState, useEffect } from 'react';
import {
  Fit,
  RiveView,
  RiveFileFactory,
  useRive,
  type RiveFile,
} from 'react-native-rive';

export default function TextRunExample() {
  const { riveViewRef, setHybridRef } = useRive();
  const [riveFile, setRiveFile] = useState<RiveFile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let currentFile: RiveFile | null = null;

    const loadRiveFile = async () => {
      try {
        const file = await RiveFileFactory.fromSource(
          require('../../assets/rive/hello_world_text.riv')
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
        console.log(riveViewRef.getTextRunValue('name'));
        riveViewRef.setTextRunValue('name', 'React Native');
        console.log(riveViewRef.getTextRunValue('name'));
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
