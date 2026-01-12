import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  Pressable,
} from 'react-native';
import { useState, useMemo, useEffect, useRef } from 'react';
import {
  Fit,
  RiveView,
  useRiveFile,
  type RiveFile,
  type BindableArtboard,
} from '@rive-app/react-native';
import { type Metadata } from '../shared/metadata';

/**
 * Data Binding Artboards Example
 *
 * Demonstrates swapping artboards at runtime using data binding.
 * The main Rive file includes a view model with a property of type `Artboard`
 * called "CharacterArtboard". This property can be set to any artboard from
 * either the main file or an external file.
 *
 * Marketplace:
 * - Main: https://rive.app/marketplace/24641-46042-data-binding-artboards/
 * - Assets: https://rive.app/marketplace/24642-47536-data-binding-artboards/
 *
 * Docs: https://rive.app/docs/runtimes/data-binding#artboards
 */

export default function DataBindingArtboardsExample() {
  // Main scene file - contains the Card view model with CharacterArtboard property
  const {
    riveFile: mainFile,
    isLoading: mainLoading,
    error: mainError,
  } = useRiveFile(require('../../assets/swap_character_main.riv'));

  // Assets file - contains "Character 1" and "Character 2" artboards
  const {
    riveFile: assetsFile,
    isLoading: assetsLoading,
    error: assetsError,
  } = useRiveFile(require('../../assets/swap_character_assets.riv'));

  const isLoading = mainLoading || assetsLoading;
  const error = mainError || assetsError;

  if (isLoading) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color="#0000ff" />
        <Text style={styles.loadingText}>Loading Rive files...</Text>
      </View>
    );
  }

  if (error || !mainFile || !assetsFile) {
    return (
      <View style={styles.container}>
        <Text style={styles.errorText}>
          {error || 'Failed to load Rive files'}
        </Text>
      </View>
    );
  }

  return <ArtboardSwapper mainFile={mainFile} assetsFile={assetsFile} />;
}

function ArtboardSwapper({
  mainFile,
  assetsFile,
}: {
  mainFile: RiveFile;
  assetsFile: RiveFile;
}) {
  // Get the view model from the "Main" artboard and create an instance
  // IMPORTANT: Must memoize to prevent creating new instance on every render
  const viewModel = useMemo(
    () => mainFile.defaultArtboardViewModel(),
    [mainFile]
  );
  const instance = useMemo(
    () => viewModel?.createDefaultInstance(),
    [viewModel]
  );
  const [currentArtboard, setCurrentArtboard] = useState<string>('Dragon');
  const initializedRef = useRef(false);

  // Set initial artboard on mount
  useEffect(() => {
    if (initializedRef.current || !instance) return;
    initializedRef.current = true;

    const artboardProp = instance.artboardProperty('CharacterArtboard');
    if (artboardProp) {
      try {
        const bindable = assetsFile.getBindableArtboard('Character 1');
        artboardProp.set(bindable);
      } catch (e) {
        console.error(`Failed to set initial artboard: ${e}`);
      }
    }
  }, [instance, assetsFile]);

  // Map display names to actual artboard names
  const artboardOptions = [
    { label: 'Dragon', artboard: 'Character 1', fromAssets: true },
    { label: 'Gator', artboard: 'Character 2', fromAssets: true },
    { label: 'Placeholder', artboard: 'Placeholder', fromAssets: false },
  ];

  const swapArtboard = (option: (typeof artboardOptions)[number]) => {
    if (!instance) return;

    const artboardProp = instance.artboardProperty('CharacterArtboard');
    if (!artboardProp) {
      console.error('Artboard property "CharacterArtboard" not found');
      return;
    }

    try {
      const sourceFile = option.fromAssets ? assetsFile : mainFile;
      const bindable: BindableArtboard = sourceFile.getBindableArtboard(
        option.artboard
      );
      artboardProp.set(bindable);
      setCurrentArtboard(option.label);
    } catch (e) {
      console.error(`Failed to swap artboard: ${e}`);
    }
  };

  if (!instance || !viewModel) {
    return (
      <View style={styles.container}>
        <Text style={styles.errorText}>
          {!viewModel
            ? 'No view model found in main file'
            : 'Failed to create instance'}
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Data Binding Artboards</Text>
      <Text style={styles.subtitle}>
        Swap artboards at runtime from different files
      </Text>

      <View style={styles.riveContainer}>
        <RiveView
          style={styles.rive}
          autoPlay={true}
          dataBind={instance}
          fit={Fit.Layout}
          layoutScaleFactor={1.0}
          file={mainFile}
          artboardName="Main"
          stateMachineName="State Machine 1"
        />
      </View>

      <View style={styles.infoContainer}>
        <Text style={styles.infoText}>Current: {currentArtboard}</Text>
      </View>

      <View style={styles.buttonContainer}>
        {artboardOptions.map((option) => (
          <Pressable
            key={option.label}
            style={[
              styles.button,
              !option.fromAssets && styles.secondaryButton,
              currentArtboard === option.label && styles.buttonActive,
            ]}
            onPress={() => swapArtboard(option)}
          >
            <Text
              style={[
                styles.buttonText,
                currentArtboard === option.label && styles.buttonTextActive,
              ]}
            >
              {option.label}
              {option.fromAssets ? ' (external)' : ' (internal)'}
            </Text>
          </Pressable>
        ))}
      </View>
    </View>
  );
}

DataBindingArtboardsExample.metadata = {
  name: 'Data Binding Artboards',
  description: 'Swap artboards at runtime using data binding properties',
} satisfies Metadata;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    padding: 16,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    marginBottom: 16,
  },
  riveContainer: {
    flex: 1,
    backgroundColor: '#f5f5f5',
    borderRadius: 8,
    overflow: 'hidden',
  },
  rive: {
    flex: 1,
  },
  infoContainer: {
    marginVertical: 12,
    padding: 12,
    backgroundColor: '#f0f0f0',
    borderRadius: 8,
  },
  infoText: {
    fontSize: 14,
    color: '#333',
    fontWeight: '600',
  },
  buttonContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  button: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: '#007AFF',
    borderRadius: 8,
  },
  secondaryButton: {
    backgroundColor: '#5856D6',
  },
  buttonActive: {
    backgroundColor: '#34C759',
  },
  buttonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
  },
  buttonTextActive: {
    color: '#fff',
  },
  loadingText: {
    marginTop: 12,
    textAlign: 'center',
    color: '#666',
  },
  errorText: {
    color: 'red',
    textAlign: 'center',
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 16,
  },
});
