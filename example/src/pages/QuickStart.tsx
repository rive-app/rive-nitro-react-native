/*
  Rive React Native Quick Start (Nitro)

  Resources:
  - Getting Started: https://rive.app/docs/runtimes/react-native/react-native
  - Data Binding: https://rive.app/docs/runtimes/data-binding
*/

import { useEffect } from 'react';
import { Button, SafeAreaView, ScrollView, StyleSheet } from 'react-native';
import {
  RiveView,
  useRive,
  useRiveFile,
  useRiveNumber,
  useRiveTrigger,
  Fit,
  DataBindMode,
} from '@rive-app/react-native';
import type { Metadata } from '../helpers/metadata';

export default function QuickStart() {
  const { riveFile } = useRiveFile(
    require('../../assets/rive/quick_start.riv')
  );
  const { riveViewRef, setHybridRef } = useRive();
  const viewModelInstance = riveViewRef?.getViewModelInstance();

  const { value: health, setValue: setHealth } = useRiveNumber(
    'health',
    viewModelInstance
  );

  const { trigger: gameOverTrigger } = useRiveTrigger(
    'gameOver',
    viewModelInstance,
    { onTrigger: () => console.log('Game Over Triggered') }
  );

  useEffect(() => {
    if (viewModelInstance && setHealth) {
      setHealth(9);
    }
  }, [viewModelInstance, setHealth]);

  const handleTakeDamage = () => {
    if (health !== undefined && setHealth) {
      setHealth(health - 7);
      riveViewRef?.play();
    }
  };

  const handleMaxHealth = () => {
    setHealth?.(100);
    riveViewRef?.play();
  };

  const handleGameOver = () => {
    setHealth?.(0);
    gameOverTrigger?.();
    riveViewRef?.play();
  };

  return (
    <SafeAreaView style={styles.safeAreaViewContainer}>
      <ScrollView contentContainerStyle={styles.container}>
        {riveFile && (
          <RiveView
            hybridRef={setHybridRef}
            file={riveFile}
            fit={Fit.Layout}
            style={styles.animation}
            autoPlay={true}
            dataBind={DataBindMode.Auto}
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
});
