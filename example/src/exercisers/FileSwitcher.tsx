/**
 * File Switcher Exerciser
 *
 * Rapidly switch between .riv files with different fit modes to test for
 * crashes related to dispose/render races.
 *
 * Reproduces "Should not already be working" crash seen on RN 0.83.
 */

import { useState } from 'react';
import {
  type DimensionValue,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Fit, RiveView, useRiveFile } from '@rive-app/react-native';
import { type Metadata } from '../shared/metadata';

const FILES = [
  {
    label: 'layout_test',
    source: require('../../assets/rive/layout_test.riv'),
  },
  { label: 'inputglow', source: require('../../assets/rive/inputglow.riv') },
  {
    label: 'GradientBorder',
    source: require('../../assets/rive/GradientBorder.riv'),
  },
  {
    label: 'layouts_demo',
    source: require('../../assets/rive/layouts_demo.riv'),
  },
  {
    label: 'bouncing_ball',
    source: require('../../assets/rive/bouncing_ball.riv'),
  },
  { label: 'counter', source: require('../../assets/rive/counter.riv') },
  { label: 'rating', source: require('../../assets/rive/rating.riv') },
] as const;

const FITS = [
  { label: 'Layout', value: Fit.Layout },
  { label: 'Contain', value: Fit.Contain },
  { label: 'Cover', value: Fit.Cover },
  { label: 'Fill', value: Fit.Fill },
] as const;

const SIZES = [
  { label: 'full x 150', width: '100%' as const, height: 150 },
  { label: 'full x 80', width: '100%' as const, height: 80 },
  { label: '200 x 120', width: 200, height: 120 },
];

function RiveBox({
  source,
  fit,
  height,
  width,
}: {
  source: number;
  fit: Fit;
  height: number;
  width: DimensionValue;
}) {
  const { riveFile } = useRiveFile(source);

  return (
    <View style={[styles.riveBox, { height, width }]}>
      {riveFile && (
        <RiveView file={riveFile} autoPlay fit={fit} style={{ flex: 1 }} />
      )}
    </View>
  );
}

function Chip({
  label,
  selected,
  onPress,
}: {
  label: string;
  selected: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={[styles.chip, selected && styles.chipSelected]}
    >
      <Text style={[styles.chipText, selected && styles.chipTextSelected]}>
        {label}
      </Text>
    </Pressable>
  );
}

export const metadata: Metadata = {
  name: 'File Switcher',
  description: 'Rapidly switch files/fits to test dispose/render race crashes',
};

export default function FileSwitcher() {
  const [fileIdx, setFileIdx] = useState(0);
  const [fitIdx, setFitIdx] = useState(0);

  const file = FILES[fileIdx]!;
  const fit = FITS[fitIdx]!;

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.section}>File</Text>
      <View style={styles.chips}>
        {FILES.map((f, i) => (
          <Chip
            key={f.label}
            label={f.label}
            selected={i === fileIdx}
            onPress={() => setFileIdx(i)}
          />
        ))}
      </View>

      <Text style={styles.section}>Fit</Text>
      <View style={styles.chips}>
        {FITS.map((f, i) => (
          <Chip
            key={f.label}
            label={f.label}
            selected={i === fitIdx}
            onPress={() => setFitIdx(i)}
          />
        ))}
      </View>

      <Text style={styles.section}>
        {file.label} — Fit.{fit.label}
      </Text>
      {SIZES.map((size) => (
        <View key={size.label} style={styles.item}>
          <Text style={styles.label}>{size.label}</Text>
          <RiveBox
            source={file.source}
            fit={fit.value}
            height={size.height}
            width={size.width}
          />
        </View>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0c1027',
  },
  content: {
    padding: 20,
    paddingBottom: 60,
  },
  section: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
    marginTop: 16,
    marginBottom: 8,
  },
  chips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#555',
  },
  chipSelected: {
    backgroundColor: '#4f6ef7',
    borderColor: '#4f6ef7',
  },
  chipText: {
    color: '#999',
    fontSize: 13,
  },
  chipTextSelected: {
    color: '#fff',
  },
  item: {
    marginBottom: 16,
  },
  label: {
    color: '#999',
    fontSize: 12,
    marginBottom: 4,
  },
  riveBox: {
    borderWidth: 1,
    borderColor: 'red',
  },
});
