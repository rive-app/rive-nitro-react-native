import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { useState, useEffect, useRef } from 'react';
import {
  Fit,
  RiveView,
  RiveFileFactory,
  useRive,
  type RiveFile,
  type ViewModelInstance,
} from 'react-native-rive';

export default function DataBindingExample() {
  const { riveViewRef, setHybridRef } = useRive();
  const riveFileRef = useRef<RiveFile | null>(null);
  const [viewModelInstance, setViewModelInstance] =
    useState<ViewModelInstance | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    const setUpRiveView = async () => {
      try {
        const file = await RiveFileFactory.fromSource(
          require('../../assets/rive/rewards_source.riv')
        );
        if (isMounted) {
          riveFileRef.current = file;
          const viewModel = file.defaultArtboardViewModel();
          setViewModelInstance(viewModel?.createDefaultInstance() ?? null);
          setIsLoading(false);
          setError(null);
        }
      } catch (err) {
        if (isMounted) {
          setError(
            err instanceof Error ? err.message : 'Failed to load Rive file'
          );
          setIsLoading(false);
        }
      }
    };

    setUpRiveView();

    return () => {
      isMounted = false;
      if (riveFileRef.current) {
        riveFileRef.current.release();
        riveFileRef.current = null;
        setViewModelInstance(null);
      }
    };
  }, []);

  useEffect(() => {
    if (viewModelInstance) {
      riveViewRef?.bindViewModelInstance(viewModelInstance);
    }
  }, [viewModelInstance, riveViewRef]);

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Rive Data Binding Example</Text>
      <View style={styles.riveContainer}>
        {error ? (
          <Text style={styles.errorText}>{error}</Text>
        ) : isLoading ? (
          <ActivityIndicator size="large" color="#0000ff" />
        ) : (
          <RiveView
            style={styles.rive}
            autoBind={false}
            autoPlay={true}
            fit={Fit.Contain}
            file={riveFileRef.current!}
            hybridRef={setHybridRef}
          />
        )}
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
