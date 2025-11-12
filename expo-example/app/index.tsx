import { StyleSheet, ScrollView, TouchableOpacity, Button } from 'react-native';
import { useRouter } from 'expo-router';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { IconSymbol } from '@/components/ui/icon-symbol';

interface Example {
  id: string;
  title: string;
  description: string;
  route: string;
  icon: string;
}

const examples: Example[] = [
  {
    id: 'simple',
    title: 'Simple Rive Animation',
    description:
      'Basic usage of react-native-rive with a simple animation that auto-plays.',
    route: '/simple-rive',
    icon: 'play.circle.fill',
  },
  {
    id: 'data-binding',
    title: 'Data Binding',
    description:
      'Advanced example demonstrating data binding with view models, properties, and triggers.',
    route: '/data-binding',
    icon: 'link.circle.fill',
  },
];

export default function HomeScreen() {
  const router = useRouter();

  const handleInvokeGC = () => {
    if (typeof global.gc === 'function') {
      global.gc();
      console.log('GC invoked');
    } else {
      console.error('global.gc is not available');
    }
  };

  return (
    <ThemedView style={styles.container}>
      <ThemedView style={styles.header}>
        <ThemedText type="title">Rive Examples</ThemedText>
        <ThemedText style={styles.subtitle}>
          Explore react-native-rive integration in Expo
        </ThemedText>
      </ThemedView>

      <ThemedView style={styles.gcButtonContainer}>
        <Button title="Invoke GC" onPress={handleInvokeGC} />
      </ThemedView>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
      >
        {examples.map((example) => (
          <TouchableOpacity
            key={example.id}
            style={styles.exampleCard}
            onPress={() => router.push(example.route as any)}
          >
            <ThemedView style={styles.cardContainer}>
              <ThemedView style={styles.cardContent}>
                <ThemedView style={styles.iconContainer}>
                  <IconSymbol size={32} name={example.icon} color="#007AFF" />
                </ThemedView>
                <ThemedView style={styles.textContainer}>
                  <ThemedText type="defaultSemiBold" style={styles.cardTitle}>
                    {example.title}
                  </ThemedText>
                  <ThemedText style={styles.cardDescription}>
                    {example.description}
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
    paddingTop: 60,
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5E5',
  },
  subtitle: {
    marginTop: 8,
    fontSize: 14,
    opacity: 0.7,
  },
  gcButtonContainer: {
    padding: 16,
    paddingBottom: 8,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
  },
  exampleCard: {
    marginBottom: 12,
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
    padding: 16,
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#E3F2FD',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
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
