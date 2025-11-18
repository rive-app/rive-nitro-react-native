import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { Fit, RiveView, useRiveFile } from 'react-native-rive';
import { type Metadata } from '../helpers/metadata';

export default function WithRiveFile() {
  const { riveFile, isLoading, error } = useRiveFile(
    require('../../assets/rive/rewards_source.riv')
  );

  return (
    <View style={styles.container}>
      <View style={styles.riveContainer}>
        {isLoading ? (
          <ActivityIndicator size="large" color="#0000ff" />
        ) : riveFile ? (
          <RiveView
            style={styles.rive}
            autoPlay={true}
            fit={Fit.Layout}
            layoutScaleFactor={1}
            file={riveFile}
            values={{
              'Button/State_1': "Let's go!",
            }}
          />
        ) : (
          <Text style={styles.errorText}>{error || 'Unexpected error'}</Text>
        )}
      </View>
    </View>
  );
}

WithRiveFile.metadata = {
  name: 'Data Binding',
  description:
    'Shows declarative data binding using the values prop (simplified API)',
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

/*
 * OLD IMPLEMENTATION (for reference):
 * Before the 'values' prop, this required 3 components and multiple hooks:
 *
 * function WithViewModelSetup({ file }: { file: RiveFile }) {
 *   const viewModel = useMemo(() => file.defaultArtboardViewModel(), [file]);
 *   const instance = useMemo(() => viewModel?.createDefaultInstance(), [viewModel]);
 *   return <DataBindingExample instance={instance} file={file} />;
 * }
 *
 * function DataBindingExample({ instance, file }) {
 *   const { setValue: setButtonText } = useRiveString('Button/State_1', instance);
 *   const { setValue: setBarColor } = useRiveColor('Energy_Bar/Bar_Color', instance);
 *
 *   useEffect(() => {
 *     setButtonText("Let's go!");
 *     setBarColor('#0000FF');
 *   }, [setBarColor, setButtonText]);
 *
 *   return <RiveView file={file} dataBind={instance} />;
 * }
 */
