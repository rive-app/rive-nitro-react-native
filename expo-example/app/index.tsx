import { useEffect, useState } from 'react';
import { StyleSheet, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { IconSymbol } from '@/components/ui/icon-symbol';
import {
  PagesList,
  PagesListByCategory,
  type PageItem,
  type Category,
} from '@example/PagesList';

const LAST_OPENED_KEY = '@rive_example_last_opened';

const CATEGORY_LABELS: Record<Category, string> = {
  demos: 'Demos',
  exercisers: 'Exercisers',
  tests: 'Tests',
  reproducers: 'Reproducers',
};

function Section({
  title,
  pages,
  onNavigate,
}: {
  title: string;
  pages: PageItem[];
  onNavigate: (id: string) => void;
}) {
  if (pages.length === 0) return null;

  return (
    <ThemedView style={styles.section}>
      <ThemedText style={styles.sectionTitle}>{title}</ThemedText>
      {pages.map((page) => (
        <TouchableOpacity
          key={page.id}
          style={styles.exampleCard}
          onPress={() => onNavigate(page.id)}
        >
          <ThemedView style={styles.cardContainer}>
            <ThemedView style={styles.cardContent}>
              <ThemedView style={styles.textContainer}>
                <ThemedText type="defaultSemiBold" style={styles.cardTitle}>
                  {page.name}
                </ThemedText>
                <ThemedText style={styles.cardDescription}>
                  {page.description}
                </ThemedText>
              </ThemedView>
              <IconSymbol size={20} name="chevron.right" color="#999" />
            </ThemedView>
          </ThemedView>
        </TouchableOpacity>
      ))}
    </ThemedView>
  );
}

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
    Alert.alert('Tests', 'TODO: Run tests');
    setShowMenu(false);
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

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
      >
        {lastOpened && (
          <TouchableOpacity
            style={styles.recentCard}
            onPress={() => handleNavigate(lastOpened.id)}
          >
            <ThemedView style={styles.recentContent}>
              <IconSymbol
                size={18}
                name="clock.arrow.circlepath"
                color="#666"
              />
              <ThemedText type="defaultSemiBold" style={styles.recentTitle}>
                {lastOpened.name}
              </ThemedText>
              <IconSymbol size={20} name="chevron.right" color="#999" />
            </ThemedView>
          </TouchableOpacity>
        )}

        {(Object.keys(CATEGORY_LABELS) as Category[]).map((category) => (
          <Section
            key={category}
            title={CATEGORY_LABELS[category]}
            pages={PagesListByCategory[category]}
            onNavigate={handleNavigate}
          />
        ))}
      </ScrollView>
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
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
  },
  section: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
    marginBottom: 10,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  exampleCard: {
    marginBottom: 8,
    borderRadius: 12,
    overflow: 'hidden',
  },
  cardContainer: {
    backgroundColor: '#F5F5F5',
    borderRadius: 12,
  },
  recentCard: {
    marginBottom: 20,
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: '#F5F5F5',
  },
  recentContent: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 10,
  },
  recentTitle: {
    flex: 1,
    fontSize: 16,
  },
  cardContent: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  textContainer: {
    flex: 1,
    marginRight: 8,
  },
  cardTitle: {
    fontSize: 16,
    marginBottom: 4,
  },
  cardDescription: {
    fontSize: 13,
    opacity: 0.7,
    lineHeight: 18,
  },
});
