import * as React from 'react';
import {
  ActivityIndicator,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import {
  /*Rive, */ Fit,
  /*RNRiveError,*/ useRiveFile,
  RiveView,
} from 'react-native-rive';
import { Picker } from '@react-native-picker/picker';
import { type Metadata } from '../helpers/metadata';

export default function StateMachine() {
  const [uri, setUri] = React.useState('https://picsum.photos/id/372/500/500');
  const { riveFile, isLoading, error } = useRiveFile(
    require('../../assets/rive/out_of_band.riv'),
    {
      referencedAssets: {
        'Inter-594377': {
          source: require('../../assets/fonts/Inter-594377.ttf'),
          // source: {
          //   fileName: 'Inter-594377.ttf',
          //   path: 'fonts', // only needed for Android assets
          // },
        },
        'referenced-image-2929282': {
          source: {
            uri: uri,
          },
          // source: {
          //   fileName: 'referenced-image-2929282.png',
          //   path: 'images', // only needed for Android assets
          // },
        },
        'referenced_audio-2929340': {
          source: require('../../assets/audio/referenced_audio-2929340.wav'),
          // source: {
          //   fileName: 'referenced_audio-2929340.wav',
          //   path: 'audio', // only needed for Android assets
          // },
        },
      },
    }
  );

  if (isLoading) {
    return <ActivityIndicator />;
  } else if (error != null) {
    return (
      <SafeAreaView style={styles.safeAreaViewContainer}>
        <Text>Error loading Rive file</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeAreaViewContainer}>
      <RiveView
        file={riveFile}
        fit={Fit.Contain}
        style={styles.animation}
        stateMachineName="State Machine 1"
        // The `referencedAssets` prop allows you to load external assets from various sources:
        // - A URI
        // - A bundled asset on the native platform (iOS and Android)
        // - A source loaded directly from JavaScript.
        //
        // This example demonstrates multiple ways to load the same asset from different locations.
        // Note: It's not necessary to store the same asset in all these locations; this is for demonstration purposes.
        //
        // The key of the map is the unique asset identifier (as exported in the Editor),
        // which combines the asset name and its unique identifier.
        // You can optionally exclude the unique identifier, for example, instead of 'Inter-594377', you can use 'Inter'.
        // However, it is recommended to use the full identifier to avoid potential conflicts.
        // Using just the asset name allows you to avoid knowing the unique identifier and gives you more control over naming.

        artboardName="Artboard"
      />
      {/*
        onError={(riveError: RNRiveError) => {
          console.log(riveError);
        }}
      */
      /* <Text>
        Load in an external asset from a URL, or bundled asset on the native
        platform, or as a source loaded directly from JavaScript.
      </Text> */}
      <ScrollView contentContainerStyle={styles.container}>
        <View style={styles.pickersWrapper}>
          <View style={styles.pickerWrapper}>
            <Picker
              selectedValue={uri}
              onValueChange={(value) => setUri(value)}
              mode={'dropdown'}
              style={styles.picker}
            >
              {[
                'https://picsum.photos/id/372/500/500',
                'https://picsum.photos/id/373/500/500',
              ].map((key) => (
                <Picker.Item key={key} value={key} label={key} />
              ))}
            </Picker>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
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
  animation: {
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
});

StateMachine.metadata = {
  name: 'Out-of-Band Assets',
  description:
    'Shows how to load referenced assets like fonts and images that are not embedded in the Rive file',
} satisfies Metadata;
