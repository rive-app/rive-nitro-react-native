import { useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Animated,
  Easing,
} from 'react-native';
import {
  createNativeStackNavigator,
  type NativeStackNavigationProp,
} from '@react-navigation/native-stack';
import { RiveView, useRiveFile, Fit } from '@rive-app/react-native';
import { type Metadata } from '../shared/metadata';

/**
 * Reproducer for issue #356: the Rive content disappeared part-way through an
 * iOS native-stack close transition, while the rest of the outgoing screen kept
 * sliding out.
 *
 * Open the Rive screen, then go back while the animation is moving. The blue
 * control box is the reference — whatever happens to the Rive tiles has to
 * happen to it too. Several tiles because the failure was intermittent
 * (~7% of pops), so a grid catches it sooner.
 */

type ParamList = {
  Issue356Start: undefined;
  Issue356Animation: undefined;
};

const Stack = createNativeStackNavigator<ParamList>();
const TILES = [0, 1, 2, 3, 4, 5];

function StartScreen({
  navigation,
}: {
  navigation: NativeStackNavigationProp<ParamList, 'Issue356Start'>;
}) {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Issue #356</Text>
      <Text style={styles.subtitle}>
        Open the next screen, then go back while the animation is moving and
        watch the outgoing screen slide away.
      </Text>
      <Pressable
        style={styles.button}
        onPress={() => navigation.navigate('Issue356Animation')}
      >
        <Text style={styles.buttonText}>Open Rive screen</Text>
      </Pressable>
    </View>
  );
}

function AnimationScreen({
  navigation,
}: {
  navigation: NativeStackNavigationProp<ParamList, 'Issue356Animation'>;
}) {
  const { riveFile } = useRiveFile(require('../../assets/rive/rewards.riv'));
  const markerX = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(markerX, {
          toValue: 260,
          duration: 900,
          easing: Easing.linear,
          useNativeDriver: true,
        }),
        Animated.timing(markerX, {
          toValue: 0,
          duration: 900,
          easing: Easing.linear,
          useNativeDriver: true,
        }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [markerX]);

  return (
    <View style={styles.container}>
      <View style={styles.grid}>
        {TILES.map((i) => (
          <View key={i} style={styles.frame}>
            {riveFile ? (
              <RiveView file={riveFile} fit={Fit.Contain} style={styles.rive} />
            ) : null}
          </View>
        ))}
      </View>
      <View style={styles.control}>
        <Animated.View
          style={[styles.marker, { transform: [{ translateX: markerX }] }]}
        />
        <Text style={styles.controlText}>control</Text>
      </View>
      <Pressable style={styles.button} onPress={() => navigation.goBack()}>
        <Text style={styles.buttonText}>Go back</Text>
      </Pressable>
    </View>
  );
}

export default function Issue356NativeStackBack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="Issue356Start" component={StartScreen} />
      <Stack.Screen name="Issue356Animation" component={AnimationScreen} />
    </Stack.Navigator>
  );
}

Issue356NativeStackBack.metadata = {
  name: 'Issue #356 native-stack back',
  description:
    'Rive content must stay visible until the iOS native-stack close transition finishes',
} satisfies Metadata;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    padding: 20,
    justifyContent: 'center',
  },
  title: { fontSize: 24, fontWeight: 'bold', marginBottom: 10 },
  subtitle: { fontSize: 15, color: '#666', marginBottom: 20 },
  grid: { flexDirection: 'row', flexWrap: 'wrap' },
  frame: {
    width: '33%',
    height: 150,
    backgroundColor: '#ffd9d9',
    borderWidth: 2,
    borderColor: '#d33',
  },
  rive: { flex: 1 },
  control: {
    marginTop: 12,
    height: 80,
    backgroundColor: '#d9e8ff',
    borderWidth: 2,
    borderColor: '#36c',
    alignItems: 'center',
    justifyContent: 'center',
  },
  controlText: { color: '#36c', fontWeight: 'bold' },
  marker: {
    position: 'absolute',
    left: 8,
    top: 8,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#0a0',
  },
  button: {
    marginTop: 20,
    backgroundColor: '#323232',
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
  },
  buttonText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
});
