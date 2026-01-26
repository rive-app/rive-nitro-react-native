import {
  Text,
  View,
  StyleSheet,
  ActivityIndicator,
  TouchableOpacity,
} from 'react-native';
import {
  Fit,
  RiveView,
  useRive,
  useRiveFile,
  type RiveFileInput,
} from '@rive-app/react-native';
import { useState, useEffect } from 'react';
import { downloadFileAsArrayBuffer } from '../shared/fileHelpers';
import { type Metadata } from '../shared/metadata';

const LOADING_METHODS = {
  SOURCE: 'Source',
  URL: 'URL',
  RESOURCE: 'Resource',
  ARRAY_BUFFER: 'ArrayBuffer',
} as const;

type LoadingMethod = (typeof LOADING_METHODS)[keyof typeof LOADING_METHODS];

interface CustomRiveViewProps {
  loadingMethod: LoadingMethod;
  title: string;
}

const networkGraphicURL = 'https://cdn.rive.app/animations/vehicles.riv';

const getInputForMethod = async (
  method: LoadingMethod
): Promise<RiveFileInput | undefined> => {
  switch (method) {
    case LOADING_METHODS.URL:
      return networkGraphicURL;
    case LOADING_METHODS.RESOURCE:
      return 'rewards';
    case LOADING_METHODS.ARRAY_BUFFER:
      const arrayBuffer = await downloadFileAsArrayBuffer(networkGraphicURL);
      return arrayBuffer || undefined;
    case LOADING_METHODS.SOURCE:
      return require('../../assets/rive/rating.riv');
    default:
      return undefined;
  }
};

const CustomRiveView = ({ loadingMethod, title }: CustomRiveViewProps) => {
  const { setHybridRef } = useRive();
  const [input, setInput] = useState<RiveFileInput | undefined>(undefined);

  useEffect(() => {
    const loadInput = async () => {
      setInput(undefined);

      try {
        const inputForMethod = await getInputForMethod(loadingMethod);
        if (inputForMethod) setInput(inputForMethod);
      } catch (err) {
        console.error('Error loading input:', err);
      }
    };

    loadInput();
  }, [loadingMethod]);

  const { riveFile, isLoading, error } = useRiveFile(input);

  return (
    <View style={styles.container}>
      <Text style={styles.title}>{title}</Text>
      {!input || isLoading ? (
        <ActivityIndicator style={styles.rive} size="large" color="#0000ff" />
      ) : error ? (
        <Text style={styles.errorText}>{error}</Text>
      ) : riveFile ? (
        <RiveView
          style={styles.rive}
          autoPlay={true}
          fit={Fit.Contain}
          file={riveFile}
          hybridRef={setHybridRef}
        />
      ) : null}
    </View>
  );
};

const TabButton = ({
  method,
  activeTab,
  onPress,
}: {
  method: LoadingMethod;
  activeTab: LoadingMethod;
  onPress: () => void;
}) => (
  <TouchableOpacity
    style={[styles.tab, activeTab === method && styles.activeTab]}
    onPress={onPress}
  >
    <Text
      style={[styles.tabText, activeTab === method && styles.activeTabText]}
    >
      {method}
    </Text>
  </TouchableOpacity>
);

export default function RiveFileLoadingExample() {
  const [activeTab, setActiveTab] = useState<LoadingMethod>(
    LOADING_METHODS.SOURCE
  );

  const titles = {
    [LOADING_METHODS.SOURCE]: 'Loading from Source',
    [LOADING_METHODS.URL]: 'Loading from URL',
    [LOADING_METHODS.RESOURCE]: 'Loading from Resource',
    [LOADING_METHODS.ARRAY_BUFFER]: 'Loading from ArrayBuffer',
  };

  return (
    <View style={styles.container}>
      <CustomRiveView loadingMethod={activeTab} title={titles[activeTab]} />
      <View style={styles.tabBar}>
        {Object.values(LOADING_METHODS).map((method) => (
          <TabButton
            key={method}
            method={method}
            activeTab={activeTab}
            onPress={() => setActiveTab(method)}
          />
        ))}
      </View>
    </View>
  );
}

RiveFileLoadingExample.metadata = {
  name: 'File Loading',
  description:
    'Demonstrates different methods to load Rive files: from source, URL, resource, and ArrayBuffer',
} satisfies Metadata;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    textAlign: 'center',
    marginTop: 20,
    marginBottom: 10,
  },
  rive: {
    flex: 1,
  },
  tabBar: {
    flexDirection: 'row',
    height: 60,
    borderTopWidth: 1,
    borderTopColor: '#ccc',
    backgroundColor: '#fff',
  },
  tab: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  activeTab: {
    borderTopWidth: 2,
    borderTopColor: '#007AFF',
  },
  tabText: {
    fontSize: 14,
    color: '#666',
  },
  activeTabText: {
    color: '#007AFF',
    fontWeight: 'bold',
  },
  errorText: {
    color: 'red',
    textAlign: 'center',
    padding: 20,
  },
});
