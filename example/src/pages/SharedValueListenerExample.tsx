import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { type Metadata } from '../helpers/metadata';
import Animated, {
  useSharedValue,
  useAnimatedReaction,
  useAnimatedStyle,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import {
  Gesture,
  GestureDetector,
  GestureHandlerRootView,
} from 'react-native-gesture-handler';
import { useMemo } from 'react';
import { NitroModules } from 'react-native-nitro-modules';
import {
  Fit,
  RiveView,
  useRiveFile,
  type RiveFile,
  type ViewModelInstance,
  type ViewModelNumberProperty,
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
  const pressed = useSharedValue(false);
  const offset = useSharedValue(0);

  const boxedProperty = useMemo(() => {
    const posYProperty = instance.numberProperty('posY');
    if (!posYProperty) {
      return null;
    }
    return NitroModules.box(posYProperty);
  }, [instance]);

  const pan = Gesture.Pan()
    .onBegin(() => {
      pressed.value = true;
    })
    .onChange((event) => {
      offset.value = event.translationY * 3;
    })
    .onFinalize(() => {
      offset.value = withSpring(0);
      pressed.value = false;
    });

  useAnimatedReaction(
    () => offset.value,
    (value: number) => {
      'worklet';
      if (!boxedProperty) return;
      const property = boxedProperty.unbox() as ViewModelNumberProperty;
      property.value = value;
    },
    [boxedProperty]
  );

  const circleStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: offset.value / 3 }],
    backgroundColor: pressed.value ? '#FFE04B' : 'blue',
    scale: withTiming(pressed.value ? 1.2 : 1),
  }));

  return (
    <GestureHandlerRootView style={styles.container}>
      <Text style={styles.subtitle}>
        Drag the blue circle to move both circles. Release to spring back.
      </Text>

      <View style={styles.riveContainer}>
        <RiveView
          style={styles.rive}
          autoPlay={true}
          dataBind={instance}
          fit={Fit.Layout}
          layoutScaleFactor={1}
          file={file}
        />
        <GestureDetector gesture={pan}>
          <Animated.View style={[styles.blueCircle, circleStyle]} />
        </GestureDetector>
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
  subtitle: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginVertical: 20,
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
