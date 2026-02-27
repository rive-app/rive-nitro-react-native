import { useState, useMemo, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  TextInput,
} from 'react-native';
import {
  Fit,
  RiveView,
  RiveFonts,
  useRive,
  useRiveFile,
  useRiveString,
  type FontSource,
  type FallbackFont,
} from '@rive-app/react-native';
import { type Metadata } from '../shared/metadata';

const TEXT_PROPERTY = 'text';

const FONTS: Record<
  string,
  { label: string; sublabel: string; source: FontSource }
> = {
  kanitBundled: {
    label: 'Kanit (Bundled)',
    sublabel: 'From native resources — 173KB',
    source: 'kanit_regular.ttf',
  },
  kanit: {
    label: 'Kanit (URL)',
    sublabel: 'Geometric Thai+Latin — 173KB',
    source: {
      uri: 'https://raw.githubusercontent.com/google/fonts/main/ofl/kanit/Kanit-Regular.ttf',
    },
  },
  notoSerifThai: {
    label: 'Noto Serif Thai',
    sublabel: 'Serif Thai — 292KB',
    source: {
      uri: 'https://raw.githubusercontent.com/google/fonts/main/ofl/notoserifthai/NotoSerifThai%5Bwdth%2Cwght%5D.ttf',
    },
  },
  thonburiSystem: {
    label: 'Thonburi (System)',
    sublabel: 'Built-in Thai font — iOS only',
    source: { name: 'Thonburi' },
  },
  serifSystem: {
    label: 'serif (System)',
    sublabel: 'Noto Serif — Android only',
    source: { name: 'serif' },
  },
};

type FontKey = keyof typeof FONTS;

type LogEntry = {
  message: string;
  type: 'success' | 'error' | 'info';
  timestamp: number;
};

export default function FontFallbackExample() {
  const [mounted, setMounted] = useState(false);
  const [selectedFonts, setSelectedFonts] = useState<Set<FontKey>>(new Set());
  const [loadedFonts, setLoadedFonts] = useState<Map<FontKey, FallbackFont>>(
    new Map()
  );
  const [loadingFont, setLoadingFont] = useState<string | null>(null);
  const [log, setLog] = useState<LogEntry[]>([]);
  const [inputText, setInputText] = useState('ABC 你好 สวัสดี');

  const addLog = (message: string, type: LogEntry['type'] = 'info') => {
    setLog((prev) => [...prev, { message, type, timestamp: Date.now() }]);
  };

  const toggleFont = async (key: FontKey) => {
    if (mounted) return;
    const font = FONTS[key]!;
    const isSelected = selectedFonts.has(key);

    if (isSelected) {
      setSelectedFonts((prev) => {
        const next = new Set(prev);
        next.delete(key);
        return next;
      });
      setLoadedFonts((prev) => {
        const next = new Map(prev);
        next.delete(key);
        return next;
      });
      addLog(`Removed ${font.label} from selection`, 'info');
      return;
    }

    setLoadingFont(key);
    try {
      const handle = await RiveFonts.loadFont(font.source);
      addLog(`Loaded ${font.label}`, 'success');
      setSelectedFonts((prev) => new Set(prev).add(key));
      setLoadedFonts((prev) => new Map(prev).set(key, handle));
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      addLog(`${font.label}: ${msg}`, 'error');
      console.error(`FontFallback ${font.label}:`, err);
    } finally {
      setLoadingFont(null);
    }
  };

  const handleMount = async () => {
    try {
      const handles = [...loadedFonts.values()];
      await RiveFonts.setFallbackFonts({ 0: handles });
    } catch (err) {
      console.error('setFallbackFonts:', err);
    }
    setMounted(true);
    addLog(
      `Mounted with: ${selectedFonts.size > 0 ? [...selectedFonts].map((k) => FONTS[k]!.label).join(', ') : 'system defaults only'}`,
      'info'
    );
  };

  const handleReset = async () => {
    await RiveFonts.clearFallbackFonts();
    setSelectedFonts(new Set());
    setLoadedFonts(new Map());
    setMounted(false);
    addLog('Cleared fonts & unmounted view', 'info');
  };

  return (
    <View style={styles.container}>
      {mounted ? (
        <MountedView text={inputText} />
      ) : (
        <View style={styles.setupContainer}>
          <Text style={styles.setupTitle}>Configure Fallback Fonts</Text>
          <Text style={styles.setupHint}>
            Select custom fonts below, then mount the view. Font lookups are
            cached at startup — to change fonts, unmount and remount.
          </Text>
        </View>
      )}

      <ScrollView
        style={styles.controls}
        contentContainerStyle={styles.controlsContent}
        keyboardShouldPersistTaps="handled"
      >
        {mounted && (
          <>
            <TextInput
              style={styles.input}
              value={inputText}
              onChangeText={setInputText}
              placeholder="Type text to test fallback"
              placeholderTextColor="#999"
              autoCapitalize="none"
              autoCorrect={false}
            />
            <View style={styles.presets}>
              <Preset label="Latin" text="Hello World" onPress={setInputText} />
              <Preset label="CJK" text="你好世界" onPress={setInputText} />
              <Preset label="Thai" text="สวัสดี โลก" onPress={setInputText} />
              <Preset
                label="Arabic"
                text="مرحبا بالعالم"
                onPress={setInputText}
              />
              <Preset
                label="Mixed"
                text="ABC 你好 สวัสดี"
                onPress={setInputText}
              />
            </View>
          </>
        )}

        <Text style={styles.sectionTitle}>
          {mounted ? 'Active Fonts' : 'Select Fonts'}
        </Text>

        {(Object.keys(FONTS) as FontKey[]).map((key) => (
          <FontToggle
            key={key}
            label={FONTS[key]!.label}
            sublabel={FONTS[key]!.sublabel}
            selected={selectedFonts.has(key)}
            disabled={mounted}
            loading={loadingFont === key}
            onPress={() => toggleFont(key)}
          />
        ))}

        {mounted ? (
          <ActionButton
            label="Unmount & Reset Fonts"
            onPress={handleReset}
            destructive
          />
        ) : (
          <ActionButton
            label={
              selectedFonts.size > 0
                ? `Mount View with ${selectedFonts.size} Custom Font${selectedFonts.size > 1 ? 's' : ''}`
                : 'Mount View (System Defaults Only)'
            }
            onPress={handleMount}
          />
        )}

        {log.length > 0 && (
          <View style={styles.logContainer}>
            <View style={styles.logHeader}>
              <Text style={styles.logTitle}>Log</Text>
              <TouchableOpacity onPress={() => setLog([])}>
                <Text style={styles.clearLog}>Clear</Text>
              </TouchableOpacity>
            </View>
            {log.map((entry) => (
              <Text
                key={entry.timestamp}
                style={[
                  styles.logEntry,
                  entry.type === 'success' && styles.logSuccess,
                  entry.type === 'error' && styles.logError,
                ]}
              >
                {entry.message}
              </Text>
            ))}
          </View>
        )}
      </ScrollView>
    </View>
  );
}

function MountedView({ text }: { text: string }) {
  const { riveViewRef, setHybridRef } = useRive();
  const { riveFile, isLoading, error } = useRiveFile(
    // https://rive.app/marketplace/26480-49641-simple-test-text-property/
    require('../../assets/rive/font_fallback.riv')
  );
  const viewModel = useMemo(
    () => riveFile?.defaultArtboardViewModel(),
    [riveFile]
  );
  const instance = useMemo(
    () => viewModel?.createDefaultInstance(),
    [viewModel]
  );

  const { setValue: setRiveText, error: textError } = useRiveString(
    TEXT_PROPERTY,
    instance
  );

  if (textError) {
    console.error('Failed to bind text property:', textError);
  }

  useEffect(() => {
    setRiveText(text);
    riveViewRef?.playIfNeeded();
  }, [text, setRiveText, riveViewRef]);

  if (isLoading) {
    return (
      <View style={styles.riveContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
      </View>
    );
  }

  if (error || !riveFile || !instance) {
    return (
      <View style={styles.riveContainer}>
        <Text style={styles.errorText}>
          {error || 'Failed to set up view model'}
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.riveContainer}>
      <RiveView
        style={styles.rive}
        autoPlay={true}
        dataBind={instance}
        fit={Fit.Contain}
        file={riveFile}
        hybridRef={setHybridRef}
      />
    </View>
  );
}

function FontToggle({
  label,
  sublabel,
  selected,
  disabled,
  loading,
  onPress,
}: {
  label: string;
  sublabel: string;
  selected: boolean;
  disabled: boolean;
  loading: boolean;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity
      style={[
        styles.fontToggle,
        selected && styles.fontToggleSelected,
        disabled && styles.fontToggleDisabled,
      ]}
      onPress={onPress}
      disabled={disabled || loading}
    >
      {loading ? (
        <ActivityIndicator size="small" color="#007AFF" />
      ) : (
        <>
          <View style={styles.fontToggleInfo}>
            <Text
              style={[
                styles.fontToggleLabel,
                selected && styles.fontToggleLabelSelected,
              ]}
            >
              {label}
            </Text>
            <Text style={styles.fontToggleSublabel}>{sublabel}</Text>
          </View>
          <Text style={styles.fontToggleCheck}>{selected ? '✓' : ''}</Text>
        </>
      )}
    </TouchableOpacity>
  );
}

function Preset({
  label,
  text,
  onPress,
}: {
  label: string;
  text: string;
  onPress: (text: string) => void;
}) {
  return (
    <TouchableOpacity style={styles.preset} onPress={() => onPress(text)}>
      <Text style={styles.presetText}>{label}</Text>
    </TouchableOpacity>
  );
}

function ActionButton({
  label,
  onPress,
  destructive,
}: {
  label: string;
  onPress: () => void;
  destructive?: boolean;
}) {
  return (
    <TouchableOpacity
      style={[styles.button, destructive && styles.buttonDestructive]}
      onPress={onPress}
    >
      <Text style={styles.buttonText}>{label}</Text>
    </TouchableOpacity>
  );
}

FontFallbackExample.metadata = {
  name: 'Font Fallback',
  description:
    'Tests RiveFonts API — configure custom fallback fonts before mounting the Rive view',
} satisfies Metadata;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  setupContainer: {
    height: 120,
    backgroundColor: '#f0f0f0',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  setupTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#333',
    marginBottom: 8,
  },
  setupHint: {
    fontSize: 13,
    color: '#666',
    textAlign: 'center',
  },
  riveContainer: {
    height: 120,
    backgroundColor: '#f0f0f0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  rive: {
    width: '100%',
    height: '100%',
  },
  errorText: {
    color: 'red',
    textAlign: 'center',
    padding: 20,
  },
  controls: {
    flex: 1,
  },
  controlsContent: {
    padding: 16,
    gap: 10,
    paddingBottom: 40,
  },
  input: {
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 10,
    padding: 12,
    fontSize: 16,
    backgroundColor: '#fafafa',
  },
  presets: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  preset: {
    backgroundColor: '#e8e8e8',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  presetText: {
    fontSize: 13,
    color: '#333',
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginTop: 6,
  },
  fontToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 10,
    padding: 14,
    backgroundColor: '#fafafa',
    minHeight: 56,
  },
  fontToggleSelected: {
    borderColor: '#007AFF',
    backgroundColor: '#F0F7FF',
  },
  fontToggleDisabled: {
    opacity: 0.6,
  },
  fontToggleInfo: {
    flex: 1,
  },
  fontToggleLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  fontToggleLabelSelected: {
    color: '#007AFF',
  },
  fontToggleSublabel: {
    fontSize: 12,
    color: '#888',
    marginTop: 2,
  },
  fontToggleCheck: {
    fontSize: 18,
    color: '#007AFF',
    fontWeight: '700',
    width: 24,
    textAlign: 'center',
  },
  button: {
    backgroundColor: '#007AFF',
    borderRadius: 10,
    padding: 14,
    alignItems: 'center',
    minHeight: 50,
    justifyContent: 'center',
  },
  buttonDestructive: {
    backgroundColor: '#FF3B30',
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
  },
  logContainer: {
    marginTop: 6,
    backgroundColor: '#1a1a2e',
    borderRadius: 10,
    padding: 12,
  },
  logHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  logTitle: {
    color: '#888',
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  clearLog: {
    color: '#007AFF',
    fontSize: 12,
  },
  logEntry: {
    color: '#ccc',
    fontSize: 13,
    fontFamily: 'monospace',
    paddingVertical: 2,
  },
  logSuccess: {
    color: '#4CD964',
  },
  logError: {
    color: '#FF3B30',
  },
});
