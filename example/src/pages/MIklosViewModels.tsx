/* eslint-disable react-native/no-inline-styles */
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useState } from 'react';
import type { Metadata } from '../helpers/metadata';
import { DataBindMode, RiveView, useRiveFile } from 'react-native-rive';

type BindModeOption = 'none' | 'auto' | 'red' | 'green' | 'blue';

function getDataBindValue(mode: BindModeOption) {
  if (mode === 'none') return DataBindMode.None;
  if (mode === 'auto') return DataBindMode.Auto;
  return { byName: mode };
}

export default function DataBindingMode() {
  const { riveFile } = useRiveFile(
    require('../../assets/rive/miklos_viewmodels.riv')
  );
  const [bindMode, setBindMode] = useState<BindModeOption>('blue');

  const dataBindValue = getDataBindValue(bindMode);

  return (
    <View style={styles.container}>
      <View style={styles.controlsContainer}>
        <Text style={styles.label}>Binding Mode:</Text>
        <View style={styles.buttonRow}>
          {(['none', 'auto', 'red', 'green', 'blue'] as BindModeOption[]).map(
            (mode) => (
              <TouchableOpacity
                key={mode}
                style={[
                  styles.button,
                  bindMode === mode && styles.buttonActive,
                ]}
                onPress={() => setBindMode(mode)}
              >
                <Text
                  style={[
                    styles.buttonText,
                    bindMode === mode && styles.buttonTextActive,
                  ]}
                >
                  {mode}
                </Text>
              </TouchableOpacity>
            )
          )}
        </View>
      </View>
      {riveFile && (
        <RiveView
          style={styles.rive}
          file={riveFile}
          dataBind={dataBindValue}
          autoPlay={true}
        />
      )}
    </View>
  );
}

DataBindingMode.metadata = {
  name: 'Miklos View Models',
  description: 'Interactive data binding mode selector (none, auto, red, green, blue)',
} satisfies Metadata;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  controlsContainer: {
    padding: 16,
    backgroundColor: '#f8f8f8',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
    color: '#333',
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 8,
    flexWrap: 'wrap',
  },
  button: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: '#fff',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#d0d0d0',
  },
  buttonActive: {
    backgroundColor: '#007AFF',
    borderColor: '#007AFF',
  },
  buttonText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#333',
    textTransform: 'capitalize',
  },
  buttonTextActive: {
    color: '#fff',
  },
  rive: {
    flex: 1,
    width: '100%',
    height: '100%',
  },
});
