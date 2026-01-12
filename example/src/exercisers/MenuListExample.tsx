import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  TouchableOpacity,
  TextInput,
  ScrollView,
} from 'react-native';
import { useRef, useMemo } from 'react';
import {
  Fit,
  RiveView,
  type ViewModelInstance,
  type RiveFile,
  useRiveFile,
  useRiveList,
  useViewModelInstance,
} from '@rive-app/react-native';
import { type Metadata } from '../shared/metadata';

export default function MenuListExample() {
  const { riveFile, isLoading, error } = useRiveFile(
    require('../../assets/lists_demo.riv')
  );

  return (
    <View style={styles.container}>
      {isLoading ? (
        <ActivityIndicator size="large" color="#007AFF" />
      ) : riveFile ? (
        <MenuList file={riveFile} />
      ) : (
        <Text style={styles.errorText}>{error || 'Unexpected error'}</Text>
      )}
    </View>
  );
}

function MenuList({ file }: { file: RiveFile }) {
  const instance = useViewModelInstance(file, { required: true });

  if (!instance) {
    return <ActivityIndicator size="large" color="#007AFF" />;
  }

  return <MenuListContent file={file} instance={instance} />;
}

function MenuListContent({
  file,
  instance,
}: {
  file: RiveFile;
  instance: ViewModelInstance;
}) {
  const addLabelRef = useRef<TextInput>(null);
  const lastAdded = useRef<ViewModelInstance | null>(null);
  const indexToDeleteRef = useRef<TextInput>(null);
  const index1Ref = useRef<TextInput>(null);
  const index2Ref = useRef<TextInput>(null);
  const updateIndexRef = useRef<TextInput>(null);
  const updateLabelRef = useRef<TextInput>(null);

  const addLabelValue = useRef('New Item');
  const indexToDeleteValue = useRef('0');
  const index1Value = useRef('0');
  const index2Value = useRef('1');
  const updateIndexValue = useRef('0');
  const updateLabelValue = useRef('Updated Item');

  const {
    length,
    addInstance,
    removeInstance,
    removeInstanceAt,
    getInstanceAt,
    swap,
    error,
  } = useRiveList('menu', instance);

  const listItemViewModel = useMemo(
    () => file.viewModelByName('listItem'),
    [file]
  );

  const addNewMenuItem = (label: string) => {
    if (!listItemViewModel) return;

    const newMenuItemVmi = listItemViewModel.createInstance();
    if (!newMenuItemVmi) return;

    const labelProperty = newMenuItemVmi.stringProperty('label');
    const hoverColorProperty = newMenuItemVmi.colorProperty('hoverColor');
    const fontIconProperty = newMenuItemVmi.stringProperty('fontIcon');

    if (!labelProperty || !hoverColorProperty || !fontIconProperty) return;

    labelProperty.value = label;
    hoverColorProperty.value = 0xff323232;
    fontIconProperty.value = '';

    lastAdded.current = newMenuItemVmi;
    addInstance(newMenuItemVmi);
  };

  const removeLastAdded = () => {
    if (lastAdded.current) {
      removeInstance(lastAdded.current);
      lastAdded.current = null;
    }
  };

  const removeByIndex = (index: number) => {
    removeInstanceAt(index);
  };

  const swapIndexes = (index1: number, index2: number) => {
    swap(index1, index2);
  };

  const updateLabelAtIndex = (index: number, label: string) => {
    const menuItem = getInstanceAt(index);
    if (!menuItem) return;

    const menuItemLabel = menuItem.stringProperty('label');
    if (!menuItemLabel) return;

    menuItemLabel.value = label;
  };

  return (
    <View style={styles.container}>
      <RiveView
        style={styles.rive}
        autoPlay={true}
        dataBind={instance}
        fit={Fit.FitWidth}
        file={file}
      />

      <ScrollView style={styles.controls}>
        <Text style={styles.listLength}>Menu Items: {length}</Text>
        {error && <Text style={styles.errorText}>{error.message}</Text>}

        <View style={styles.controlGroup}>
          <TextInput
            ref={addLabelRef}
            style={styles.input}
            placeholder="label"
            defaultValue="New Item"
            onChangeText={(text) => (addLabelValue.current = text)}
          />
          <TouchableOpacity
            style={styles.button}
            onPress={() => addNewMenuItem(addLabelValue.current)}
          >
            <Text style={styles.buttonText}>Add Menu Item</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.button} onPress={removeLastAdded}>
            <Text style={styles.buttonText}>Delete Last Added</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.controlGroup}>
          <TextInput
            ref={indexToDeleteRef}
            style={styles.inputSmall}
            keyboardType="numeric"
            defaultValue="0"
            onChangeText={(text) => (indexToDeleteValue.current = text)}
          />
          <TouchableOpacity
            style={styles.button}
            onPress={() =>
              removeByIndex(parseInt(indexToDeleteValue.current, 10))
            }
          >
            <Text style={styles.buttonText}>Remove by Index</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.controlGroup}>
          <TextInput
            ref={index1Ref}
            style={styles.inputSmall}
            keyboardType="numeric"
            defaultValue="0"
            onChangeText={(text) => (index1Value.current = text)}
          />
          <TextInput
            ref={index2Ref}
            style={styles.inputSmall}
            keyboardType="numeric"
            defaultValue="1"
            onChangeText={(text) => (index2Value.current = text)}
          />
          <TouchableOpacity
            style={styles.button}
            onPress={() =>
              swapIndexes(
                parseInt(index1Value.current, 10),
                parseInt(index2Value.current, 10)
              )
            }
          >
            <Text style={styles.buttonText}>Swap Indexes</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.controlGroup}>
          <TextInput
            ref={updateIndexRef}
            style={styles.inputSmall}
            keyboardType="numeric"
            defaultValue="0"
            onChangeText={(text) => (updateIndexValue.current = text)}
          />
          <TextInput
            ref={updateLabelRef}
            style={styles.input}
            placeholder="label"
            defaultValue="Updated Item"
            onChangeText={(text) => (updateLabelValue.current = text)}
          />
          <TouchableOpacity
            style={styles.button}
            onPress={() =>
              updateLabelAtIndex(
                parseInt(updateIndexValue.current, 10),
                updateLabelValue.current
              )
            }
          >
            <Text style={styles.buttonText}>Update Label</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
}

MenuListExample.metadata = {
  name: 'Menu List',
  description: 'Data binding lists demo adapted from rive-react codesandbox',
} satisfies Metadata;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1a1a2e',
  },
  rive: {
    height: 350,
    width: '100%',
  },
  controls: {
    flex: 1,
    padding: 16,
    backgroundColor: '#16213e',
  },
  listLength: {
    fontSize: 18,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 16,
    color: '#fff',
  },
  controlGroup: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#333',
  },
  input: {
    flex: 1,
    minWidth: 100,
    backgroundColor: '#fff',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 6,
    fontSize: 14,
  },
  inputSmall: {
    width: 50,
    backgroundColor: '#fff',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 6,
    fontSize: 14,
    textAlign: 'center',
  },
  button: {
    backgroundColor: '#0f4c75',
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 6,
  },
  buttonText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: 'bold',
  },
  errorText: {
    color: 'red',
    textAlign: 'center',
    padding: 20,
    fontSize: 16,
  },
});
