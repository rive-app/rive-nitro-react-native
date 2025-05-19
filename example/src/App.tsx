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
  type RiveFile,
  RiveFileFactory,
  useRive,
} from 'react-native-rive';
import { useState, useEffect, useRef } from 'react';
import { downloadFileAsArrayBuffer } from './helpers/fileHelpers';

type LoadingMethod = 'URL' | 'Resource' | 'ArrayBuffer' | 'Source';

interface CustomRiveViewProps {
  loadingMethod: LoadingMethod;
  title: string;
}

const networkGraphicURL = 'https://cdn.rive.app/animations/vehicles.riv';

const CustomRiveView = ({ loadingMethod, title }: CustomRiveViewProps) => {
  const { setHybridRef } = useRive();
  const [riveFile, setRiveFile] = useState<RiveFile | null>(null);
  const riveFileRef = useRef<RiveFile | null>(null);

  useEffect(() => {
    let isMounted = true;

    const loadRiveFile = async () => {
      try {
        // Release the current file before loading a new one
        if (riveFileRef.current) {
          riveFileRef.current.release();
          riveFileRef.current = null;
        }

        let file: RiveFile | null = null;

        switch (loadingMethod) {
          case 'URL':
            file = await RiveFileFactory.fromURL(networkGraphicURL);
            break;
          case 'Resource':
            file = await RiveFileFactory.fromResource('rewards');
            break;
          case 'ArrayBuffer':
            const arrayBuffer =
              await downloadFileAsArrayBuffer(networkGraphicURL);
            if (arrayBuffer) {
              file = await RiveFileFactory.fromBytes(arrayBuffer);
            }
            break;
          case 'Source':
            file = await RiveFileFactory.fromSource(
              require('../assets/rive/rating.riv')
            );
            break;
        }

        if (file && isMounted) {
          riveFileRef.current = file;
          setRiveFile(file);
        }
      } catch (error) {
        console.error(`Error loading Rive file from ${loadingMethod}:`, error);
      }
    };

    setRiveFile(null);
    loadRiveFile();

    return () => {
      isMounted = false;
      if (riveFileRef.current) {
        riveFileRef.current.release();
        riveFileRef.current = null;
      }
    };
  }, [loadingMethod]);

  return (
    <View style={styles.container}>
      <Text style={styles.title}>{title}</Text>
      {!riveFile ? (
        <ActivityIndicator style={styles.rive} size="large" color="#0000ff" />
      ) : (
        <RiveView
          style={styles.rive}
          autoBind={false}
          autoPlay={true}
          fit={Fit.Contain}
          file={riveFile}
          hybridRef={setHybridRef}
        />
      )}
    </View>
  );
};

export default function App() {
  const [activeTab, setActiveTab] = useState<LoadingMethod>('Source');

  const renderContent = () => {
    const titles = {
      Source: 'Loading from Source',
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
          style={[styles.tab, activeTab === 'Source' && styles.activeTab]}
          onPress={() => setActiveTab('Source')}
        >
          <Text
            style={[
              styles.tabText,
              activeTab === 'Source' && styles.activeTabText,
            ]}
          >
            Source
          </Text>
        </TouchableOpacity>
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
