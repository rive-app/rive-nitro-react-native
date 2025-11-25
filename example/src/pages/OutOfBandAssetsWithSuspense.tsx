import * as React from 'react';
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import {
  Fit,
  useRiveFile,
  RiveView,
  RiveImages,
  type RiveImage,
} from '@rive-app/react-native';
import { Picker } from '@react-native-picker/picker';
import { type Metadata } from '../helpers/metadata';

const delay = 1000;

const ImageURL1 = `https://picsum.photos/id/372/500/500` as const;
const ImageURL2 = `https://picsum.photos/id/373/500/500` as const;
const ImageURLSlow =
  `https://app.requestly.io/delay/${delay}/https://picsum.photos/id/374/500/500` as const;

type ImageURLS = typeof ImageURL1 | typeof ImageURL2 | typeof ImageURLSlow;

const imagePromises = new Map<string, Promise<RiveImage>>();

function getImagePromise(url: string): Promise<RiveImage> {
  if (!imagePromises.has(url)) {
    imagePromises.set(url, RiveImages.loadFromURLAsync(url));
  }
  return imagePromises.get(url)!;
}

function RiveContent({ imageUrl }: { imageUrl: ImageURLS }) {
  const riveImage = React.use(getImagePromise(imageUrl));

  const { riveFile, isLoading, error } = useRiveFile(
    require('../../assets/rive/out_of_band.riv'),
    {
      referencedAssets: {
        'Inter-594377': {
          source: require('../../assets/fonts/Inter-594377.ttf'),
        },
        'referenced-image-2929282': riveImage,
        'referenced_audio-2929340': {
          source: require('../../assets/audio/referenced_audio-2929340.wav'),
        },
      },
    }
  );

  if (isLoading) {
    return <ActivityIndicator />;
  } else if (error != null) {
    return (
      <View style={styles.safeAreaViewContainer}>
        <Text>Error loading Rive file: {error}</Text>
      </View>
    );
  }

  return (
    <RiveView
      file={riveFile}
      fit={Fit.Contain}
      style={styles.rive}
      stateMachineName="State Machine 1"
      artboardName="Artboard"
    />
  );
}

export default function OutOfBandAssetsWithSuspenseExample() {
  const [uri, setUri] = React.useState<ImageURLS>(ImageURL1);

  return (
    <View style={styles.safeAreaViewContainer}>
      <React.Suspense
        fallback={
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" />
            <Text style={styles.loadingText}>Loading image...</Text>
          </View>
        }
      >
        <RiveContent imageUrl={uri} />
      </React.Suspense>

      <ScrollView contentContainerStyle={styles.container}>
        <View style={styles.pickersWrapper}>
          <Text style={styles.description}>
            This example uses React Suspense and RiveImages.loadFromURLAsync to
            load images on demand.
          </Text>
          <View style={styles.pickerWrapper}>
            <Picker
              selectedValue={uri}
              onValueChange={(value) => setUri(value)}
              mode={'dropdown'}
              style={styles.picker}
            >
              {[ImageURL1, ImageURL2, ImageURLSlow].map((key) => (
                <Picker.Item key={key} value={key} label={key} />
              ))}
            </Picker>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  safeAreaViewContainer: {
    flex: 1,
  },
  container: {
    flexGrow: 1,
    alignItems: 'center',
    justifyContent: 'flex-start',
  },
  rive: {
    width: '100%',
    height: 400,
  },
  picker: {
    flex: 1,
    width: '100%',
  },
  pickerWrapper: {
    borderWidth: 1,
    borderColor: 'black',
    borderRadius: 5,
    alignItems: 'center',
    margin: 16,
  },
  pickersWrapper: {
    flex: 1,
    padding: 16,
    alignSelf: 'stretch',
  },
  loadingContainer: {
    width: '100%',
    height: 400,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#666',
  },
  description: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8,
    paddingHorizontal: 16,
  },
});

OutOfBandAssetsWithSuspenseExample.metadata = {
  name: 'Out-of-Band Assets (Suspense)',
  description:
    'Shows how to load images using RiveImages.loadFromURLAsync with React Suspense',
} satisfies Metadata;
