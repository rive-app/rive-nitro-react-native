import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  Button,
  TextInput,
} from 'react-native';
import { useMemo, useRef, useState } from 'react';
import {
  Fit,
  RiveView,
  useRiveFile,
  useRiveString,
  type ViewModelInstance,
  type RiveFile,
  type RiveViewRef,
} from '@rive-app/react-native';
import { type Metadata } from '../helpers/metadata';

export default function NestedViewModelExample() {
  const { riveFile, isLoading, error } = useRiveFile(
    require('../../assets/rive/viewmodelproperty.riv')
  );

  return (
    <View style={styles.container}>
      {isLoading ? (
        <ActivityIndicator size="large" color="#0000ff" />
      ) : riveFile ? (
        <WithViewModelSetup file={riveFile} />
      ) : (
        <Text style={styles.errorText}>{error || 'Unexpected error'}</Text>
      )}
    </View>
  );
}

function WithViewModelSetup({ file }: { file: RiveFile }) {
  const viewModel = useMemo(() => file.defaultArtboardViewModel(), [file]);
  const instance = useMemo(
    () => viewModel?.createDefaultInstance(),
    [viewModel]
  );

  if (!instance || !viewModel) {
    return (
      <Text style={styles.errorText}>
        {!viewModel
          ? 'No view model found'
          : 'Failed to create view model instance'}
      </Text>
    );
  }

  return <ReplaceViewModelTest instance={instance} file={file} />;
}

function ReplaceViewModelTest({
  instance,
  file,
}: {
  instance: ViewModelInstance;
  file: RiveFile;
}) {
  const riveRef = useRef<RiveViewRef>(null);
  const [replaced, setReplaced] = useState(false);
  const [log, setLog] = useState<string[]>([]);

  const { value: vm1Name, setValue: setVm1Name } = useRiveString(
    'vm1/name',
    instance
  );
  const { value: vm2Name, setValue: setVm2Name } = useRiveString(
    'vm2/name',
    instance
  );

  const handleSetVm1Name = (newValue: string) => {
    setVm1Name(newValue);
    riveRef.current?.playIfNeeded();
  };

  const handleSetVm2Name = (newValue: string) => {
    setVm2Name(newValue);
    riveRef.current?.playIfNeeded();
  };

  const addLog = (msg: string) => setLog((prev) => [...prev, msg]);

  const handleReplace = () => {
    // Get vm2's instance
    const vm2Instance = instance.viewModel('vm2');
    if (!vm2Instance) {
      addLog('❌ viewModel("vm2") returned undefined');
      return;
    }
    addLog(`✅ Got vm2 instance: ${vm2Instance.instanceName}`);

    // Replace vm1 with vm2's instance
    try {
      instance.replaceViewModel('vm1', vm2Instance);
      addLog('✅ replaceViewModel("vm1", vm2Instance) succeeded');
      // Call playIfNeeded to update the graphics
      riveRef.current?.playIfNeeded();
      addLog('✅ Called playIfNeeded() to refresh display');
      addLog('→ Now vm1 and vm2 point to the same instance');
      addLog('→ Changing vm2.name should also change vm1.name');
      setReplaced(true);
    } catch (error) {
      addLog(`❌ replaceViewModel failed: ${error}`);
    }
  };

  return (
    <View style={styles.content}>
      <RiveView
        hybridRef={{ f: (ref: RiveViewRef | null) => (riveRef.current = ref) }}
        style={styles.rive}
        autoPlay={true}
        dataBind={instance}
        fit={Fit.Contain}
        file={file}
      />

      <View style={styles.info}>
        <Text style={styles.title}>replaceViewModel() Test</Text>
        <Text style={styles.description}>
          Replace vm1 with vm2's instance. After replacement, changing vm2.name
          should also change vm1.name since they share the same instance.
        </Text>

        <View style={styles.row}>
          <Text style={styles.label}>vm1.name:</Text>
          <TextInput
            style={styles.input}
            value={vm1Name ?? ''}
            onChangeText={handleSetVm1Name}
            placeholder="vm1 name"
          />
        </View>

        <View style={styles.row}>
          <Text style={styles.label}>vm2.name:</Text>
          <TextInput
            style={styles.input}
            value={vm2Name ?? ''}
            onChangeText={handleSetVm2Name}
            placeholder="vm2 name"
          />
        </View>

        {!replaced && (
          <Button title="Replace vm1 with vm2" onPress={handleReplace} />
        )}

        {replaced && (
          <Text style={styles.success}>
            ✅ Replaced! Try changing vm2.name - vm1.name should update too
          </Text>
        )}

        {log.length > 0 && (
          <View style={styles.logContainer}>
            <Text style={styles.logTitle}>Log:</Text>
            {log.map((entry, i) => (
              <Text key={i} style={styles.logEntry}>
                {entry}
              </Text>
            ))}
          </View>
        )}
      </View>
    </View>
  );
}

NestedViewModelExample.metadata = {
  name: 'Nested ViewModel',
  description:
    'Tests viewModel() and replaceViewModel() for nested ViewModel instances',
} satisfies Metadata;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  content: {
    flex: 1,
  },
  rive: {
    flex: 1,
    width: '100%',
  },
  info: {
    padding: 16,
    backgroundColor: '#fff',
    gap: 12,
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  description: {
    fontSize: 14,
    color: '#666',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    width: 80,
  },
  input: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 8,
    padding: 8,
    fontSize: 14,
  },
  success: {
    color: 'green',
    fontWeight: '600',
  },
  logContainer: {
    marginTop: 8,
    padding: 8,
    backgroundColor: '#f5f5f5',
    borderRadius: 8,
  },
  logTitle: {
    fontWeight: '600',
    marginBottom: 4,
  },
  logEntry: {
    fontSize: 12,
    fontFamily: 'monospace',
    color: '#333',
  },
  errorText: {
    color: 'red',
    textAlign: 'center',
    padding: 20,
  },
});
