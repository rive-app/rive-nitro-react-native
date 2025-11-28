import * as React from 'react';
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  View,
  Button,
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

class ErrorBoundary extends React.Component<
  {
    children: React.ReactNode;
    fallback?: (error: Error, reset: () => void) => React.ReactNode;
  },
  { hasError: boolean; error: Error | null }
> {
  constructor(props: any) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('ErrorBoundary caught:', error, errorInfo);
  }

  reset = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError && this.state.error) {
      if (this.props.fallback) {
        return this.props.fallback(this.state.error, this.reset);
      }
      return (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>Something went wrong:</Text>
          <Text style={styles.errorMessage}>{this.state.error.message}</Text>
          <Button title="Try Again" onPress={this.reset} />
        </View>
      );
    }

    return this.props.children;
  }
}

const delay = 1000;

const ImageURL1 = `https://picsum.photos/id/372/500/500` as const;
const ImageURL2 = `https://picsum.photos/id/373/500/500` as const;
const ImageURLSlow =
  `https://app.requestly.io/delay/${delay}/https://picsum.photos/id/374/500/500` as const;
const ImageInvalidURL = 'not-a-valid-url' as const;

type ImageURLS =
  | typeof ImageURL1
  | typeof ImageURL2
  | typeof ImageURLSlow
  | typeof ImageInvalidURL;

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

function ErrorFallback({ error, reset }: { error: Error; reset: () => void }) {
  return (
    <View style={styles.errorContainer}>
      <Text style={styles.errorText}>Error loading image:</Text>
      <Text style={styles.errorMessage}>{error.message}</Text>
      <Button title="Try Again" onPress={reset} />
    </View>
  );
}

export default function OutOfBandAssetsWithSuspenseExample() {
  const [uri, setUri] = React.useState<ImageURLS>(ImageURL1);
  const [errorBoundaryKey, setErrorBoundaryKey] = React.useState(0);

  const handleReset = () => {
    setErrorBoundaryKey((k) => k + 1);
  };

  const renderErrorFallback = (error: Error, reset: () => void) => (
    <ErrorFallback
      error={error}
      reset={() => {
        reset();
        handleReset();
      }}
    />
  );

  return (
    <View style={styles.safeAreaViewContainer}>
      <ErrorBoundary key={errorBoundaryKey} fallback={renderErrorFallback}>
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
      </ErrorBoundary>

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
              {[ImageURL1, ImageURL2, ImageURLSlow, ImageInvalidURL].map(
                (url) => (
                  <Picker.Item key={url} value={url} label={url} />
                )
              )}
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
  errorContainer: {
    width: '100%',
    height: 400,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#ffebee',
  },
  errorText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#c62828',
    marginBottom: 8,
  },
  errorMessage: {
    fontSize: 14,
    color: '#d32f2f',
    marginBottom: 16,
    textAlign: 'center',
  },
});

OutOfBandAssetsWithSuspenseExample.metadata = {
  name: 'Out-of-Band Assets (Suspense)',
  description:
    'Shows how to load images using RiveImages.loadFromURLAsync with React Suspense',
} satisfies Metadata;
