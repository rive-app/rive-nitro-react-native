import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import {
  PagesList,
  PagesListByCategory,
  type PageItem,
  type Category,
} from '../PagesList';

const CATEGORY_LABELS: Record<Category, string> = {
  demos: 'Demos',
  exercisers: 'Exercisers',
  tests: 'Tests',
  reproducers: 'Reproducers',
};

function ChevronRight() {
  return <Text style={styles.chevron}>›</Text>;
}

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
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {pages.map((page) => (
        <TouchableOpacity
          key={page.id}
          style={styles.card}
          onPress={() => onNavigate(page.id)}
          activeOpacity={0.7}
        >
          <View style={styles.cardContent}>
            <View style={styles.textContainer}>
              <Text style={styles.cardTitle}>{page.name}</Text>
              {page.description ? (
                <Text style={styles.cardDescription}>{page.description}</Text>
              ) : null}
            </View>
            <ChevronRight />
          </View>
        </TouchableOpacity>
      ))}
    </View>
  );
}

export type HomeMenuProps = {
  lastOpened?: PageItem | null;
  onNavigate: (id: string) => void;
};

export function HomeMenu({ lastOpened, onNavigate }: HomeMenuProps) {
  return (
    <ScrollView
      style={styles.scrollView}
      contentContainerStyle={styles.scrollContent}
    >
      {lastOpened && (
        <TouchableOpacity
          style={styles.recentCard}
          onPress={() => onNavigate(lastOpened.id)}
          activeOpacity={0.7}
        >
          <View style={styles.recentContent}>
            <Text style={styles.recentIcon}>↻</Text>
            <Text style={styles.recentTitle}>{lastOpened.name}</Text>
            <ChevronRight />
          </View>
        </TouchableOpacity>
      )}

      {(Object.keys(CATEGORY_LABELS) as Category[]).map((category) => (
        <Section
          key={category}
          title={CATEGORY_LABELS[category]}
          pages={PagesListByCategory[category]}
          onNavigate={onNavigate}
        />
      ))}
    </ScrollView>
  );
}

export { PagesList, type PageItem };

const styles = StyleSheet.create({
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: '#888',
    marginBottom: 10,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  card: {
    marginBottom: 8,
    borderRadius: 12,
    backgroundColor: '#F5F5F5',
    overflow: 'hidden',
  },
  cardContent: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  textContainer: {
    flex: 1,
    marginRight: 8,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  cardDescription: {
    fontSize: 13,
    color: '#666',
    marginTop: 2,
    lineHeight: 18,
  },
  chevron: {
    fontSize: 22,
    color: '#999',
    fontWeight: '300',
  },
  recentCard: {
    marginBottom: 20,
    borderRadius: 12,
    backgroundColor: '#E8F4FD',
    overflow: 'hidden',
  },
  recentContent: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 10,
  },
  recentIcon: {
    fontSize: 16,
    color: '#007AFF',
  },
  recentTitle: {
    flex: 1,
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
});
