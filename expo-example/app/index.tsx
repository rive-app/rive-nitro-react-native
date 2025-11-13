import { StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { useState } from 'react';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { PagesList, type PageItem } from '@example/pages';

export default function HomeScreen() {
  const router = useRouter();
  const [showMenu, setShowMenu] = useState(false);

  const handleInvokeGC = () => {
    if (typeof global.gc === 'function') {
      global.gc();
      console.log('GC invoked');
    } else {
      console.error('global.gc is not available');
    }
    setShowMenu(false);
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
        {PagesList.map((page: PageItem) => (
          <TouchableOpacity
            key={page.id}
            style={styles.exampleCard}
            onPress={() => router.push(`/${page.id}` as any)}
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
  exampleCard: {
    marginBottom: 8,
    borderRadius: 12,
    overflow: 'hidden',
  },
  cardContainer: {
    backgroundColor: '#F5F5F5',
    borderRadius: 12,
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
