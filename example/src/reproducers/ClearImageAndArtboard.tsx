import { useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import {
  Fit,
  RiveImages,
  RiveView,
  useRiveFile,
  useViewModelInstance,
  type RiveFile,
  type ViewModelArtboardProperty,
  type ViewModelImageProperty,
} from '@rive-app/react-native';
import { type Metadata } from '../shared/metadata';

const IMAGE_URL = 'https://picsum.photos/id/372/500/500';

/**
 * Clearing a data-bound image or artboard property by passing `undefined`, which returns the
 * slot to its unset state instead of overwriting it with a placeholder.
 *
 * Both new-runtime backends used to drop the undefined: the iOS image property threw
 * "Invalid image type", and the iOS artboard and Android artboard properties returned silently.
 * The "set then immediately clear" buttons cover the companion race — decoding/instantiating is
 * async, so a slow set() could land after the clear and resurrect the old value.
 *
 * Android image clearing is still a no-op: rive-android's setImage only accepts a non-null
 * ImageAsset up to 11.7.2.
 */
export default function ClearImageAndArtboard() {
  const { riveFile: imageFile, isLoading: imageLoading } = useRiveFile(
    require('../../assets/rive/many_viewmodels.riv')
  );
  const { riveFile: mainFile, isLoading: mainLoading } = useRiveFile(
    require('../../assets/swap_character_main.riv')
  );
  const { riveFile: assetsFile, isLoading: assetsLoading } = useRiveFile(
    require('../../assets/swap_character_assets.riv')
  );

  if (imageLoading || mainLoading || assetsLoading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  if (!imageFile || !mainFile || !assetsFile) {
    return (
      <View style={styles.centered}>
        <Text style={styles.error}>Failed to load Rive files</Text>
      </View>
    );
  }

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <ImageSection file={imageFile} />
      <ArtboardSection mainFile={mainFile} assetsFile={assetsFile} />
    </ScrollView>
  );
}

function ImageSection({ file }: { file: RiveFile }) {
  const { instance } = useViewModelInstance(file, { async: true });
  const [status, setStatus] = useState('idle');

  const withProperty = async (
    label: string,
    run: (property: ViewModelImageProperty) => Promise<void>
  ) => {
    const property = instance?.imageProperty('imageValue');
    if (!property) {
      setStatus('image property "imageValue" not found');
      return;
    }
    try {
      await run(property);
      setStatus(label);
    } catch (e) {
      setStatus(`threw: ${e instanceof Error ? e.message : String(e)}`);
    }
  };

  return (
    <View style={styles.section}>
      <Text style={styles.title}>Image property</Text>
      <Text style={styles.subtitle}>many_viewmodels.riv — "imageValue"</Text>

      <View style={styles.riveContainer}>
        <RiveView
          style={styles.rive}
          autoPlay
          dataBind={instance ?? undefined}
          fit={Fit.Contain}
          file={file}
        />
      </View>

      <View style={styles.buttons}>
        <Button
          label="Load image"
          onPress={() =>
            withProperty('image set', async (property) => {
              property.set(await RiveImages.loadFromURLAsync(IMAGE_URL));
            })
          }
        />
        <Button
          label="Clear"
          onPress={() =>
            withProperty('cleared', async (property) => {
              property.set(undefined);
            })
          }
        />
        <Button
          label="Set then clear"
          onPress={() =>
            withProperty('set then cleared', async (property) => {
              property.set(await RiveImages.loadFromURLAsync(IMAGE_URL));
              property.set(undefined);
            })
          }
        />
      </View>

      <Text style={styles.status}>{status}</Text>
      <Text style={styles.expected}>
        Clear returns the slot to empty. "Set then clear" must also end empty —
        the in-flight decode must not overwrite the clear. Android on the new
        runtime logs a warning and stays unchanged.
      </Text>
    </View>
  );
}

function ArtboardSection({
  mainFile,
  assetsFile,
}: {
  mainFile: RiveFile;
  assetsFile: RiveFile;
}) {
  const { instance } = useViewModelInstance(mainFile, { async: true });
  const [status, setStatus] = useState('idle');

  const withProperty = (
    label: string,
    run: (property: ViewModelArtboardProperty) => void
  ) => {
    const property = instance?.artboardProperty('CharacterArtboard');
    if (!property) {
      setStatus('artboard property "CharacterArtboard" not found');
      return;
    }
    try {
      run(property);
      setStatus(label);
    } catch (e) {
      setStatus(`threw: ${e instanceof Error ? e.message : String(e)}`);
    }
  };

  return (
    <View style={styles.section}>
      <Text style={styles.title}>Artboard property</Text>
      <Text style={styles.subtitle}>
        swap_character_main.riv — "CharacterArtboard"
      </Text>

      <View style={styles.riveContainer}>
        <RiveView
          style={styles.rive}
          autoPlay
          dataBind={instance ?? undefined}
          fit={Fit.Layout}
          file={mainFile}
          artboardName="Main"
          stateMachineName="State Machine 1"
        />
      </View>

      <View style={styles.buttons}>
        <Button
          label="Dragon"
          onPress={() =>
            withProperty('artboard set', (property) => {
              property.set(assetsFile.getBindableArtboard('Character 1'));
            })
          }
        />
        <Button
          label="Clear"
          onPress={() =>
            withProperty('cleared', (property) => {
              property.set(undefined);
            })
          }
        />
        <Button
          label="Set then clear"
          onPress={() =>
            withProperty('set then cleared', (property) => {
              property.set(assetsFile.getBindableArtboard('Character 1'));
              property.set(undefined);
            })
          }
        />
      </View>

      <Text style={styles.status}>{status}</Text>
      <Text style={styles.expected}>
        Clear removes the character and leaves the card empty. "Set then clear"
        must also end empty.
      </Text>
    </View>
  );
}

function Button({ label, onPress }: { label: string; onPress: () => void }) {
  return (
    <Pressable style={styles.button} onPress={onPress}>
      <Text style={styles.buttonText}>{label}</Text>
    </Pressable>
  );
}

ClearImageAndArtboard.metadata = {
  name: 'Clear Image / Artboard',
  description:
    'Unset data-bound image and artboard properties by passing undefined',
} satisfies Metadata;

const styles = StyleSheet.create({
  container: {
    padding: 16,
    gap: 24,
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  section: {
    gap: 8,
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  subtitle: {
    fontSize: 13,
    color: '#666',
  },
  riveContainer: {
    height: 220,
    backgroundColor: '#f2f2f2',
    borderRadius: 8,
    overflow: 'hidden',
  },
  rive: {
    flex: 1,
  },
  buttons: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  button: {
    backgroundColor: '#333',
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 6,
  },
  buttonText: {
    color: '#fff',
    fontSize: 14,
  },
  status: {
    fontSize: 14,
    fontFamily: 'Courier',
  },
  expected: {
    fontSize: 12,
    color: '#666',
  },
  error: {
    color: 'red',
  },
});
