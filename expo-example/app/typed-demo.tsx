import '@example/polyfills';
import { useState } from 'react';
import {
  ActivityIndicator,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Stack } from 'expo-router';
import {
  Fit,
  RiveView,
  useRiveFile,
  useRiveNumber,
  useRiveEnum,
  useRiveColor,
  useViewModelInstance,
  type TypedRiveFile,
} from '@rive-app/react-native';
// The generated rewards_source.riv.d.ts (yarn rive-gen-types) types this
// import — artboard/state machine/ViewModel names and property paths below
// are all checked against the actual file contents at compile time.
import rewardsRiv from '../assets/rive/rewards_source.riv';

export default function TypedDemoScreen() {
  const { riveFile, isLoading, error } = useRiveFile(rewardsRiv);

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ title: 'Typed Schema Demo' }} />
      {isLoading ? (
        <ActivityIndicator size="large" />
      ) : riveFile ? (
        <TypedDemo file={riveFile} />
      ) : (
        <Text style={styles.error}>{error?.message ?? 'Failed to load'}</Text>
      )}
    </View>
  );
}

function TypedDemo({ file }: { file: TypedRiveFile<typeof rewardsRiv> }) {
  const { instance, error } = useViewModelInstance(file, {
    viewModelName: 'Rewards',
    async: true,
  });

  // Typed paths: 'Price_Value' is a number on Rewards, 'Coin/Item_Value' is a
  // nested number, and the enum value type is exactly 'Coin' | 'Gem'.
  const { value: price, setValue: setPrice } = useRiveNumber(
    'Price_Value',
    instance
  );
  const { value: coinValue, setValue: setCoinValue } = useRiveNumber(
    'Coin/Item_Value',
    instance
  );
  const { value: itemKind, setValue: setItemKind } = useRiveEnum(
    'Item_Selection/Item_Selection',
    instance
  );
  const { setValue: setBarColor } = useRiveColor(
    'Energy_Bar/Bar_Color',
    instance
  );
  const [colorIdx, setColorIdx] = useState(0);

  if (error) {
    return <Text style={styles.error}>{error.message}</Text>;
  }
  if (!instance) {
    return <ActivityIndicator size="large" />;
  }

  const colors = ['#0000FF', '#FF0000', '#00CC66'] as const;

  return (
    <>
      <RiveView
        style={styles.rive}
        file={file}
        artboardName="Main"
        stateMachineName="State Machine 1"
        autoPlay={true}
        dataBind={instance}
        fit={Fit.Layout}
        layoutScaleFactor={1}
      />
      <View style={styles.panel}>
        <Text style={styles.value} testID="price">
          Price_Value: {price ?? '…'}
        </Text>
        <Text style={styles.value} testID="coin">
          Coin/Item_Value: {coinValue ?? '…'}
        </Text>
        <Text style={styles.value} testID="kind">
          Item_Selection: {itemKind ?? '…'}
        </Text>
        <View style={styles.row}>
          <TouchableOpacity
            style={styles.button}
            testID="bump-price"
            onPress={() => setPrice((price ?? 0) + 10)}
          >
            <Text style={styles.buttonText}>Price +10</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.button}
            testID="bump-coin"
            onPress={() => setCoinValue((coinValue ?? 0) + 1)}
          >
            <Text style={styles.buttonText}>Coin +1</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.button}
            testID="toggle-kind"
            onPress={() => setItemKind(itemKind === 'Coin' ? 'Gem' : 'Coin')}
          >
            <Text style={styles.buttonText}>Coin/Gem</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.button}
            testID="cycle-color"
            onPress={() => {
              const next = (colorIdx + 1) % colors.length;
              setColorIdx(next);
              setBarColor(colors[next]!);
            }}
          >
            <Text style={styles.buttonText}>Bar color</Text>
          </TouchableOpacity>
        </View>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  rive: {
    flex: 1,
    width: '100%',
  },
  panel: {
    padding: 16,
    paddingBottom: 32,
    borderTopWidth: 1,
    borderTopColor: '#E5E5E5',
    gap: 4,
  },
  value: {
    fontSize: 15,
    fontVariant: ['tabular-nums'],
  },
  row: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 8,
  },
  button: {
    flex: 1,
    backgroundColor: '#007AFF',
    borderRadius: 8,
    padding: 10,
    alignItems: 'center',
  },
  buttonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 12,
  },
  error: {
    color: 'red',
    textAlign: 'center',
    padding: 20,
  },
});
