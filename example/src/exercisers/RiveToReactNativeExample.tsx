import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  Pressable,
  Switch,
} from 'react-native';
import { useEffect, useMemo, useState } from 'react';
import Animated, {
  runOnUI,
  useSharedValue,
  useAnimatedStyle,
  type SharedValue,
} from 'react-native-reanimated';
import { NitroModules } from 'react-native-nitro-modules';
import {
  Fit,
  RiveView,
  useRiveFile,
  type RiveFile,
  type ViewModelInstance,
  type ViewModelNumberProperty,
} from '@rive-app/react-native';
import { type Metadata } from '../shared/metadata';

declare global {
  var __callMicrotasks: () => void;
}

/**
 * Syncs a Rive ViewModel number property to a Reanimated SharedValue.
 * @param useUIThread - If true, runs listener on UI thread (won't freeze when JS blocked).
 *                      If false, runs on JS thread (will freeze when JS blocked).
 */
function useRiveNumberListener(
  property: ViewModelNumberProperty | undefined,
  sharedValue: SharedValue<number>,
  useUIThread: boolean
) {
  useEffect(() => {
    if (!property) return;

    if (useUIThread) {
      // UI thread version - won't freeze when JS thread is blocked
      const boxedProperty = NitroModules.box(property);
      const sv = sharedValue;

      runOnUI(() => {
        'worklet';
        const prop = boxedProperty.unbox();
        prop.addListener((value: number) => {
          'worklet';
          sv.value = value;
          global.__callMicrotasks();
        });
      })();

      return () => {
        property.removeListeners();
      };
    } else {
      // JS thread version - will freeze when JS thread is blocked
      const removeListener = property.addListener((value: number) => {
        sharedValue.value = value;
      });

      return removeListener;
    }
  }, [property, sharedValue, useUIThread]);
}

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
  const [useUIThread, setUseUIThread] = useState(true);

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

  return (
    <BouncingBallTracker
      instance={instance}
      file={file}
      useUIThread={useUIThread}
      onToggle={setUseUIThread}
    />
  );
}

function BouncingBallTracker({
  instance,
  file,
  useUIThread,
  onToggle,
}: {
  instance: ViewModelInstance;
  file: RiveFile;
  useUIThread: boolean;
  onToggle: (value: boolean) => void;
}) {
  const pointerY = useSharedValue(0);

  const yposProperty = useMemo(
    () => instance.numberProperty('ypos'),
    [instance]
  );

  useRiveNumberListener(yposProperty, pointerY, useUIThread);

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
        Rive drives the ball position via data binding.{'\n'}React Native tracks
        it with the blue pointer using addListener.
      </Text>

      <View style={styles.switchContainer}>
        <Text style={styles.switchLabel}>JS Thread</Text>
        <Switch value={useUIThread} onValueChange={onToggle} />
        <Text style={styles.switchLabel}>UI Thread</Text>
      </View>

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

      <BlockJSThreadButton />
    </View>
  );
}

function BlockJSThreadButton() {
  const [isBlocking, setIsBlocking] = useState(false);

  const handlePress = () => {
    setIsBlocking(true);

    // Use setTimeout to let the state update render before blocking
    setTimeout(() => {
      const start = Date.now();
      while (Date.now() - start < 2000) {
        // Busy poll - blocks JS thread for 2 seconds
      }
      setIsBlocking(false);
    }, 50);
  };

  return (
    <Pressable
      style={[styles.blockButton, isBlocking && styles.blockButtonActive]}
      onPress={handlePress}
      disabled={isBlocking}
    >
      <Text style={styles.blockButtonText}>
        {isBlocking ? 'JS Thread Blocked...' : 'Block JS Thread (2s)'}
      </Text>
    </Pressable>
  );
}

RiveToReactNativeExample.metadata = {
  name: 'Rive → React Native',
  description:
    'Demonstrates Rive graphics driving React Native UI through data binding listeners',
  riveMarketplaceLink:
    'https://rive.app/community/files/25997-48571-demo-for-tracking-rive-property-in-react-native/',
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
  switchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    marginBottom: 10,
  },
  switchLabel: {
    fontSize: 14,
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
  blockButton: {
    backgroundColor: '#4CAF50',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
    marginTop: 20,
    alignSelf: 'center',
  },
  blockButtonActive: {
    backgroundColor: '#f44336',
  },
  blockButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
});
