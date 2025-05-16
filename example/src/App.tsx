import {
  Text,
  View,
  StyleSheet,
  ActivityIndicator,
  TouchableOpacity,
} from 'react-native';
import type { HybridView } from 'react-native-nitro-modules';
import {
  Fit,
  RiveView,
  type RiveFile,
  type RiveViewMethods,
  type RiveViewProps,
  RiveFileFactory,
} from 'react-native-rive';
import { useRef, useState, useEffect } from 'react';

type LoadingMethod = 'URL' | 'Resource' | 'ArrayBuffer';

interface CustomRiveViewProps {
  loadingMethod: LoadingMethod;
  title: string;
}

const networkGraphicURL = 'https://cdn.rive.app/animations/vehicles.riv';

// TODO: Investigate better ways for the view to retrigger the graphic when the RiveFile is updated
// This likely just requires better native equality checks
const CustomRiveView = ({ loadingMethod, title }: CustomRiveViewProps) => {
  const riveRef = useRef<HybridView<RiveViewProps, RiveViewMethods>>(null);
  const [riveFile, setRiveFile] = useState<RiveFile | null>(null);

  const downloadFileAsArrayBuffer = async (
    url: string
  ): Promise<ArrayBuffer | null> => {
    try {
      const response = await fetch(url);
      if (!response.ok) {
        console.error(`Failed to fetch file: ${response.statusText}`);
        return null;
      }
      const blob = await response.blob();
      const arrayBuffer = await new Promise<ArrayBuffer>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as ArrayBuffer);
        reader.onerror = () => reject(reader.error);
        reader.readAsArrayBuffer(blob);
      });
      return arrayBuffer;
    } catch (error) {
      console.error('Error downloading file:', error);
      return null;
    }
  };

  useEffect(() => {
    // Reset the riveFile state when loading method changes
    setRiveFile(null);

    const loadRiveFile = async () => {
      try {
        let riveFile: RiveFile | null = null;

        switch (loadingMethod) {
          case 'URL':
            riveFile = await RiveFileFactory.fromURL(networkGraphicURL);
            break;
          case 'Resource':
            riveFile = await RiveFileFactory.fromResource('rewards');
            break;
          case 'ArrayBuffer':
            const arrayBuffer =
              await downloadFileAsArrayBuffer(networkGraphicURL);
            if (arrayBuffer) {
              riveFile = await RiveFileFactory.fromBytes(arrayBuffer);
            }
            break;
        }

        if (riveFile) {
          setRiveFile(riveFile);
        }
      } catch (error) {
        console.error(`Error loading Rive file from ${loadingMethod}:`, error);
      }
    };
    loadRiveFile();
  }, [loadingMethod]);

  return (
    <View style={styles.container}>
      <Text style={styles.title}>{title}</Text>
      {!riveFile ? (
        <ActivityIndicator style={styles.rive} size="large" color="#0000ff" />
      ) : (
        <RiveView
          key={`${loadingMethod}-${riveFile ? 'loaded' : 'loading'}`}
          style={styles.rive}
          autoBind={false}
          autoPlay={true}
          fit={Fit.Cover}
          file={riveFile}
          hybridRef={{
            f: (ref) => {
              if (ref) {
                riveRef.current = ref;
              }
            },
          }}
        />
      )}
    </View>
  );
};

export default function App() {
  const [activeTab, setActiveTab] = useState<LoadingMethod>('URL');

  const renderContent = () => {
    const titles = {
      URL: 'Loading from URL',
      Resource: 'Loading from Resource',
      ArrayBuffer: 'Loading from ArrayBuffer',
    };

    return (
      <CustomRiveView loadingMethod={activeTab} title={titles[activeTab]} />
    );
  };

  return (
    <View style={styles.container}>
      {renderContent()}
      <View style={styles.tabBar}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'URL' && styles.activeTab]}
          onPress={() => setActiveTab('URL')}
        >
          <Text
            style={[
              styles.tabText,
              activeTab === 'URL' && styles.activeTabText,
            ]}
          >
            URL
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'Resource' && styles.activeTab]}
          onPress={() => setActiveTab('Resource')}
        >
          <Text
            style={[
              styles.tabText,
              activeTab === 'Resource' && styles.activeTabText,
            ]}
          >
            Resource
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'ArrayBuffer' && styles.activeTab]}
          onPress={() => setActiveTab('ArrayBuffer')}
        >
          <Text
            style={[
              styles.tabText,
              activeTab === 'ArrayBuffer' && styles.activeTabText,
            ]}
          >
            ArrayBuffer
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

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
});
