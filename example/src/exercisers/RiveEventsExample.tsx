import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { useState, useEffect } from 'react';
import {
  Fit,
  RiveView,
  useRive,
  useRiveFile,
  type RiveEvent,
  RiveEventType,
} from '@rive-app/react-native';
import { type Metadata } from '../shared/metadata';

/**
 * @deprecated Rive events at runtime is deprecated. Use data binding instead.
 *
 * See https://rive.app/docs/runtimes/data-binding
 *
 * Demonstrates getting and handling Rive events
 */
export default function EventsExample() {
  const { riveViewRef, setHybridRef } = useRive();
  const { riveFile, isLoading, error } = useRiveFile(
    require('../../assets/rive/rating.riv')
  );
  const [lastEvent, setLastEvent] = useState<RiveEvent | null>(null);

  const handleRiveEvent = (event: any) => {
    console.log('Rive Event:', event);
    if (event.type === RiveEventType.General) {
      setLastEvent(event);
    }
  };

  // Add event listener when the ref is available
  useEffect(() => {
    if (riveViewRef) {
      riveViewRef.onEventListener(handleRiveEvent);
    }
    return () => {
      if (riveViewRef) {
        riveViewRef.removeEventListeners();
      }
    };
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
            autoPlay={true}
            fit={Fit.Contain}
            file={riveFile}
            hybridRef={setHybridRef}
          />
        ) : null}
      </View>
      {lastEvent && (
        <View style={styles.eventInfo}>
          <Text style={styles.eventTitle}>Last Event:</Text>
          <Text>Name: {lastEvent.name}</Text>
          <Text>
            Type:{' '}
            {lastEvent.type === RiveEventType.General
              ? 'General Event'
              : 'Open URL Event'}
          </Text>
          {lastEvent.type === RiveEventType.OpenUrl && lastEvent.url && (
            <Text>URL: {lastEvent.url}</Text>
          )}
          {lastEvent.type === RiveEventType.OpenUrl && lastEvent.target && (
            <Text>Target: {lastEvent.target}</Text>
          )}
          {lastEvent.properties &&
            Object.keys(lastEvent.properties).length > 0 && (
              <>
                <Text style={styles.propertiesTitle}>Properties:</Text>
                {Object.entries(lastEvent.properties).map(([key, value]) => (
                  <Text key={key}>
                    {key}: {String(value)}
                  </Text>
                ))}
              </>
            )}
        </View>
      )}
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
  eventInfo: {
    marginTop: 20,
    padding: 15,
    backgroundColor: '#f0f0f0',
    borderRadius: 8,
  },
  eventTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  propertiesTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginTop: 10,
    marginBottom: 5,
  },
});

EventsExample.metadata = {
  name: 'Events',
  description: 'Demonstrates how to listen to and handle Rive events',
} satisfies Metadata;
