import { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  NativeModules,
  Platform,
} from 'react-native';
import { RiveView, useRiveFile, Fit } from '@rive-app/react-native';
import { type Metadata } from '../shared/metadata';

/**
 * Reproducer for the disposed-file re-attach crash reported in production.
 *
 * After a RiveView is dropped (dispose) and its file released, the Android
 * view still caches the dead File in rendererAttributes.resource. If the view
 * is ever attached to a window again — e.g. via Fabric view recycling —
 * onAttachedToWindow re-acquires the disposed object and throws
 * "Cannot acquire a disposed object".
 *
 * The RiveViewReattach native module (example app only) simulates the
 * re-attach: it captures the Android view before unmount and adds it back to
 * the window afterwards, catching the exception so the result can be shown
 * here. FAIL = crash reproduced, PASS = re-attach survived.
 */

const { RiveViewReattach } = NativeModules;

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

function RiveContent() {
  const { riveFile } = useRiveFile(
    require('../../assets/rive/quick_start.riv')
  );
  if (!riveFile) return <Text>Loading...</Text>;
  return (
    <RiveView
      file={riveFile}
      fit={Fit.Contain}
      style={styles.rive}
      autoPlay={true}
    />
  );
}

export default function DisposedFileReattach() {
  const [mounted, setMounted] = useState(true);
  const [status, setStatus] = useState<string>('idle');
  const [result, setResult] = useState<'pass' | 'fail' | null>(null);

  const run = async () => {
    if (Platform.OS !== 'android') {
      setStatus('Android-only reproducer');
      return;
    }
    if (RiveViewReattach == null) {
      // The native helper only exists in the bare example app; the page is
      // also reachable from the Expo examples via the shared PagesList.
      setStatus(
        'RiveViewReattach helper not available in this app — run the bare example'
      );
      return;
    }
    setResult(null);
    setMounted(true);
    setStatus('mounting view...');
    await sleep(500);

    setStatus('capturing native view...');
    const found = await RiveViewReattach.captureRiveView();
    if (!found) {
      setStatus('no RiveReactNativeView found on screen');
      return;
    }

    setStatus('unmounting (drops view + releases file)...');
    setMounted(false);
    await sleep(500);

    setStatus('re-attaching dropped view...');
    const outcome = await RiveViewReattach.reattachCapturedView();
    await RiveViewReattach.releaseCapturedView();

    if (outcome === 'no-crash') {
      setResult('pass');
      setStatus('PASS: re-attach after dispose did not crash');
      console.log('[DisposedFileReattach] PASS');
    } else {
      setResult('fail');
      setStatus(`FAIL: re-attach crashed:\n\n${outcome}`);
      console.log(`[DisposedFileReattach] FAIL: ${outcome}`);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Disposed File Re-attach</Text>
      <Text style={styles.subtitle}>
        Re-attaches a dropped Rive view (as Fabric view recycling would) after
        its file was disposed
      </Text>

      <Pressable style={styles.button} onPress={run}>
        <Text style={styles.buttonText}>Run</Text>
      </Pressable>

      <View
        style={[
          styles.statusBox,
          result === 'pass' && styles.statusPass,
          result === 'fail' && styles.statusFail,
        ]}
      >
        <Text style={styles.statusText}>{status}</Text>
      </View>

      <View style={styles.riveContainer}>{mounted && <RiveContent />}</View>
    </View>
  );
}

DisposedFileReattach.metadata = {
  name: 'Disposed File Re-attach',
  description:
    'Android: re-attaching a disposed RiveView must not crash with "Cannot acquire a disposed object"',
} satisfies Metadata;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
    backgroundColor: '#fff',
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    marginBottom: 16,
  },
  button: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    backgroundColor: '#007AFF',
    borderRadius: 8,
    alignSelf: 'center',
    marginBottom: 16,
  },
  buttonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 16,
  },
  statusBox: {
    backgroundColor: '#f0f0f0',
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
  },
  statusPass: {
    backgroundColor: '#E8F5E9',
  },
  statusFail: {
    backgroundColor: '#FFEBEE',
  },
  statusText: {
    fontSize: 12,
    color: '#333',
    fontFamily: Platform.select({ ios: 'Menlo', default: 'monospace' }),
  },
  riveContainer: {
    flex: 1,
    backgroundColor: '#f5f5f5',
    borderRadius: 8,
    overflow: 'hidden',
  },
  rive: {
    flex: 1,
  },
});
