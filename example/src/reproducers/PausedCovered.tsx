import {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
  type RefObject,
} from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { useIsFocused } from '@react-navigation/native';
import {
  createStackNavigator,
  type StackNavigationProp,
} from '@react-navigation/stack';
import {
  RiveView,
  useRiveFile,
  useViewModelInstance,
  Fit,
  type RiveViewRef,
} from '@rive-app/react-native';
import { type Metadata } from '../shared/metadata';

/**
 * Two looping views on a screen that gets covered while staying attached and
 * shown: a screen pushed with @react-navigation/stack with inactive screens
 * kept attached, or an opaque sibling drawn on top. The view can't see either,
 * so it keeps advancing and drawing unless the paused prop stops it.
 *
 * "Advances/s" counts Ticker `phase` updates, one per state machine advance.
 * Draws are not observable from JS; sample process CPU instead, e.g.
 *   adb shell top -d 1 -p $(adb shell pidof rive.example)
 */

const SETTLE_PROBE = require('../../assets/rive/settle_probe.riv');
const REWARDS = require('../../assets/rive/rewards.riv');

type ParamList = {
  CoveredHome: undefined;
  CoveredDetail: undefined;
};

const Stack = createStackNavigator<ParamList>();

type PageState = {
  paused: boolean;
  siblingCover: boolean;
  setSiblingCover: (v: boolean) => void;
  setHomeFocused: (v: boolean) => void;
  onPhase: () => void;
  tickerRef: RefObject<RiveViewRef | null>;
};

const PageContext = createContext<PageState | null>(null);

function usePage() {
  const page = useContext(PageContext);
  if (!page) throw new Error('PausedCovered context missing');
  return page;
}

function HomeScreen({
  navigation,
}: {
  navigation: StackNavigationProp<ParamList, 'CoveredHome'>;
}) {
  const page = usePage();
  const isFocused = useIsFocused();
  const { setHomeFocused, onPhase } = page;
  const { riveFile: probeFile } = useRiveFile(SETTLE_PROBE);
  const { riveFile: rewardsFile } = useRiveFile(REWARDS);
  const { instance: ticker } = useViewModelInstance(probeFile, {
    async: true,
    artboardName: 'Ticker',
  });

  useEffect(() => {
    setHomeFocused(isFocused);
  }, [isFocused, setHomeFocused]);

  useEffect(() => {
    const prop = ticker?.numberProperty('phase');
    if (!prop) return;
    return prop.addListener(onPhase);
  }, [ticker, onPhase]);

  return (
    <View style={styles.screen}>
      <View style={styles.buttonRow}>
        <Pressable
          testID="covered-push"
          style={styles.button}
          onPress={() => navigation.navigate('CoveredDetail')}
        >
          <Text style={styles.buttonText}>Push screen</Text>
        </Pressable>
        <Pressable
          testID="covered-sibling"
          style={styles.button}
          onPress={() => page.setSiblingCover(true)}
        >
          <Text style={styles.buttonText}>Cover with sibling</Text>
        </Pressable>
      </View>
      <View style={styles.riveRow}>
        {probeFile && ticker ? (
          <RiveView
            file={probeFile}
            artboardName="Ticker"
            dataBind={ticker}
            fit={Fit.Contain}
            paused={page.paused}
            hybridRef={{ f: (ref) => (page.tickerRef.current = ref) }}
            style={styles.rive}
          />
        ) : null}
        {rewardsFile ? (
          <RiveView
            file={rewardsFile}
            fit={Fit.Contain}
            paused={page.paused}
            style={styles.rive}
          />
        ) : null}
      </View>
      {page.siblingCover ? (
        <View style={styles.cover}>
          <Text style={styles.coverText}>Opaque sibling over the views</Text>
          <Pressable
            testID="covered-sibling-close"
            style={styles.button}
            onPress={() => page.setSiblingCover(false)}
          >
            <Text style={styles.buttonText}>Remove cover</Text>
          </Pressable>
        </View>
      ) : null}
    </View>
  );
}

function DetailScreen({
  navigation,
}: {
  navigation: StackNavigationProp<ParamList, 'CoveredDetail'>;
}) {
  return (
    <View style={[styles.screen, styles.detail]}>
      <Text style={styles.coverText}>
        Pushed screen; the looping views are still mounted underneath.
      </Text>
      <Pressable
        testID="covered-back"
        style={styles.button}
        onPress={() => navigation.goBack()}
      >
        <Text style={styles.buttonText}>Back</Text>
      </Pressable>
    </View>
  );
}

export default function PausedCovered() {
  const [pauseWhenCovered, setPauseWhenCovered] = useState(false);
  const [forcePaused, setForcePaused] = useState(false);
  const [siblingCover, setSiblingCover] = useState(false);
  const [homeFocused, setHomeFocused] = useState(true);
  const [rate, setRate] = useState(0);
  const [refPaused, setRefPaused] = useState(false);
  const phaseCount = useRef(0);
  const tickerRef = useRef<RiveViewRef | null>(null);
  const onPhase = useRef(() => {
    phaseCount.current += 1;
  }).current;

  useEffect(() => {
    let last = phaseCount.current;
    const id = setInterval(() => {
      setRate(phaseCount.current - last);
      last = phaseCount.current;
    }, 1000);
    return () => clearInterval(id);
  }, []);

  const covered = siblingCover || !homeFocused;
  const paused = forcePaused || (pauseWhenCovered && covered);

  const toggleRefPaused = () => {
    if (refPaused) {
      tickerRef.current?.play();
    } else {
      tickerRef.current?.pause();
    }
    setRefPaused(!refPaused);
  };

  return (
    <PageContext.Provider
      value={{
        paused,
        siblingCover,
        setSiblingCover,
        setHomeFocused,
        onPhase,
        tickerRef,
      }}
    >
      <View style={styles.container}>
        <Text style={styles.status} testID="covered-status">
          {covered ? 'COVERED' : 'VISIBLE'} · paused={String(paused)} ·
          advances/s: {rate}
        </Text>
        <View style={styles.buttonRow}>
          <Pressable
            testID="covered-pause-when-covered"
            style={[styles.button, pauseWhenCovered && styles.buttonActive]}
            onPress={() => setPauseWhenCovered(!pauseWhenCovered)}
          >
            <Text
              style={[
                styles.buttonText,
                pauseWhenCovered && styles.buttonTextActive,
              ]}
            >
              paused={'{covered}'}
            </Text>
          </Pressable>
          <Pressable
            testID="covered-force-paused"
            style={[styles.button, forcePaused && styles.buttonActive]}
            onPress={() => setForcePaused(!forcePaused)}
          >
            <Text
              style={[
                styles.buttonText,
                forcePaused && styles.buttonTextActive,
              ]}
            >
              paused={'{true}'}
            </Text>
          </Pressable>
          <Pressable
            testID="covered-ref-pause"
            style={[styles.button, refPaused && styles.buttonActive]}
            onPress={toggleRefPaused}
          >
            <Text
              style={[styles.buttonText, refPaused && styles.buttonTextActive]}
            >
              {refPaused ? 'Ticker play()' : 'Ticker pause()'}
            </Text>
          </Pressable>
        </View>
        {/* With detached inactive screens the view hides itself and stops on
            its own; apps that keep them attached need the paused prop. */}
        <Stack.Navigator
          detachInactiveScreens={false}
          screenOptions={{ headerShown: false }}
        >
          <Stack.Screen name="CoveredHome" component={HomeScreen} />
          <Stack.Screen name="CoveredDetail" component={DetailScreen} />
        </Stack.Navigator>
      </View>
    </PageContext.Provider>
  );
}

PausedCovered.metadata = {
  name: 'paused prop on a covered screen',
  description:
    'Looping views under a JS stack push or an opaque sibling, with the paused prop, ref pause()/play() and a live advance counter',
} satisfies Metadata;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  status: {
    fontSize: 15,
    fontWeight: 'bold',
    textAlign: 'center',
    paddingVertical: 8,
    backgroundColor: '#222',
    color: '#0f0',
  },
  buttonRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 6,
    paddingHorizontal: 8,
    paddingVertical: 6,
  },
  button: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: '#eee',
    borderRadius: 8,
  },
  buttonActive: {
    backgroundColor: '#007AFF',
  },
  buttonText: {
    color: '#333',
    fontWeight: '600',
    fontSize: 13,
  },
  buttonTextActive: {
    color: '#fff',
  },
  screen: {
    flex: 1,
    backgroundColor: '#fff',
  },
  riveRow: {
    flex: 1,
    gap: 8,
    padding: 8,
  },
  rive: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  cover: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  detail: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  coverText: {
    color: '#333',
    paddingHorizontal: 32,
    textAlign: 'center',
  },
});
