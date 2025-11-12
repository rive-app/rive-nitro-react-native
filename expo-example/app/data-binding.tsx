import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  Button,
} from 'react-native';
import { useState, useEffect, useRef, useMemo } from 'react';
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
  type RiveFile,
} from 'react-native-rive';

class MyProxyInstance<T> {
  original: T;
  __dummy: string;
  constructor({
    __dummy,
    original,
    createDefaultInstance,
  }: {
    __dummy: string;
    original: T;
    createDefaultInstance?: boolean;
  }) {
    this.original = original;
    this.__dummy = __dummy;
  }
}

// Usage example:
// const dummyInstance = new ProxyInstance({ __dummy: true, original: viewModel.createViewInstance() });

function DataBindingExampleOriginal() {
  const { riveViewRef, setHybridRef } = useRive();
  const [viewModelInstance, setViewModelInstance] =
    useState<MyProxyInstance<ViewModelInstance> | null>(null);
  const [viewModelError, setViewModelError] = useState<string | null>(null);
  const viewModelInstanceRef =
    useRef<MyProxyInstance<ViewModelInstance> | null>(null);

  const { riveFile, isLoading, error } = useRiveFile(
    require('@/assets/rive/rewards_source.riv')
  );

  // Create view model instance when Rive file is loaded
  useEffect(() => {
    if (riveFile) {
      try {
        const viewModel = riveFile.defaultArtboardViewModel();
        if (!viewModel) {
          throw new Error('No default artboard view model found');
        }
        //
        let oinstance = viewModel.createDefaultInstance();
        if (!oinstance) {
          throw new Error('Failed to create view model instance');
        }
        const instance = new MyProxyInstance({
          __dummy: 'createDefaultInstance',
          createDefaultInstance: true,
          original: oinstance,
        });
        viewModelInstanceRef.current = instance;
        setViewModelInstance(instance);
        setViewModelError(null);
      } catch (err) {
        setViewModelError(
          err instanceof Error
            ? err.message
            : 'Failed to create view model instance'
        );
        viewModelInstanceRef.current = null;
        setViewModelInstance(null);
      }
    }
  }, [riveFile]);

  useEffect(() => {
    return () => {
      console.log(
        'Disposing view model instance',
        viewModelInstanceRef.current
      );
      //viewModelInstanceRef.current?.dispose();
      console.log('Disposed view model instance');
    };
  }, []);

  // Bind the view model instance to the RiveView
  function bindInstance() {
    if (viewModelInstance && riveViewRef) {
      try {
        console.log('Binding the instance');
        riveViewRef.bindViewModelInstance(viewModelInstance.original);
      } catch (err) {
        console.error('Failed to bind view model instance:', err);
      }
    }
  }
  useEffect(bindInstance, [viewModelInstance, riveViewRef]);

  // Databinding: Number
  const { value: coinValue, error: coinValueError } = useRiveNumber(
    'Coin/Item_Value',
    viewModelInstance?.original
  );
  //useWatchValueDBG(coinValue, 'coinValue');

  if (coinValueError) {
    console.error('coinValueError', coinValueError);
  }

  // Databinding: String
  const { value: buttonText, setValue: setButtonText } = useRiveString(
    'Button/State_1',
    viewModelInstance?.original
  );
  //useWatchValueDBG(buttonText, 'buttonText');

  // Databinding: Color
  const {
    value: barColor,
    setValue: setBarColor,
    error: barColorError,
  } = useRiveColor('Energy_Bar/Bar_Color', viewModelInstance?.original);
  if (barColorError) {
    console.error('barColorError', barColorError);
  }
  //xwuseWatchValueDBG(barColor, 'barColor');

  // Databinding: Trigger
  const { error: triggerError } = useRiveTrigger(
    'Button/Pressed',
    viewModelInstance?.original,
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
  function mySetInitialValues() {
    if (viewModelInstance) {
      try {
        setButtonText("Let's go!");
        setBarColor('#0000FF');
      } catch (err) {
        console.error('Failed to set initial values:', err);
      }
    }
  }

  useEffect(mySetInitialValues, [
    setBarColor,
    setButtonText,
    viewModelInstance,
  ]);

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
        {/*false && (
          <Button
            title="Change Button Text"
            onPress={() => {
              setButtonText('Clicked!');
            }}
          />
        )*/}
        <Button
          title="Invoke GC"
          onPress={() => {
            if (typeof global.gc === 'function') {
              global.gc();
            } else {
              console.error('global.gc is not available');
            }
          }}
        />
      </View>
    </View>
  );
}

function DataBindingExample2() {
  const { riveFile, isLoading, error } = useRiveFile(
    require('@/assets/rive/rewards_source.riv')
  );

  return (
    <View style={styles.container}>
      <View style={styles.riveContainer}>
        {isLoading ? (
          <ActivityIndicator size="large" color="#0000ff" />
        ) : riveFile ? (
          <ExampleWithFile file={riveFile} />
        ) : (
          <Text style={styles.errorText}>{error || 'unexpected error'}</Text>
        )}
      </View>
    </View>
  );
}

function ExampleWithFile({ file }: { file: RiveFile }) {
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

  return <ExampleWithInstance instance={instance} file={file} />;
}

/*
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
      {false && (
        <Button
          title="Change Button Text"
          onPress={() => {
            setButtonText('Clicked!');
          }}
        />
      )}
      <Button
        title="Invoke GC"
        onPress={() => {
          if (typeof global.gc === 'function') {
            global.gc();
          } else {
            console.error('global.gc is not available');
          }
        }}
      />
    </View>
  </View>
);
}
*/

function ExampleWithInstance({
  instance,
  file,
}: {
  instance: ViewModelInstance;
  file: RiveFile;
}) {
  const { riveViewRef, setHybridRef } = useRive();

  useEffect(() => {
    if (riveViewRef) {
      riveViewRef.bindViewModelInstance(instance);
    }
  }, [riveViewRef, instance]);

  // Databinding: Number
  const { value: coinValue, error: coinValueError } = useRiveNumber(
    'Coin/Item_Value',
    instance
  );
  useWatchValueDBG(coinValue, 'coinValue');

  if (coinValueError) {
    console.error('coinValueError', coinValueError);
  }

  // Databinding: String
  const { value: buttonText, setValue: setButtonText } = useRiveString(
    'Button/State_1',
    instance
  );
  useWatchValueDBG(buttonText, 'buttonText');

  // Databinding: Color
  const {
    value: barColor,
    setValue: setBarColor,
    error: barColorError,
  } = useRiveColor('Energy_Bar/Bar_Color', instance);
  if (barColorError) {
    console.error('barColorError', barColorError);
  }
  useWatchValueDBG(barColor, 'barColor');

  // Databinding: Trigger
  const { error: triggerError } = useRiveTrigger('Button/Pressed', instance, {
    onTrigger: () => {
      console.log('Button pressed');
    },
  });
  if (triggerError) {
    console.error('triggerError', triggerError);
  }

  // Set the initial values of the properties
  useEffect(() => {
    if (instance) {
      try {
        setButtonText("Let's go!");
        setBarColor('#0000FF');
      } catch (err) {
        console.error('Failed to set initial values:', err);
      }
    }
  }, [setBarColor, setButtonText, instance]);

  return (
    <>
      <RiveView
        style={styles.rive}
        autoBind={false}
        autoPlay={true}
        fit={Fit.Layout}
        layoutScaleFactor={1}
        file={file}
        hybridRef={setHybridRef}
      />
      <Button
        title="Invoke GC"
        onPress={() => {
          if (typeof global.gc === 'function') {
            global.gc();
          } else {
            console.error('global.gc is not available');
          }
        }}
      />
    </>
  );
}

export default DataBindingExampleOriginal;

function useWatchValueDBG<T>(value: T, name: string) {
  useEffect(() => {
    console.log(`${name} changed:`, value);
  }, [name, value]);
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
