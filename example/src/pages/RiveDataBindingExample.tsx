import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { useEffect, useMemo } from 'react';
import {
  Fit,
  RiveView,
  useRiveNumber,
  type ViewModelInstance,
  type RiveFile,
  useRiveString,
  useRiveColor,
  useRiveTrigger,
  useRiveFile,
} from 'react-native-rive';
import { type Metadata } from '../helpers/metadata';

export default function WithRiveFile() {
  const { riveFile, isLoading, error } = useRiveFile(
    require('../../assets/rive/rewards.riv')
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

  return <DataBindingExample instance={instance} file={file} />;
}

function DataBindingExample({
  instance,
  file,
}: {
  instance: ViewModelInstance;
  file: RiveFile;
}) {
  const { error: coinValueError } = useRiveNumber('Coin/Item_Value', instance);

  if (coinValueError) {
    console.error('coinValueError', coinValueError);
  }

  const { setValue: setButtonText } = useRiveString('Button/State_1', instance);

  const { setValue: setBarColor, error: barColorError } = useRiveColor(
    'Energy_Bar/Bar_Color',
    instance
  );

  if (barColorError) {
    console.error('barColorError', barColorError);
  }

  const { error: triggerError } = useRiveTrigger('Button/Pressed', instance, {
    onTrigger: () => {
      console.log('Button pressed');
    },
  });

  if (triggerError) {
    console.error('triggerError', triggerError);
  }

  useEffect(() => {
    setButtonText("Let's go!");
    setBarColor('#0000FF');
  }, [setBarColor, setButtonText]);

  return (
    <RiveView
      style={styles.rive}
      autoPlay={true}
      dataBind={instance}
      fit={Fit.Layout}
      layoutScaleFactor={1}
      file={file}
    />
  );
}

WithRiveFile.metadata = {
  name: 'Data Binding',
  description:
    'Shows data binding with view models, including number, string, color properties and triggers',
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
    height: '100%',
  },
  errorText: {
    color: 'red',
    textAlign: 'center',
    padding: 20,
  },
});
