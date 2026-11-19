import { useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { useIsFocused, useNavigation } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import {
  RiveView,
  useRiveFile,
  useViewModelInstance,
  Fit,
} from '@rive-app/react-native';
import { type Metadata } from '../shared/metadata';

// Each Ticker `phase` update is one state machine advance.
const SETTLE_PROBE = require('../../assets/rive/settle_probe.riv');

const Stack = createStackNavigator();

function Home({
  pauseWhenCovered,
  onPhase,
}: {
  pauseWhenCovered: boolean;
  onPhase: () => void;
}) {
  const navigation = useNavigation<any>();
  const isFocused = useIsFocused();
  const { riveFile } = useRiveFile(SETTLE_PROBE);
  const { instance } = useViewModelInstance(riveFile, {
    async: true,
    artboardName: 'Ticker',
  });

  useEffect(() => {
    // iOS stops a property's listeners once the property is collected.
    const phase = instance?.numberProperty('phase');
    const remove = phase?.addListener(onPhase);
    return () => {
      remove?.();
      phase?.dispose();
    };
  }, [instance, onPhase]);

  return (
    <View style={styles.screen}>
      <Pressable
        style={styles.button}
        onPress={() => navigation.navigate('Detail')}
      >
        <Text>Push screen</Text>
      </Pressable>
      {riveFile && instance ? (
        <RiveView
          file={riveFile}
          artboardName="Ticker"
          dataBind={instance}
          fit={Fit.Contain}
          paused={pauseWhenCovered && !isFocused}
          style={styles.rive}
        />
      ) : null}
    </View>
  );
}

function Detail() {
  const navigation = useNavigation();
  return (
    <View style={[styles.screen, styles.center]}>
      <Pressable style={styles.button} onPress={() => navigation.goBack()}>
        <Text>Back</Text>
      </Pressable>
    </View>
  );
}

export default function PausedCovered() {
  const [pauseWhenCovered, setPauseWhenCovered] = useState(true);
  const [rate, setRate] = useState(0);
  const count = useRef(0);
  const onPhase = useRef(() => {
    count.current += 1;
  }).current;

  useEffect(() => {
    let last = count.current;
    const id = setInterval(() => {
      setRate(count.current - last);
      last = count.current;
    }, 1000);
    return () => clearInterval(id);
  }, []);

  return (
    <View style={styles.screen}>
      <Pressable
        style={styles.button}
        onPress={() => setPauseWhenCovered(!pauseWhenCovered)}
      >
        <Text>
          {pauseWhenCovered ? 'paused={!isFocused}' : 'paused off'} ·
          advances/s: {rate}
        </Text>
      </Pressable>
      {/* Keeps Home attached under the pushed screen, so the view can't tell it's covered. */}
      <Stack.Navigator
        detachInactiveScreens={false}
        screenOptions={{ headerShown: false }}
      >
        <Stack.Screen name="Home">
          {() => <Home pauseWhenCovered={pauseWhenCovered} onPhase={onPhase} />}
        </Stack.Screen>
        <Stack.Screen name="Detail" component={Detail} />
      </Stack.Navigator>
    </View>
  );
}

PausedCovered.metadata = {
  name: 'paused prop on a covered screen',
  description:
    'A looping view under a JS stack push, paused with paused={!isFocused}, with a live advance counter',
} satisfies Metadata;

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#fff' },
  center: { alignItems: 'center', justifyContent: 'center' },
  button: {
    alignSelf: 'center',
    margin: 8,
    padding: 10,
    backgroundColor: '#eee',
    borderRadius: 8,
  },
  rive: { flex: 1 },
});
