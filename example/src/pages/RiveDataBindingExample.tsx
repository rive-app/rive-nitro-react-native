import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  Button,
} from 'react-native';
import { useEffect, useMemo, useState, useRef } from 'react';
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

  // Direct addListener usage (without hooks)
  const [coinValue, setCoinValue] = useState<number | null>(null);
  const [isListening, setIsListening] = useState(true);
  const removeListenerRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    const coinProperty = instance.numberProperty('Coin/Item_Value');
    if (!coinProperty) return;

    // Add listener and store the remover function
    removeListenerRef.current = coinProperty.addListener((value) => {
      console.log('Coin value changed:', value);
      setCoinValue(value);
    });

    return () => {
      // Clean up on unmount
      removeListenerRef.current?.();
    };
  }, [instance]);

  const toggleListener = () => {
    if (isListening && removeListenerRef.current) {
      // Remove the listener by calling the remover function
      removeListenerRef.current();
      removeListenerRef.current = null;
      setIsListening(false);
    } else if (!isListening) {
      // Re-add the listener
      const coinProperty = instance.numberProperty('Coin/Item_Value');
      if (coinProperty) {
        removeListenerRef.current = coinProperty.addListener((value) => {
          console.log('Coin value changed:', value);
          setCoinValue(value);
        });
        setIsListening(true);
      }
    }
  };

  return (
    <View style={styles.flex}>
      <View style={styles.listenerDemo}>
        <Text style={styles.listenerText}>
          Coin Value: {coinValue ?? 'N/A'}{' '}
          {isListening ? '(listening)' : '(paused)'}
        </Text>
        <Button
          title={isListening ? 'Remove Listener' : 'Add Listener'}
          onPress={toggleListener}
        />
      </View>
      <RiveView
        style={styles.rive}
        autoPlay={true}
        dataBind={instance}
        fit={Fit.Layout}
        layoutScaleFactor={1}
        file={file}
      />
    </View>
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
  flex: {
    flex: 1,
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
  listenerDemo: {
    padding: 16,
    backgroundColor: '#e8e8e8',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  listenerText: {
    fontSize: 16,
    fontWeight: '500',
  },
});
