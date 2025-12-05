import {
  View,
  Text,
  StyleSheet,
  Button,
  ActivityIndicator,
} from 'react-native';
import { type Metadata } from '../helpers/metadata';
import Animated, {
  useSharedValue,
  useAnimatedReaction,
  useAnimatedStyle,
  withSpring,
} from 'react-native-reanimated';
import {
  Gesture,
  GestureDetector,
  GestureHandlerRootView,
} from 'react-native-gesture-handler';
import { useCallback, useEffect, useMemo } from 'react';
import {
  NitroModules,
  type BoxedHybridObject,
} from 'react-native-nitro-modules';
import {
  Fit,
  RiveView,
  useRiveFile,
  type RiveFile,
  type RiveViewRef,
  type ViewModelInstance,
} from '@rive-app/react-native';

export default function SharedValueListenerExample() {
  const { riveFile, isLoading, error } = useRiveFile(
    require('../../assets/rive/movecircle.riv')
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
      <Text style={styles.errorText}>
        {!viewModel
          ? 'No view model found'
          : 'Failed to create view model instance'}
      </Text>
    );
  }

  return <AnimatedRiveExample instance={instance} file={file} />;
}

function AnimatedRiveExample({
  instance,
  file,
}: {
  instance: ViewModelInstance;
  file: RiveFile;
}) {
  const progress = useSharedValue(0);
  const startY = useSharedValue(0);
  const viewRef = useSharedValue<BoxedHybridObject<RiveViewRef> | null>(null);

  const boxedProperty = useMemo(() => {
    const posYProperty = instance.numberProperty('posY');
    if (!posYProperty) {
      return null;
    }
    return NitroModules.box(posYProperty);
  }, [instance]);

  useAnimatedReaction(
    () => progress.value,
    (value: number) => {
      'worklet';
      if (!boxedProperty) return;
      const property = boxedProperty.unbox();
      property.value = value;

      viewRef.value?.unbox()?.playIfNeeded();
    },
    [boxedProperty]
  );

  const panGesture = Gesture.Pan()
    .onStart(() => {
      'worklet';
      startY.value = progress.value;
    })
    .onUpdate((event) => {
      'worklet';
      progress.value = startY.value + event.translationY * 3;
    })
    .onEnd((event) => {
      'worklet';
      // Use velocity from gesture to set initial velocity of spring
      progress.value = withSpring(progress.value > 400 ? 800 : 0, {
        damping: 10,
        stiffness: 100,
        velocity: event.velocityY * 3,
      });
    });

  const circleStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: progress.value / 3 }],
  }));

  const animateTo800 = useCallback(() => {
    progress.value = withSpring(800, {
      damping: 8,
      stiffness: 80,
    });
  }, [progress]);

  const animateTo0 = () => {
    progress.value = withSpring(0, {
      damping: 8,
      stiffness: 80,
    });
  };

  useEffect(() => {
    animateTo800();
  }, [animateTo800]);

  return (
    <GestureHandlerRootView style={styles.container}>
      <Text style={styles.subtitle}>
        Drag the blue circle to control position. Release to spring with
        velocity. (Red = Rive, Blue = React Native)
      </Text>

      <View style={styles.riveContainer}>
        <RiveView
          style={styles.rive}
          autoPlay={true}
          dataBind={instance}
          fit={Fit.Layout}
          layoutScaleFactor={1}
          file={file}
          hybridRef={{
            f: (ref) => {
              viewRef.value = NitroModules.box(ref);
            },
          }}
        />
        <GestureDetector gesture={panGesture}>
          <Animated.View style={[styles.blueCircle, circleStyle]} />
        </GestureDetector>
      </View>

      <View style={styles.buttonContainer}>
        <Button title="Bounce to 800" onPress={animateTo800} />
        <Button title="Bounce to 0" onPress={animateTo0} />
      </View>
    </GestureHandlerRootView>
  );
}

SharedValueListenerExample.metadata = {
  name: 'Reanimated Shared Value',
  description: 'Drive Rive properties from Reanimated shared values',
} satisfies Metadata;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
    marginTop: 20,
    marginBottom: 10,
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 20,
    paddingHorizontal: 20,
  },
  riveContainer: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  rive: {
    flex: 1,
    width: '100%',
    height: '100%',
  },
  errorText: {
    color: 'red',
    textAlign: 'center',
    padding: 20,
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 20,
    padding: 20,
  },
  blueCircle: {
    position: 'absolute',
    left: 50,
    top: -20,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'blue',
  },
});
