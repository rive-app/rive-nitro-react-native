import { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
} from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  PagesList,
  PagesListByCategory,
  type PageItem,
  type Category,
} from './PagesList';

const LAST_OPENED_KEY = '@rive_example_last_opened';

type RootStackParamList = {
  Home: undefined;
} & {
  [K in (typeof PagesList)[number]['id']]: undefined;
};

const Stack = createStackNavigator<RootStackParamList>();

function HeaderMenuButton() {
  return (
    <TouchableOpacity
      onPress={() => Alert.alert('Tests', 'TODO: Run tests')}
      style={styles.headerButton}
    >
      <Text style={styles.headerButtonText}>⚙</Text>
    </TouchableOpacity>
  );
}

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
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {pages.map(({ id, name }) => (
        <TouchableOpacity
          key={id}
          style={styles.button}
          onPress={() => onNavigate(id)}
        >
          <Text style={styles.buttonText}>{name}</Text>
        </TouchableOpacity>
      ))}
    </View>
  );
}

function HomeScreen({ navigation }: { navigation: any }) {
  const [lastOpened, setLastOpened] = useState<PageItem | null>(null);

  useEffect(() => {
    AsyncStorage.getItem(LAST_OPENED_KEY).then((id) => {
      if (id) {
        const page = PagesList.find((p) => p.id === id);
        if (page) setLastOpened(page);
      }
    });
  }, []);

  const handleNavigate = (id: string) => {
    AsyncStorage.setItem(LAST_OPENED_KEY, id);
    navigation.navigate(id);
  };

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.header}>Rive React Native Examples</Text>

      {lastOpened && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Recent</Text>
          <TouchableOpacity
            style={styles.button}
            onPress={() => handleNavigate(lastOpened.id)}
          >
            <Text style={styles.buttonText}>{lastOpened.name}</Text>
          </TouchableOpacity>
        </View>
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
  );
}

export default function App() {
  return (
    <NavigationContainer>
      <Stack.Navigator
        screenOptions={{
          headerStyle: {
            backgroundColor: '#323232',
          },
          headerTintColor: '#fff',
          headerTitleStyle: {
            fontWeight: 'bold',
          },
        }}
      >
        <Stack.Screen
          name="Home"
          component={HomeScreen}
          options={{
            title: 'Rive Examples',
            headerRight: HeaderMenuButton,
          }}
        />
        {PagesList.map(({ id, component, name }) => (
          <Stack.Screen
            key={id}
            name={id}
            component={component}
            options={{ title: name }}
          />
        ))}
      </Stack.Navigator>
    </NavigationContainer>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  header: {
    fontSize: 28,
    fontWeight: 'bold',
    textAlign: 'center',
    marginTop: 40,
    marginBottom: 20,
  },
  section: {
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#666',
    marginBottom: 10,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  button: {
    backgroundColor: '#007AFF',
    padding: 15,
    borderRadius: 10,
    marginBottom: 10,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  headerButton: {
    marginRight: 16,
    padding: 4,
  },
  headerButtonText: {
    fontSize: 22,
    color: '#fff',
  },
});
