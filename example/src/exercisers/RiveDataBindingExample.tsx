import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { useEffect } from 'react';
import {
  Fit,
  RiveView,
  useRiveNumber,
  useViewModelInstance,
  type TypedViewModelInstance,
  type TypedRiveFile,
  useRiveString,
  useRiveColor,
  useRiveTrigger,
  useRiveFile,
  type RiveAsset,
} from '@rive-app/react-native';
import { type Metadata } from '../shared/metadata';
import rewardsRiv from '../../assets/rive/rewards.riv';

type RewardsSchema = typeof rewardsRiv extends RiveAsset<infer T> ? T : never;
type RewardsFile = TypedRiveFile<RewardsSchema>;
type RewardsInstance = TypedViewModelInstance<RewardsSchema, 'Rewards'>;

export default function WithRiveFile() {
  const { riveFile, isLoading, error } = useRiveFile(rewardsRiv);

  return (
    <View style={styles.container}>
      <View style={styles.riveContainer}>
        {isLoading ? (
          <ActivityIndicator size="large" color="#0000ff" />
        ) : riveFile ? (
          <WithViewModelSetup file={riveFile} />
        ) : (
          <Text style={styles.errorText}>
            {error?.message || 'Unexpected error'}
          </Text>
        )}
      </View>
    </View>
  );
}

function WithViewModelSetup({ file }: { file: RewardsFile }) {
  const { instance, error } = useViewModelInstance(file, {
    viewModelName: 'Rewards',
    async: true,
  });

  if (error) {
    console.error(error.message);
    return <Text style={{ color: 'red' }}>{error.message}</Text>;
  }

  if (!instance) {
    return <ActivityIndicator size="large" color="#0000ff" />;
  }

  return <DataBindingExample instance={instance} file={file} />;
}

function DataBindingExample({
  instance,
  file,
}: {
  instance: RewardsInstance;
  file: RewardsFile;
}) {
  const { error: coinValueError } = useRiveNumber('Coin/Item_Value', instance);

  if (coinValueError) {
    console.error('coinValueError', coinValueError);
  }

  const { setValue: setButtonText } = useRiveString(
    'Button/Item_Text',
    instance
  );

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
