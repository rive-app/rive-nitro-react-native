import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
} from 'react-native-reanimated';
import { useEffect, useMemo } from 'react';
import {
  Fit,
  RiveView,
  useRiveFile,
  type RiveFile,
  type ViewModelInstance,
} from '@rive-app/react-native';
import { type Metadata } from '../helpers/metadata';

export default function RiveToReactNativeExample() {
  const { riveFile, isLoading, error } = useRiveFile(
    require('../../assets/rive/bouncing_ball.riv')
  );

  return (
    <View style={styles.container}>
      {isLoading ? (
        <ActivityIndicator size="large" color="#0000ff" />
      ) : riveFile ? (
        <WithViewModelSetup file={riveFile} />
      ) : (
        <Text style={styles.errorText}>{error || 'Unexpected error'}</Text>
      )}
    </View>
  );
}

function WithViewModelSetup({ file }: { file: RiveFile }) {
  const viewModel = useMemo(() => file.defaultArtboardViewModel(), [file]);
  const instance = useMemo(
    () => viewModel?.createDefaultInstance(),
    [viewModel]
  );

  if (!instance || !viewModel) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>
          {!viewModel
            ? 'No view model found.'
            : 'Failed to create view model instance'}
        </Text>
        <Text style={styles.instructionText}>
          This demo requires a Rive file (bouncing_ball.riv) with:{'\n'}
          {'\n'}• A ViewModel with a "ypos" number property{'\n'}• A bouncing
          ball animation{'\n'}• Target-to-source binding from ball Y position to
          ypos{'\n'}
          {'\n'}
          See Rive docs for data binding setup.
        </Text>
      </View>
    );
  }

  return <BouncingBallTracker instance={instance} file={file} />;
}

function BouncingBallTracker({
  instance,
  file,
}: {
  instance: ViewModelInstance;
  file: RiveFile;
}) {
  const pointerY = useSharedValue(0);

  const yposProperty = useMemo(
    () => instance.numberProperty('ypos'),
    [instance]
  );

  useEffect(() => {
    if (!yposProperty) return;

    yposProperty.addListener((value) => {
      'worklet';
      console.log('worklet:', _WORKLET, __RUNTIME_KIND);
      pointerY.value = value;
      return true;
    });

    return () => {
      yposProperty.removeListeners();
    };
  }, [yposProperty, pointerY]);

  const pointerStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: pointerY.value }],
  }));

  if (!yposProperty) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>Property "ypos" not found</Text>
        <Text style={styles.instructionText}>
          Make sure the Rive file has a "ypos" number property in its ViewModel
          with target-to-source binding from the ball&apos;s Y position.
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.subtitle}>
        Rive animation drives the ball position.{'\n'}React Native listens and
        moves the blue pointer to track it.
      </Text>
      <Text style={styles.subtitle}>
        No re-renders - using direct addListener
      </Text>

      <View style={styles.contentContainer}>
        <RiveView
          style={styles.rive}
          autoPlay={true}
          dataBind={instance}
          fit={Fit.Contain}
          file={file}
        />
        <Animated.View style={[styles.pointer, pointerStyle]}>
          <View style={styles.pointerArrow} />
          <Text style={styles.pointerText}>RN</Text>
        </Animated.View>
      </View>
    </View>
  );
}

RiveToReactNativeExample.metadata = {
  name: 'Rive → React Native',
  description:
    'Demonstrates Rive animation driving React Native UI through data binding listeners',
} satisfies Metadata;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  subtitle: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    marginVertical: 10,
    paddingHorizontal: 20,
  },
  valueText: {
    fontSize: 18,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 10,
    color: '#333',
  },
  contentContainer: {
    position: 'relative',
    height: 600,
    width: 200,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#ccc',
  },
  rive: {
    width: 100,
    height: 600,
  },
  pointer: {
    position: 'absolute',
    top: -10,
    right: 40,
    flexDirection: 'row',
    alignItems: 'center',
  },
  pointerArrow: {
    width: 0,
    height: 0,
    borderTopWidth: 10,
    borderBottomWidth: 10,
    borderRightWidth: 15,
    borderTopColor: 'transparent',
    borderBottomColor: 'transparent',
    borderRightColor: '#007AFF',
  },
  pointerText: {
    backgroundColor: '#007AFF',
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
    paddingHorizontal: 6,
    paddingVertical: 4,
    borderTopRightRadius: 4,
    borderBottomRightRadius: 4,
  },
  errorText: {
    color: 'red',
    textAlign: 'center',
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  instructionText: {
    color: '#666',
    textAlign: 'left',
    fontSize: 14,
    lineHeight: 22,
  },
});
