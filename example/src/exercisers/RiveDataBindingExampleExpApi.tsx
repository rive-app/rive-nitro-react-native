import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { useEffect, useState } from 'react';
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
} from '@rive-app/react-native';
import { type Metadata } from '../shared/metadata';

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
  const [instance, setInstance] = useState<ViewModelInstance | undefined>(
    undefined
  );
  const [setupError, setSetupError] = useState<string | undefined>(undefined);

  useEffect(() => {
    let cancelled = false;

    async function setup() {
      const viewModel = await file.defaultArtboardViewModelAsync();
      if (cancelled) return;

      if (!viewModel) {
        setSetupError('No view model found');
        return;
      }

      const vmi = await viewModel.createDefaultInstanceAsync();
      if (cancelled) return;

      if (!vmi) {
        setSetupError('Failed to create view model instance');
        return;
      }

      setInstance(vmi);
    }

    setup().catch((e: unknown) => {
      if (!cancelled) {
        setSetupError(String(e));
      }
    });

    return () => {
      cancelled = true;
    };
  }, [file]);

  if (setupError) {
    return <Text style={styles.errorText}>{setupError}</Text>;
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
  name: 'Data Binding (expapi)',
  description:
    'Same as Data Binding but uses the async API (defaultArtboardViewModelAsync / createDefaultInstanceAsync)',
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
