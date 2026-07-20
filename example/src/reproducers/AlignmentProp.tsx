import { View, Text, StyleSheet } from 'react-native';
import { RiveView, useRiveFile, Fit, Alignment } from '@rive-app/react-native';
import { type Metadata } from '../shared/metadata';

/**
 * Reproducer for review finding H8 (Android experimental backend).
 *
 * The alignment prop is converted but never wired into the draw call, so
 * everything renders center-aligned.
 *
 * Each wide box below uses Fit.Contain, which leaves horizontal slack.
 * Broken: all three animations sit in the middle of their box.
 * Fixed: they sit left / center / right as labelled.
 */

function Cell({ alignment, label }: { alignment: Alignment; label: string }) {
  const { riveFile } = useRiveFile(
    require('../../assets/rive/quick_start.riv')
  );
  return (
    <View style={styles.cellOuter}>
      <Text style={styles.cellLabel}>{label}</Text>
      <View style={styles.cell}>
        {riveFile && (
          <RiveView
            file={riveFile}
            fit={Fit.Contain}
            alignment={alignment}
            style={styles.rive}
            autoPlay={true}
          />
        )}
      </View>
    </View>
  );
}

export default function AlignmentProp() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Alignment Prop</Text>
      <Text style={styles.subtitle}>
        Content must sit left / center / right in its box (Fit.Contain in a wide
        container)
      </Text>
      <Cell alignment={Alignment.CenterLeft} label="centerLeft" />
      <Cell alignment={Alignment.Center} label="center" />
      <Cell alignment={Alignment.CenterRight} label="centerRight" />
    </View>
  );
}

AlignmentProp.metadata = {
  name: 'Alignment Prop',
  description:
    'Experimental backend: the alignment prop must affect where content renders',
} satisfies Metadata;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
    backgroundColor: '#fff',
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    marginBottom: 16,
  },
  cellOuter: {
    marginBottom: 12,
  },
  cellLabel: {
    fontSize: 13,
    color: '#333',
    marginBottom: 4,
  },
  cell: {
    height: 140,
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 8,
    overflow: 'hidden',
    backgroundColor: '#f5f5f5',
  },
  rive: {
    flex: 1,
  },
});
