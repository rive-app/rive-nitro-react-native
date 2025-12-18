import { useEffect, useState, useRef } from 'react';
import {
  ScrollView,
  StyleSheet,
  View,
  TextInput,
  Text,
  Modal,
  Button,
} from 'react-native';
import {
  Fit,
  RiveView,
  RiveColor,
  useRiveFile,
  useViewModelInstance,
  useRiveColor,
  useRiveNumber,
  useRiveString,
  useRiveTrigger,
} from '@rive-app/react-native';
import Slider from '@react-native-community/slider';
import { useNavigation } from '@navigation';
import type { Metadata } from '../helpers/metadata';

export default function DataBinding() {
  const navigation = useNavigation();
  const { riveFile } = useRiveFile(require('../../assets/rive/rewards.riv'));
  const viewModelInstance = useViewModelInstance(riveFile);

  const { value: buttonText, setValue: setButtonText } = useRiveString(
    'Button/State_1',
    viewModelInstance
  );
  const { value: lives, setValue: setLives } = useRiveNumber(
    'Energy_Bar/Lives',
    viewModelInstance
  );
  const { value: barColor, setValue: setBarColor } = useRiveColor(
    'Energy_Bar/Bar_Color',
    viewModelInstance
  );
  const { value: price, setValue: setPrice } = useRiveNumber(
    'Price_Value',
    viewModelInstance
  );
  const { value: coinValue } = useRiveNumber(
    'Coin/Item_Value',
    viewModelInstance
  );

  useRiveTrigger('Button/Pressed', viewModelInstance, {
    onTrigger: () => console.log('Button pressed'),
  });

  useEffect(() => {
    if (coinValue !== undefined) {
      console.log('coinValue changed:', coinValue);
    }
  }, [coinValue]);

  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    navigation.setOptions({
      // eslint-disable-next-line react/no-unstable-nested-components
      headerRight: () => (
        <Button title="Controls" onPress={() => setIsOpen(true)} />
      ),
    });
  }, [navigation]);

  const [livesInput, setLivesInput] = useState('');
  const [priceInput, setPriceInput] = useState('');
  const [previewColor, setPreviewColor] = useState<RiveColor>(
    new RiveColor(0, 255, 0, 255)
  );
  const [sliderValues, setSliderValues] = useState({
    r: 0,
    g: 255,
    b: 0,
    a: 255,
  });
  const [textInput, setTextInput] = useState('');

  const initialValuesSet = useRef(false);

  useEffect(() => {
    if (
      !initialValuesSet.current &&
      buttonText !== undefined &&
      lives !== undefined &&
      barColor !== undefined &&
      price !== undefined
    ) {
      setTextInput(buttonText);
      setLivesInput(lives.toString());
      setPriceInput(price.toString());
      setPreviewColor(barColor);
      setSliderValues({
        r: barColor.r,
        g: barColor.g,
        b: barColor.b,
        a: barColor.a,
      });
      initialValuesSet.current = true;
    }
  }, [buttonText, lives, barColor, price]);

  const handleTextChange = (text: string) => {
    setTextInput(text);
  };

  const handleTextBlur = () => {
    setButtonText(textInput);
  };

  const handleLivesChange = (text: string) => {
    setLivesInput(text);
    const value = parseInt(text, 10);
    if (!isNaN(value) && value >= 0 && value <= 9) {
      setLives(value);
    }
  };

  const handleLivesBlur = () => {
    const value = parseInt(livesInput, 10);
    if (!isNaN(value) && value >= 0 && value <= 9) {
      setLives(value);
    } else {
      setLives(3);
      setLivesInput('3');
    }
  };

  const handlePriceChange = (text: string) => {
    setPriceInput(text);
    const value = parseFloat(text);
    if (!isNaN(value) && value >= 0) {
      setPrice(value);
    }
  };

  const handlePriceBlur = () => {
    const value = parseFloat(priceInput);
    if (!isNaN(value) && value >= 0) {
      setPrice(value);
    } else {
      setPrice(0);
      setPriceInput('0');
    }
  };

  const handleSliderChange = (
    component: 'r' | 'g' | 'b' | 'a',
    value: number
  ) => {
    const newColor = new RiveColor(
      component === 'r' ? value : previewColor.r,
      component === 'g' ? value : previewColor.g,
      component === 'b' ? value : previewColor.b,
      component === 'a' ? value : previewColor.a
    );
    setPreviewColor(newColor);
    setBarColor(newColor);
  };

  const handleSliderComplete = (
    component: 'r' | 'g' | 'b' | 'a',
    value: number
  ) => {
    setSliderValues((prev) => ({
      ...prev,
      [component]: value,
    }));
  };

  if (!riveFile || !viewModelInstance) {
    return (
      <View style={styles.container}>
        <Text style={styles.loadingText}>Loading...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <RiveView
        fit={Fit.Layout}
        style={styles.animation}
        layoutScaleFactor={1}
        autoPlay={true}
        dataBind={viewModelInstance}
        file={riveFile}
      />
      <Modal
        visible={isOpen}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setIsOpen(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Controls</Text>
              <Button title="Close" onPress={() => setIsOpen(false)} />
            </View>

            <ScrollView style={styles.modalBody}>
              <Text style={styles.label}>Button Text</Text>
              <TextInput
                style={styles.input}
                value={textInput}
                onChangeText={handleTextChange}
                onBlur={handleTextBlur}
                placeholder="Enter button text"
              />

              <View style={styles.rowContainer}>
                <View style={styles.columnContainer}>
                  <Text style={styles.label}>Lives (0-9)</Text>
                  <TextInput
                    style={styles.input}
                    value={livesInput}
                    onChangeText={handleLivesChange}
                    onBlur={handleLivesBlur}
                    keyboardType="number-pad"
                    maxLength={1}
                    placeholder="Enter number of lives"
                  />
                </View>

                <View style={styles.columnContainer}>
                  <Text style={styles.label}>Price</Text>
                  <TextInput
                    style={styles.input}
                    value={priceInput}
                    onChangeText={handlePriceChange}
                    onBlur={handlePriceBlur}
                    keyboardType="decimal-pad"
                    placeholder="Enter price"
                  />
                </View>
              </View>

              <Text style={styles.label}>Bar Color</Text>
              <View style={styles.colorPickerContainer}>
                <View
                  style={[
                    styles.colorPreview,
                    {
                      backgroundColor: `rgba(${previewColor.r}, ${previewColor.g}, ${previewColor.b}, ${previewColor.a / 255})`,
                    },
                  ]}
                />
                <Text style={styles.colorValue}>
                  RGBA: {Math.round(previewColor.r)},{' '}
                  {Math.round(previewColor.g)}, {Math.round(previewColor.b)},{' '}
                  {Math.round((previewColor.a / 255) * 100)}%
                </Text>

                <View style={styles.sliderContainer}>
                  <Text style={styles.sliderLabel}>Red</Text>
                  <Slider
                    style={styles.slider}
                    minimumValue={0}
                    maximumValue={255}
                    value={sliderValues.r}
                    onValueChange={(value) => handleSliderChange('r', value)}
                    onSlidingComplete={(value) =>
                      handleSliderComplete('r', value)
                    }
                    minimumTrackTintColor="#FF0000"
                    maximumTrackTintColor="#FF0000"
                  />
                </View>

                <View style={styles.sliderContainer}>
                  <Text style={styles.sliderLabel}>Green</Text>
                  <Slider
                    style={styles.slider}
                    minimumValue={0}
                    maximumValue={255}
                    value={sliderValues.g}
                    onValueChange={(value) => handleSliderChange('g', value)}
                    onSlidingComplete={(value) =>
                      handleSliderComplete('g', value)
                    }
                    minimumTrackTintColor="#00FF00"
                    maximumTrackTintColor="#00FF00"
                  />
                </View>

                <View style={styles.sliderContainer}>
                  <Text style={styles.sliderLabel}>Blue</Text>
                  <Slider
                    style={styles.slider}
                    minimumValue={0}
                    maximumValue={255}
                    value={sliderValues.b}
                    onValueChange={(value) => handleSliderChange('b', value)}
                    onSlidingComplete={(value) =>
                      handleSliderComplete('b', value)
                    }
                    minimumTrackTintColor="#0000FF"
                    maximumTrackTintColor="#0000FF"
                  />
                </View>

                <View style={styles.sliderContainer}>
                  <Text style={styles.sliderLabel}>Alpha</Text>
                  <Slider
                    style={styles.slider}
                    minimumValue={0}
                    maximumValue={255}
                    value={sliderValues.a}
                    onValueChange={(value) => handleSliderChange('a', value)}
                    onSlidingComplete={(value) =>
                      handleSliderComplete('a', value)
                    }
                    minimumTrackTintColor="#808080"
                    maximumTrackTintColor="#808080"
                  />
                </View>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
}

DataBinding.metadata = {
  name: 'Data Binding Demo',
  description:
    'Interactive data binding with modal controls for string, number, color properties and triggers',
} satisfies Metadata;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  animation: {
    width: '100%',
    height: 300,
  },
  loadingText: {
    textAlign: 'center',
    marginTop: 20,
    fontSize: 16,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: 'white',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    minHeight: '50%',
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#ccc',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  modalBody: {
    padding: 16,
  },
  label: {
    fontSize: 16,
    fontWeight: '500',
    marginTop: 16,
    marginBottom: 8,
  },
  input: {
    height: 40,
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 4,
    paddingHorizontal: 8,
  },
  colorPickerContainer: {
    marginTop: 8,
    alignItems: 'center',
  },
  colorPreview: {
    width: 50,
    height: 50,
    borderRadius: 8,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#ccc',
  },
  colorValue: {
    fontSize: 14,
    color: '#666',
    marginBottom: 12,
  },
  sliderContainer: {
    width: '100%',
    marginBottom: 8,
  },
  sliderLabel: {
    fontSize: 14,
    marginBottom: 2,
  },
  slider: {
    width: '100%',
    height: 32,
  },
  rowContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 16,
  },
  columnContainer: {
    flex: 1,
  },
});
