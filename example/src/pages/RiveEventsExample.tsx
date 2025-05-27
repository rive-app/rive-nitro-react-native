import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { useState, useEffect } from 'react';
import {
  Fit,
  RiveView,
  RiveFileFactory,
  useRive,
  type RiveFile,
  RiveEventType,
  type RiveEvent,
} from 'react-native-rive';

export default function EventsExample() {
  const { riveViewRef, setHybridRef } = useRive();
  const [riveFile, setRiveFile] = useState<RiveFile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastEvent, setLastEvent] = useState<RiveEvent | null>(null);

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
            autoBind={false}
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
          {lastEvent.url && <Text>URL: {lastEvent.url}</Text>}
          {lastEvent.target && <Text>Target: {lastEvent.target}</Text>}
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
