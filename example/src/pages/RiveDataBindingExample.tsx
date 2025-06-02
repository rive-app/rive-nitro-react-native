import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { useState, useEffect } from 'react';
import {
  Fit,
  RiveView,
  useRive,
  useRiveNumber,
  type ViewModelInstance,
  useRiveString,
  useRiveColor,
  useRiveTrigger,
  useRiveFile,
} from 'react-native-rive';

export default function DataBindingExample() {
  const { riveViewRef, setHybridRef } = useRive();
  const [viewModelInstance, setViewModelInstance] =
    useState<ViewModelInstance | null>(null);
  const [viewModelError, setViewModelError] = useState<string | null>(null);

  const { riveFile, isLoading, error } = useRiveFile(
    require('../../assets/rive/rewards_source.riv')
  );

  // Create view model instance when Rive file is loaded
  useEffect(() => {
    if (riveFile) {
      try {
        const viewModel = riveFile.defaultArtboardViewModel();
        if (!viewModel) {
          throw new Error('No default artboard view model found');
        }
        const instance = viewModel.createDefaultInstance();
        if (!instance) {
          throw new Error('Failed to create view model instance');
        }
        setViewModelInstance(instance);
        setViewModelError(null);
      } catch (err) {
        setViewModelError(
          err instanceof Error
            ? err.message
            : 'Failed to create view model instance'
        );
        setViewModelInstance(null);
      }
    }
  }, [riveFile]);

  // Cleanup view model instance when component unmounts or the view model instance changes
  useEffect(() => {
    return () => {
      viewModelInstance?.dispose();
    };
  }, [viewModelInstance]);

  // Bind the view model instance to the RiveView
  useEffect(() => {
    if (viewModelInstance && riveViewRef) {
      try {
        console.log('Binding the instance');
        riveViewRef.bindViewModelInstance(viewModelInstance);
      } catch (err) {
        console.error('Failed to bind view model instance:', err);
      }
    }
  }, [viewModelInstance, riveViewRef]);

  // Databinding: Number
  const { value: coinValue, error: coinValueError } = useRiveNumber(
    'Coin/Item_Value',
    viewModelInstance
  );
  useEffect(() => {
    if (coinValue !== undefined) {
      console.log('coinValue', coinValue);
    }
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
      try {
        setButtonText("Let's go!");
        setBarColor('#0000FF');
      } catch (err) {
        console.error('Failed to set initial values:', err);
      }
    }
  }, [setBarColor, setButtonText, viewModelInstance]);

  return (
    <View style={styles.container}>
      <View style={styles.riveContainer}>
        {error || viewModelError ? (
          <Text style={styles.errorText}>{error || viewModelError}</Text>
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
