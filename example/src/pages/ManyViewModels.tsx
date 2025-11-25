import { StyleSheet, View, Text, TouchableOpacity, Button } from 'react-native';
import { useState, useMemo, useRef } from 'react';
import { hybridRef } from 'react-native-nitro-modules';
import type { Metadata } from '../helpers/metadata';
import {
  DataBindMode,
  RiveView,
  useRiveFile,
  type ViewModelInstance,
  RiveImages,
  type RiveViewRef,
} from '@rive-app/react-native';

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
  greenInstance: ViewModelInstance | undefined
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
  const [isLoadingImage, setIsLoadingImage] = useState(false);
  const [imageError, setImageError] = useState<string | null>(null);
  const riveViewRef = useRef<RiveViewRef>(undefined);

  // Create a ViewModelInstance for "green" to demonstrate instance binding
  const greenInstance = useMemo(() => {
    if (!riveFile) return undefined;
    try {
      const viewModel = riveFile.defaultArtboardViewModel();
      if (!viewModel) return undefined;
      return viewModel.createInstanceByName('green');
    } catch (e) {
      console.error('Failed to create green instance:', e);
      return undefined;
    }
  }, [riveFile]);

  const handleLoadImage = async () => {
    if (!riveViewRef.current) return;

    setIsLoadingImage(true);
    setImageError(null);
    try {
      const viewModelInstance = riveViewRef.current.getViewModelInstance();
      if (!viewModelInstance) {
        setImageError('No view model instance found in view');
        return;
      }

      const imgProp = viewModelInstance.imageProperty('imageValue');
      if (!imgProp) {
        setImageError('Image property "imageValue" not found');
        return;
      }

      const riveImage = await RiveImages.loadFromURLAsync(
        'https://picsum.photos/id/372/500/500'
      );
      imgProp.set(riveImage);
      riveViewRef.current.play();

      imgProp.addListener(() => {
        console.log('Image property changed!');
      });

      console.log('Image loaded and set successfully');
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Unknown error';
      setImageError(errorMsg);
      console.error('Failed to load image:', errorMsg);
    } finally {
      setIsLoadingImage(false);
    }
  };

  const dataBindValue = getDataBindValue(bindMode, greenInstance);

  return (
    <View style={styles.container}>
      <BindModeSelector selectedMode={bindMode} onModeChange={setBindMode} />
      <View style={styles.imageButtonContainer}>
        <Button
          title={isLoadingImage ? 'Loading Image...' : 'Load Test Image'}
          onPress={handleLoadImage}
          disabled={isLoadingImage || !riveFile}
        />
        {imageError && <Text style={styles.errorText}>{imageError}</Text>}
      </View>
      {riveFile && (
        <RiveView
          hybridRef={{ f: (ref) => (riveViewRef.current = ref) }}
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
  imageButtonContainer: {
    padding: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  errorText: {
    color: 'red',
    marginTop: 8,
    fontSize: 12,
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
