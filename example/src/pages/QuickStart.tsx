/*
  Rive React Native Quick Start (Nitro)

  Resources:

  - Getting Started with Rive + React Native: https://rive.app/docs/runtimes/react-native/react-native
  - Data Binding: https://rive.app/docs/runtimes/data-binding
  - Setting and reading view model properties: https://rive.app/docs/runtimes/data-binding#observability
*/

import { useEffect, useState } from 'react';
import {
  Button,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
} from 'react-native';
import {
  RiveView,
  useRiveFile,
  useRiveNumber,
  useRiveTrigger,
  Fit,
  DataBindMode,
  type ViewModelInstance,
  type RiveViewRef,
} from '@rive-app/react-native';
import type { Metadata } from '../helpers/metadata';

export default function QuickStart() {
  const { riveFile, error: fileError } = useRiveFile(
    require('../../assets/rive/quick_start.riv')
  );
  const [riveViewRef, setRiveViewRef] = useState<RiveViewRef | null>(null);
  const [viewModelInstance, setViewModelInstance] =
    useState<ViewModelInstance | null>(null);

  // Get the ViewModelInstance once the RiveView is ready
  useEffect(() => {
    if (riveViewRef) {
      const vmi = riveViewRef.getViewModelInstance();
      setViewModelInstance(vmi ?? null);
    }
  }, [riveViewRef]);

  // This is how you read and set properties from your Rive View Model
  const { value: health, setValue: setHealth } = useRiveNumber(
    'health',
    viewModelInstance
  );

  // Reference a Trigger from your View Model
  const { trigger: gameOverTrigger } = useRiveTrigger(
    'gameOver',
    viewModelInstance,
    {
      onTrigger: () => {
        // Listen for a Trigger event, whether it comes from the Rive app or from the code
        console.log('Game Over Triggered');
      },
    }
  );

  useEffect(() => {
    if (viewModelInstance && setHealth) {
      // Set the initial health value
      setHealth(9);
    }
  }, [viewModelInstance, setHealth]);

  const handleTakeDamage = () => {
    if (health !== undefined && setHealth) {
      setHealth(health - 7);
      // If all state machines have settled, you might need to wake the state machine back up.
      // This can happen when all animations have finished playing.
      riveViewRef?.play();
    }
  };

  const handleMaxHealth = () => {
    if (setHealth) {
      setHealth(100);
      riveViewRef?.play();
    }
  };

  const handleGameOver = () => {
    if (setHealth && gameOverTrigger) {
      setHealth(0);
      gameOverTrigger();
      riveViewRef?.play();
    }
  };

  if (fileError) {
    return (
      <SafeAreaView style={styles.safeAreaViewContainer}>
        <Text style={styles.errorText}>{fileError}</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeAreaViewContainer}>
      <ScrollView contentContainerStyle={styles.container}>
        {riveFile && (
          <RiveView
            hybridRef={{
              f: (ref) => setRiveViewRef(ref),
            }}
            file={riveFile}
            fit={Fit.Layout}
            style={styles.animation}
            autoPlay={true}
            // DataBindMode.Auto uses the view model instance from your Rive file
            dataBind={DataBindMode.Auto}
            // Alternative binding options:
            // dataBind={{ byName: 'SomeName' }}
            // dataBind={DataBindMode.None}
          />
        )}
      </ScrollView>
      <Button onPress={handleTakeDamage} title="Take Damage" />
      <Button onPress={handleMaxHealth} title="Max Health" />
      <Button onPress={handleGameOver} title="Game Over" />
    </SafeAreaView>
  );
}

QuickStart.metadata = {
  name: 'Quick Start',
  description: 'Basic data binding example with health and game over trigger',
} satisfies Metadata;

const styles = StyleSheet.create({
  safeAreaViewContainer: {
    flex: 1,
  },
  container: {
    flexGrow: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  animation: {
    width: '100%',
    height: 400,
  },
  errorText: {
    color: 'red',
    textAlign: 'center',
    padding: 20,
  },
});
