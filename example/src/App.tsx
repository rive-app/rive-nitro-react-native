import { Text, View, StyleSheet, Button } from 'react-native';
import type { HybridView } from 'react-native-nitro-modules';
import { multiply, RiveView } from 'react-native-rive';
import type {
  RiveViewMethods,
  RiveViewProps,
} from '../../src/specs/RiveView.nitro';
import { useRef } from 'react';

const result = multiply(3, 7);

export default function App() {
  const riveRef = useRef<HybridView<RiveViewProps, RiveViewMethods>>(null);

  const handlePlay = () => {
    if (riveRef.current) {
      riveRef.current.play();
    }
  };

  const handlePause = () => {
    if (riveRef.current) {
      riveRef.current.pause();
    }
  };

  return (
    <View style={styles.container}>
      <Text>Result: {result}</Text>
      <RiveView
        style={styles.rive}
        autoBind={false}
        autoPlay={true}
        hybridRef={{
          f: (ref) => {
            if (ref) {
              console.log(`Ref initialized!`);
              riveRef.current = ref;
            } else {
              console.error('Failed to initialize ref');
            }
          },
        }}
      />
      <View style={styles.buttonContainer}>
        <Button title="Play" onPress={handlePlay} />
        <Button title="Pause" onPress={handlePause} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  rive: {
    flex: 1,
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '50%',
    marginTop: 20,
    marginBottom: 24,
    alignSelf: 'center',
  },
});
