import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  TouchableOpacity,
} from 'react-native';
import { useMemo, useState, useCallback, useRef } from 'react';
import {
  Fit,
  RiveView,
  type ViewModelInstance,
  type RiveFile,
  type RiveViewRef,
  useRiveFile,
} from '@rive-app/react-native';
import { type Metadata } from '../helpers/metadata';

export default function DataBindingListExample() {
  const { riveFile, isLoading, error } = useRiveFile(
    require('../../assets/list.riv')
  );

  return (
    <View style={styles.container}>
      <View style={styles.riveContainer}>
        {isLoading ? (
          <ActivityIndicator size="large" color="#0000ff" />
        ) : riveFile ? (
          <WithViewModelSetup file={riveFile} />
        ) : (
          <Text style={styles.errorText}>{error || 'Unexpected error'}</Text>
        )}
      </View>
    </View>
  );
}

function WithViewModelSetup({ file }: { file: RiveFile }) {
  const viewModel = useMemo(() => file.viewModelByName('menu VM'), [file]);
  const instance = useMemo(
    () => viewModel?.createDefaultInstance(),
    [viewModel]
  );

  if (!instance || !viewModel) {
    return (
      <Text style={styles.errorText}>
        {!viewModel
          ? "No view model 'menu VM' found"
          : 'Failed to create view model instance'}
      </Text>
    );
  }

  return <ListExample instance={instance} file={file} />;
}

function ListExample({
  instance,
  file,
}: {
  instance: ViewModelInstance;
  file: RiveFile;
}) {
  const riveRef = useRef<RiveViewRef>(undefined);
  const [isPlaying, setIsPlaying] = useState(true);
  const listProperty = useMemo(
    () => instance.listProperty('ListItemVM'),
    [instance]
  );
  const [listLength, setListLength] = useState(listProperty?.length ?? 0);

  const refreshLength = useCallback(() => {
    setListLength(listProperty?.length ?? 0);
  }, [listProperty]);

  const handleAddItem = useCallback(() => {
    if (!listProperty) return;
    const buttonVM = file.viewModelByName('button VM');
    if (!buttonVM) {
      console.error('button VM view model not found');
      return;
    }
    const newInstance = buttonVM.createInstance();
    if (!newInstance) {
      console.error('Failed to create new button VM instance');
      return;
    }
    const stringProp = newInstance.stringProperty('string');
    if (stringProp) {
      stringProp.value = 'new btn';
    }
    listProperty.addInstance(newInstance);
    refreshLength();
  }, [listProperty, file, refreshLength]);

  const handleRemoveFirst = useCallback(() => {
    if (!listProperty || listProperty.length === 0) return;
    listProperty.removeInstanceAt(0);
    refreshLength();
  }, [listProperty, refreshLength]);

  const handleRemoveLast = useCallback(() => {
    if (!listProperty || listProperty.length === 0) return;
    listProperty.removeInstanceAt(listProperty.length - 1);
    refreshLength();
  }, [listProperty, refreshLength]);

  const handleSwapFirstTwo = useCallback(() => {
    if (!listProperty || listProperty.length < 2) return;
    listProperty.swap(0, 1);
    refreshLength();
  }, [listProperty, refreshLength]);

  const logListItems = useCallback(() => {
    if (!listProperty) return;
    console.log(`List has ${listProperty.length} items:`);
    for (let i = 0; i < listProperty.length; i++) {
      const item = listProperty.instanceAt(i);
      console.log(`  [${i}]: ${item?.instanceName ?? 'undefined'}`);
    }
  }, [listProperty]);

  const handlePlayPause = useCallback(() => {
    if (isPlaying) {
      riveRef.current?.pause();
    } else {
      riveRef.current?.play();
    }
    setIsPlaying(!isPlaying);
  }, [isPlaying]);

  if (!listProperty) {
    return (
      <Text style={styles.errorText}>ListItemVM list property not found</Text>
    );
  }

  return (
    <View style={styles.container}>
      <RiveView
        hybridRef={{
          f: (ref) => {
            riveRef.current = ref;
          },
        }}
        style={styles.rive}
        autoPlay={true}
        dataBind={instance}
        fit={Fit.Contain}
        file={file}
      />
      <View style={styles.controls}>
        <Text style={styles.infoText}>List length: {listLength}</Text>
        <View style={styles.buttonRow}>
          <TouchableOpacity style={styles.button} onPress={handleAddItem}>
            <Text style={styles.buttonText}>Add Item</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.button} onPress={handleRemoveFirst}>
            <Text style={styles.buttonText}>Remove First</Text>
          </TouchableOpacity>
        </View>
        <View style={styles.buttonRow}>
          <TouchableOpacity style={styles.button} onPress={handleRemoveLast}>
            <Text style={styles.buttonText}>Remove Last</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.button} onPress={handleSwapFirstTwo}>
            <Text style={styles.buttonText}>Swap 0↔1</Text>
          </TouchableOpacity>
        </View>
        <View style={styles.buttonRow}>
          <TouchableOpacity
            style={[styles.button, styles.playButton]}
            onPress={handlePlayPause}
          >
            <Text style={styles.buttonText}>
              {isPlaying ? 'Pause' : 'Play'}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.button, styles.logButton]}
            onPress={logListItems}
          >
            <Text style={styles.buttonText}>Log Items</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

DataBindingListExample.metadata = {
  name: 'Data Binding Lists',
  description: 'Test data binding with list properties (ViewModelListProperty)',
} satisfies Metadata;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  riveContainer: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  rive: {
    flex: 1,
    width: '100%',
  },
  controls: {
    padding: 16,
    backgroundColor: '#f0f0f0',
  },
  infoText: {
    fontSize: 16,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 12,
  },
  buttonRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 8,
  },
  button: {
    backgroundColor: '#007AFF',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    minWidth: 120,
  },
  playButton: {
    backgroundColor: '#34C759',
  },
  logButton: {
    backgroundColor: '#666',
  },
  buttonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  errorText: {
    color: 'red',
    textAlign: 'center',
    padding: 20,
  },
});
