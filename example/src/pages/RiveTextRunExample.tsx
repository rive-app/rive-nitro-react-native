import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { useEffect } from 'react';
import {
  Fit,
  RiveView,
  useRive,
  useRiveFile,
  DataBindMode,
} from 'react-native-rive';
import { type Metadata } from '../helpers/metadata';

export default function TextRunExample() {
  const { riveViewRef, setHybridRef } = useRive();
  const { riveFile, isLoading, error } = useRiveFile(
    require('../../assets/rive/hello_world_text.riv')
  );

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
            dataBind={DataBindMode.None}
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

TextRunExample.metadata = {
  name: 'Text Run',
  description:
    'Demonstrates getting and setting text run values in Rive animations',
} satisfies Metadata;
