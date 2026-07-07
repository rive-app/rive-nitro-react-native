/*
  Rive React Native Quick Start (Nitro)

  Resources:
  - Getting Started: https://rive.app/docs/runtimes/react-native/react-native
  - Data Binding: https://rive.app/docs/runtimes/data-binding
*/

import { Button, Text, View, StyleSheet } from 'react-native';
import {
  RiveView,
  useRive,
  useRiveFile,
  useRiveNumber,
  useRiveTrigger,
  useViewModelInstanceAsync,
  Fit,
} from '@rive-app/react-native';
import type { Metadata } from '../shared/metadata';

export default function QuickStart() {
  const { riveFile, error: fileError } = useRiveFile(
    require('../../assets/rive/quick_start.riv')
  );
  const { riveViewRef, setHybridRef } = useRive();
  const { instance: viewModelInstance, error } = useViewModelInstanceAsync(
    riveFile,
    {
      onInit: (vmi) => vmi.numberProperty('health')!.set(9),
    }
  );

  const { setValue: setHealth } = useRiveNumber('health', viewModelInstance);

  const { trigger: gameOverTrigger } = useRiveTrigger(
    'gameOver',
    viewModelInstance,
    { onTrigger: () => console.log('Game Over Triggered') }
  );

  const handleTakeDamage = () => {
    setHealth((h) => (h ?? 0) - 7);
    riveViewRef?.play();
  };

  const handleMaxHealth = () => {
    setHealth(100);
    riveViewRef?.play();
  };

  const handleGameOver = () => {
    setHealth(0);
    gameOverTrigger();
    riveViewRef?.play();
  };

  if (fileError || error) {
    return (
      <View style={styles.container}>
        <Text style={styles.errorText}>{(fileError ?? error)!.message}</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {riveFile && viewModelInstance && (
        <RiveView
          hybridRef={setHybridRef}
          file={riveFile}
          fit={Fit.Layout}
          style={styles.rive}
          autoPlay={true}
          dataBind={viewModelInstance}
        />
      )}
      <Button onPress={handleTakeDamage} title="Take Damage" />
      <Button onPress={handleMaxHealth} title="Max Health" />
      <Button onPress={handleGameOver} title="Game Over" />
    </View>
  );
}

QuickStart.metadata = {
  name: 'Quick Start',
  description: 'Basic data binding example with health and game over trigger',
  order: 0,
} satisfies Metadata;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rive: {
    width: '100%',
    height: 400,
  },
  errorText: {
    color: 'red',
  },
});
