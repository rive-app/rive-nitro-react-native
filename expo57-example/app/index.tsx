import '@example/polyfills';
import { useEffect, useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { HomeMenu, PagesList, type PageItem } from '@example/shared/HomeMenu';

const LAST_OPENED_KEY = '@rive_example_last_opened';

export default function HomeScreen() {
  const router = useRouter();
  const [showMenu, setShowMenu] = useState(false);
  const [lastOpened, setLastOpened] = useState<PageItem | null>(null);

  useEffect(() => {
    AsyncStorage.getItem(LAST_OPENED_KEY).then((id) => {
      if (id) {
        const page = PagesList.find((p) => p.id === id);
        if (page) setLastOpened(page);
      }
    });
  }, []);

  const handleInvokeGC = () => {
    const g = globalThis as { gc?: () => void };
    if (typeof g.gc === 'function') {
      g.gc();
      console.log('GC invoked');
    } else {
      console.error('global.gc is not available');
    }
    setShowMenu(false);
  };

  const handleRunTests = () => {
    setShowMenu(false);
    router.push('/TestsPage' as any);
  };

  const handleNavigate = (id: string) => {
    AsyncStorage.setItem(LAST_OPENED_KEY, id);
    router.push(`/${id}` as any);
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Rive Examples</Text>
        <TouchableOpacity
          onPress={() => setShowMenu(!showMenu)}
          style={styles.menuButton}
        >
          <Text style={styles.menuButtonText}>🔧</Text>
        </TouchableOpacity>
        {showMenu && (
          <View style={styles.menu}>
            <TouchableOpacity onPress={handleRunTests} style={styles.menuItem}>
              <Text style={styles.menuItemText}>Run Tests</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={handleInvokeGC} style={styles.menuItem}>
              <Text style={styles.menuItemText}>Invoke GC</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>

      <HomeMenu lastOpened={lastOpened} onNavigate={handleNavigate} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  header: {
    padding: 20,
    paddingTop: 64,
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5E5',
    position: 'relative',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  menuButton: {
    position: 'absolute',
    right: 20,
    top: 64,
    padding: 8,
  },
  menuButtonText: {
    fontSize: 20,
  },
  menu: {
    marginTop: 12,
    width: '100%',
    borderRadius: 8,
    backgroundColor: '#F5F5F5',
    overflow: 'hidden',
  },
  menuItem: {
    padding: 8,
  },
  menuItemText: {
    fontSize: 16,
    color: '#007AFF',
  },
});
