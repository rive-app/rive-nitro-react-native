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
 * kept attached, or an opaque sibling drawn on top. Neither is visible to the view, so it keeps advancing and drawing
 * unless renderEnabled says otherwise.
 *
 * "Advances/s" counts Ticker `phase` updates, one per state machine advance.
 * Draws are not observable from JS; sample per-thread CPU instead, e.g.
 *   adb shell top -H -d 1 -p $(adb shell pidof rive.example)
 * With renderEnabled false the advances keep running while the draw cost
 * goes away; with 'pause' both stop, and uncovering resumes playback.
 */

const SETTLE_PROBE = require('../../assets/rive/settle_probe.riv');
const REWARDS = require('../../assets/rive/rewards.riv');

const MODES = ['true', 'false', 'pause'] as const;
type Mode = (typeof MODES)[number];

type ParamList = {
  CoveredHome: undefined;
  CoveredDetail: undefined;
};

const Stack = createStackNavigator<ParamList>();

type PageState = {
  renderEnabled: boolean | 'pause';
  siblingCover: boolean;
  setSiblingCover: (v: boolean) => void;
  setHomeFocused: (v: boolean) => void;
  onPhase: () => void;
  tickerRef: RefObject<RiveViewRef | null>;
};

const PageContext = createContext<PageState | null>(null);

function usePage() {
  const page = useContext(PageContext);
  if (!page) throw new Error('RenderEnabledCovered context missing');
  return page;
}

function toRenderEnabled(mode: Mode): boolean | 'pause' {
  if (mode === 'pause') return 'pause';
  return mode === 'true';
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
            renderEnabled={page.renderEnabled}
            hybridRef={{ f: (ref) => (page.tickerRef.current = ref) }}
            style={styles.rive}
          />
        ) : null}
        {rewardsFile ? (
          <RiveView
            file={rewardsFile}
            fit={Fit.Contain}
            renderEnabled={page.renderEnabled}
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

export default function RenderEnabledCovered() {
  const [mode, setMode] = useState<Mode>('true');
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
  const renderEnabled = covered ? toRenderEnabled(mode) : true;

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
        renderEnabled,
        siblingCover,
        setSiblingCover,
        setHomeFocused,
        onPhase,
        tickerRef,
      }}
    >
      <View style={styles.container}>
        <Text style={styles.status} testID="covered-status">
          {covered ? 'COVERED' : 'VISIBLE'} · renderEnabled=
          {String(renderEnabled)} · advances/s: {rate}
        </Text>
        <View style={styles.buttonRow}>
          <Text style={styles.label}>While covered:</Text>
          {MODES.map((value) => (
            <Pressable
              key={value}
              testID={`covered-mode-${value}`}
              style={[styles.button, value === mode && styles.buttonActive]}
              onPress={() => setMode(value)}
            >
              <Text
                style={[
                  styles.buttonText,
                  value === mode && styles.buttonTextActive,
                ]}
              >
                {value}
              </Text>
            </Pressable>
          ))}
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
            its own; apps that keep them attached are the case renderEnabled
            covers. */}
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

RenderEnabledCovered.metadata = {
  name: 'renderEnabled on a covered screen',
  description:
    'Looping views under a JS stack push or an opaque sibling, with renderEnabled true/false/pause and a live advance counter',
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
  label: {
    alignSelf: 'center',
    fontWeight: '600',
    color: '#333',
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
