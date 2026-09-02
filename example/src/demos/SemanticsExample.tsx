import { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { RiveView, useRiveFile, Semantics } from '@rive-app/react-native';
import type { Metadata } from '../shared/metadata';

/*
  Semantics — editor-authored accessibility exposed to VoiceOver / TalkBack.

  tabtest.riv (from rive-runtime's semantics test assets) authors a tab bar
  with roles, labels and selection state. With semantics enabled, each tab
  becomes an accessibility element: the screen reader reads them and can
  activate them. New (default) backends only; see
  https://rive.app/docs/runtimes/apple/semantics
*/

const MODES: { label: string; value: Semantics }[] = [
  { label: 'Off', value: Semantics.Off },
  { label: 'On', value: Semantics.On },
  { label: 'Automatic', value: Semantics.Automatic },
];

export default function SemanticsExample() {
  const { riveFile, error } = useRiveFile(
    require('../../assets/rive/tabtest.riv')
  );
  const [semantics, setSemantics] = useState(Semantics.On);

  if (error) {
    return (
      <View style={styles.container}>
        <Text style={styles.errorText}>{error.message}</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.subtitle}>
        With semantics On (or Automatic + a screen reader running), the tabs
        below are exposed to VoiceOver / TalkBack as selectable elements.
      </Text>
      <View style={styles.modeRow}>
        {MODES.map(({ label, value }) => (
          <TouchableOpacity
            key={label}
            testID={`semantics-${label}`}
            style={[styles.modeButton, semantics === value && styles.modeOn]}
            onPress={() => setSemantics(value)}
          >
            <Text
              style={[
                styles.modeLabel,
                semantics === value && styles.modeLabelOn,
              ]}
            >
              {label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
      {riveFile && (
        <RiveView
          file={riveFile}
          semantics={semantics}
          style={styles.rive}
          autoPlay={true}
        />
      )}
    </View>
  );
}

SemanticsExample.metadata = {
  name: 'Semantics (VoiceOver / TalkBack)',
  description:
    'Editor-authored accessibility semantics exposed to the screen reader (new backends)',
  order: 3,
} satisfies Metadata;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
    backgroundColor: '#fff',
  },
  subtitle: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    marginBottom: 12,
  },
  modeRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
    marginBottom: 16,
  },
  modeButton: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ccc',
  },
  modeOn: {
    backgroundColor: '#222',
    borderColor: '#222',
  },
  modeLabel: {
    fontSize: 14,
    color: '#333',
  },
  modeLabelOn: {
    color: '#fff',
  },
  rive: {
    flex: 1,
  },
  errorText: {
    color: 'red',
  },
});
