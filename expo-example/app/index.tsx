import { useEffect, useState } from 'react';
import { StyleSheet, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { IconSymbol } from '@/components/ui/icon-symbol';
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
    if (typeof global.gc === 'function') {
      global.gc();
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
    <ThemedView style={styles.container}>
      <ThemedView style={styles.header}>
        <ThemedText type="title" style={styles.title}>
          Rive Examples
        </ThemedText>
        <TouchableOpacity
          onPress={() => setShowMenu(!showMenu)}
          style={styles.menuButton}
        >
          <IconSymbol size={24} name="wrench.fill" color="#007AFF" />
        </TouchableOpacity>
        {showMenu && (
          <ThemedView style={styles.menu}>
            <TouchableOpacity onPress={handleRunTests} style={styles.menuItem}>
              <ThemedText style={styles.menuItemText}>Run Tests</ThemedText>
            </TouchableOpacity>
            <TouchableOpacity onPress={handleInvokeGC} style={styles.menuItem}>
              <ThemedText style={styles.menuItemText}>Invoke GC</ThemedText>
            </TouchableOpacity>
          </ThemedView>
        )}
      </ThemedView>

      <HomeMenu lastOpened={lastOpened} onNavigate={handleNavigate} />
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
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
    textAlign: 'center',
  },
  menuButton: {
    position: 'absolute',
    right: 20,
    top: 64,
    padding: 8,
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
