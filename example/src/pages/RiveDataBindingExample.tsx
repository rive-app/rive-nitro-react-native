import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { useState, useEffect } from 'react';
import {
  Fit,
  RiveView,
  RiveFileFactory,
  useRive,
  useRiveNumber,
  type RiveFile,
  type ViewModelInstance,
  useRiveString,
  useRiveColor,
  useRiveTrigger,
} from 'react-native-rive';

export default function DataBindingExample() {
  const { riveViewRef, setHybridRef } = useRive();
  const [riveFile, setRiveFile] = useState<RiveFile | null>(null);
  const [viewModelInstance, setViewModelInstance] =
    useState<ViewModelInstance | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Load Rive file immediately
  useEffect(() => {
    const initializeRiveFileAndData = async () => {
      try {
        const file = await RiveFileFactory.fromSource(
          require('../../assets/rive/rewards_source.riv')
        );
        setRiveFile(file);
        const viewModel = file.defaultArtboardViewModel();
        setViewModelInstance(viewModel?.createDefaultInstance() ?? null);
        setIsLoading(false);
        setError(null);
      } catch (err) {
        setError(
          err instanceof Error ? err.message : 'Failed to load Rive file'
        );
        setIsLoading(false);
      }
    };

    initializeRiveFileAndData();
  }, []);

  // Release the Rive file when the component unmounts
  useEffect(() => {
    return () => {
      if (riveFile) {
        riveFile.release(); // IMPORTANT: This ensures that the native resources are deleted
      }
    };
  }, [riveFile]);

  // Bind the view model instance to the RiveView
  useEffect(() => {
    if (viewModelInstance && riveViewRef) {
      console.log('Binding the instance');
      riveViewRef?.bindViewModelInstance(viewModelInstance);
    }
  }, [viewModelInstance, riveViewRef]);

  // Databinding: Number
  const { value: coinValue, error: coinValueError } = useRiveNumber(
    'Coin/Item_Value',
    viewModelInstance
  );
  useEffect(() => {
    console.log('coinValue', coinValue);
  }, [coinValue]);

  if (coinValueError) {
    console.error('coinValueError', coinValueError);
  }

  // Databinding: String
  const { value: buttonText, setValue: setButtonText } = useRiveString(
    'Button/State_1',
    viewModelInstance
  );
  useEffect(() => {
    if (buttonText) {
      console.log('buttonText', buttonText);
    }
  }, [buttonText]);

  // Databinding: Color
  const {
    value: barColor,
    setValue: setBarColor,
    error: barColorError,
  } = useRiveColor('Energy_Bar/Bar_Color', viewModelInstance);
  if (barColorError) {
    console.error('barColorError', barColorError);
  }

  useEffect(() => {
    if (barColor) {
      console.log('barColor', barColor);
    }
  }, [barColor]);

  // Databinding: Trigger
  const { error: triggerError } = useRiveTrigger(
    'Button/Pressed',
    viewModelInstance,
    {
      onTrigger: () => {
        console.log('Button pressed');
      },
    }
  );
  if (triggerError) {
    console.error('triggerError', triggerError);
  }

  // Set the initial values of the properties
  useEffect(() => {
    if (viewModelInstance) {
      setButtonText("Let's go!");
      setBarColor('#0000FF');
      // setBarColor({ r: 0, g: 255, b: 0, a: 255 });
    }
  }, [setBarColor, setButtonText, viewModelInstance]);

  return (
    <View style={styles.container}>
      <View style={styles.riveContainer}>
        {error ? (
          <Text style={styles.errorText}>{error}</Text>
        ) : isLoading ? (
          <ActivityIndicator size="large" color="#0000ff" />
        ) : (
          <RiveView
            style={styles.rive}
            autoBind={false}
            autoPlay={true}
            fit={Fit.Layout}
            layoutScaleFactor={1}
            file={riveFile!}
            hybridRef={setHybridRef}
          />
        )}
      </View>
    </View>
  );
}

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
