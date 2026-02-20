import { Text, View, StyleSheet, TouchableOpacity, Platform } from 'react-native';
import { RiveRuntime } from '@rive-app/react-native';
import { useState } from 'react';
import { type Metadata } from '../shared/metadata';

export default function RiveRuntimeExample() {
  const [status, setStatus] = useState(RiveRuntime.getStatus);
  const [initializing, setInitializing] = useState(false);

  const refresh = () => setStatus(RiveRuntime.getStatus());

  const handleInitialize = async () => {
    setInitializing(true);
    try {
      await RiveRuntime.initialize();
    } catch (e) {
      console.error('RiveRuntime.initialize() failed:', e);
    } finally {
      setInitializing(false);
      refresh();
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>RiveRuntime Status</Text>

      <View style={styles.card}>
        <Row label="Platform" value={Platform.OS} />
        <Row
          label="Initialized"
          value={status.isInitialized ? 'Yes' : 'No'}
          color={status.isInitialized ? '#2e7d32' : '#c62828'}
        />
        {status.error && <Row label="Error" value={status.error} color="#c62828" />}
      </View>

      <Text style={styles.hint}>
        {Platform.OS === 'android'
          ? 'Set Rive_RiveRuntimeAndroidSkipSetup=true in gradle.properties to test manual init.'
          : 'iOS always reports initialized (no Rive.init() needed).'}
      </Text>

      <View style={styles.buttons}>
        <TouchableOpacity style={styles.button} onPress={refresh}>
          <Text style={styles.buttonText}>Refresh Status</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.button, styles.initButton]}
          onPress={handleInitialize}
          disabled={initializing}
        >
          <Text style={styles.buttonText}>
            {initializing ? 'Initializing...' : 'Manual Initialize'}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

function Row({
  label,
  value,
  color,
}: {
  label: string;
  value: string;
  color?: string;
}) {
  return (
    <View style={styles.row}>
      <Text style={styles.label}>{label}</Text>
      <Text style={[styles.value, color ? { color } : undefined]}>{value}</Text>
    </View>
  );
}

RiveRuntimeExample.metadata = {
  name: 'Runtime Init',
  description:
    'Shows RiveRuntime initialization status and allows manual init. Useful for testing init failure handling on Android.',
} satisfies Metadata;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    padding: 20,
  },
  title: {
    fontSize: 22,
    fontWeight: 'bold',
    textAlign: 'center',
    marginTop: 20,
    marginBottom: 20,
  },
  card: {
    backgroundColor: '#f5f5f5',
    borderRadius: 12,
    padding: 16,
    gap: 12,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  label: {
    fontSize: 16,
    color: '#666',
  },
  value: {
    fontSize: 16,
    fontWeight: '600',
  },
  hint: {
    fontSize: 13,
    color: '#999',
    textAlign: 'center',
    marginTop: 16,
    marginHorizontal: 10,
  },
  buttons: {
    marginTop: 30,
    gap: 12,
  },
  button: {
    backgroundColor: '#007AFF',
    borderRadius: 10,
    padding: 14,
    alignItems: 'center',
  },
  initButton: {
    backgroundColor: '#FF9500',
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});
