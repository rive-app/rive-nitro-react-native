import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { useEffect } from 'react';
import { Fit, RiveView, useRive, useRiveFile } from 'react-native-rive';

export default function StateMachineInputsExample() {
  const { riveViewRef, setHybridRef } = useRive();
  const { riveFile, isLoading, error } = useRiveFile(
    require('../../assets/rive/rating.riv')
  );

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
