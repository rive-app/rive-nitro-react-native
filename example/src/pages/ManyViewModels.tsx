import { StyleSheet, View, Text, TouchableOpacity } from 'react-native';
import { useState, useMemo } from 'react';
import type { Metadata } from '../helpers/metadata';
import {
  DataBindMode,
  RiveView,
  useRiveFile,
  type ViewModelInstance,
} from 'react-native-rive';

type BindModeOption =
  | 'none'
  | 'auto'
  | 'red'
  | 'green'
  | 'blue'
  | 'green-instance';

type BindModeSelectorProps = {
  selectedMode: BindModeOption;
  onModeChange: (mode: BindModeOption) => void;
};

function BindModeSelector({
  selectedMode,
  onModeChange,
}: BindModeSelectorProps) {
  const modes: BindModeOption[] = [
    'none',
    'auto',
    'red',
    'green',
    'blue',
    'green-instance',
  ];

  return (
    <View style={selectorStyles.container}>
      <Text style={selectorStyles.label}>Binding Mode:</Text>
      <View style={selectorStyles.buttonRow}>
        {modes.map((mode) => (
          <TouchableOpacity
            key={mode}
            style={[
              selectorStyles.button,
              selectedMode === mode && selectorStyles.buttonActive,
            ]}
            onPress={() => onModeChange(mode)}
          >
            <Text
              style={[
                selectorStyles.buttonText,
                selectedMode === mode && selectorStyles.buttonTextActive,
              ]}
            >
              {mode === 'green-instance' ? 'green (instance)' : mode}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
}

function getDataBindValue(
  mode: BindModeOption,
  greenInstance: ViewModelInstance | null
) {
  if (mode === 'none') return DataBindMode.None;
  if (mode === 'auto') return DataBindMode.Auto;
  if (mode === 'green-instance' && greenInstance) return greenInstance;
  return { byName: mode };
}

export default function ManyViewModels() {
  const { riveFile } = useRiveFile(
    require('../../assets/rive/many_viewmodels.riv')
  );
  const [bindMode, setBindMode] = useState<BindModeOption>('none');

  // Create a ViewModelInstance for "green" to demonstrate instance binding
  const greenInstance = useMemo(() => {
    if (!riveFile) return null;
    try {
      const viewModel = riveFile.defaultArtboardViewModel();
      if (!viewModel) return null;
      return viewModel.createInstanceByName('green');
    } catch (e) {
      console.error('Failed to create green instance:', e);
      return null;
    }
  }, [riveFile]);

  const dataBindValue = getDataBindValue(bindMode, greenInstance);

  return (
    <View style={styles.container}>
      <BindModeSelector selectedMode={bindMode} onModeChange={setBindMode} />
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

ManyViewModels.metadata = {
  name: 'Select View Model',
  description:
    'Interactive data binding mode selector (none, auto, byName, and instance)',
} satisfies Metadata;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  rive: {
    flex: 1,
    width: '100%',
    height: '100%',
  },
});

const selectorStyles = StyleSheet.create({
  container: {
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
});
