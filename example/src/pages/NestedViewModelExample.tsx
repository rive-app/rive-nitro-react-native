import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  Button,
} from 'react-native';
import { useEffect, useMemo, useState } from 'react';
import {
  Fit,
  RiveView,
  useRiveFile,
  useRiveEnum,
  type ViewModelInstance,
  type RiveFile,
} from '@rive-app/react-native';
import { type Metadata } from '../helpers/metadata';

export default function NestedViewModelExample() {
  const { riveFile, isLoading, error } = useRiveFile(
    require('../../assets/rive/person_databinding_test.riv')
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

  return <NestedViewModelTest instance={instance} file={file} />;
}

function NestedViewModelTest({
  instance,
  file,
}: {
  instance: ViewModelInstance;
  file: RiveFile;
}) {
  const [testResults, setTestResults] = useState<string[]>([]);

  // Test 1: Path notation (like rive-react does)
  const { value: drinkType, setValue: setDrinkType } = useRiveEnum(
    'favDrink/type',
    instance
  );

  useEffect(() => {
    const results: string[] = [];

    // Test 1: viewModelInstanceProperty - get nested instance
    const nestedDrink = instance.viewModelInstanceProperty('favDrink');
    if (nestedDrink) {
      results.push(
        `✅ viewModelInstanceProperty('favDrink') returned instance`
      );
      results.push(`   Instance name: ${nestedDrink.instanceName}`);

      // Try to get enum property from nested instance
      const typeFromNested = nestedDrink.enumProperty('type');
      if (typeFromNested) {
        results.push(
          `✅ nestedDrink.enumProperty('type'): ${typeFromNested.value}`
        );
      } else {
        results.push(`❌ nestedDrink.enumProperty('type') returned undefined`);
      }
    } else {
      results.push(
        `❌ viewModelInstanceProperty('favDrink') returned undefined`
      );
      results.push(
        `   (This file may use path notation, not ViewModel instance properties)`
      );
    }

    // Test 2: Direct path notation
    const directEnum = instance.enumProperty('favDrink/type');
    if (directEnum) {
      results.push(`✅ enumProperty('favDrink/type'): ${directEnum.value}`);
    } else {
      results.push(`❌ enumProperty('favDrink/type') returned undefined`);
    }

    setTestResults(results);
  }, [instance]);

  // Test 3: useRiveEnum hook result (shown separately as it updates reactively)
  const useRiveEnumResult = drinkType
    ? `✅ useRiveEnum('favDrink/type'): ${drinkType}`
    : `❌ useRiveEnum('favDrink/type'): undefined`;

  return (
    <View style={styles.content}>
      <RiveView
        style={styles.rive}
        autoPlay={true}
        dataBind={instance}
        fit={Fit.Contain}
        file={file}
      />

      <View style={styles.info}>
        <Text style={styles.title}>Test Results:</Text>
        {testResults.map((result, i) => (
          <Text key={i} style={styles.result}>
            {result}
          </Text>
        ))}
        <Text style={styles.result}>{useRiveEnumResult}</Text>

        <View style={styles.buttons}>
          <Button title="Coffee" onPress={() => setDrinkType('Coffee')} />
          <Button title="Tea" onPress={() => setDrinkType('Tea')} />
        </View>
      </View>
    </View>
  );
}

NestedViewModelExample.metadata = {
  name: 'Nested ViewModel',
  description:
    'Tests viewModelInstanceProperty() for accessing nested ViewModel instances',
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
  },
  title: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  result: {
    fontSize: 12,
    fontFamily: 'monospace',
    color: '#333',
    marginVertical: 2,
  },
  label: {
    fontSize: 14,
    color: '#666',
    marginTop: 12,
  },
  value: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  buttons: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 16,
  },
  errorText: {
    color: 'red',
    textAlign: 'center',
    padding: 20,
  },
});
