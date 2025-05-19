import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import { useState } from 'react';
import RiveFileLoadingExample from './pages/RiveFileLoadingExample';
import TemplatePage from './pages/TemplatePage';

type Page = {
  id: string;
  title: string;
  component: React.ComponentType;
};

const pages: Page[] = [
  {
    id: 'rive-file-loading',
    title: 'Rive File Loading Examples',
    component: RiveFileLoadingExample,
  },
  {
    id: 'template',
    title: 'Template Page',
    component: TemplatePage,
  },
];

export default function App() {
  const [currentPage, setCurrentPage] = useState<string | null>(null);

  const renderPage = () => {
    if (!currentPage) {
      return (
        <ScrollView style={styles.container}>
          <Text style={styles.header}>Rive React Native Examples</Text>
          <View style={styles.buttonContainer}>
            {pages.map((page) => (
              <TouchableOpacity
                key={page.id}
                style={styles.button}
                onPress={() => setCurrentPage(page.id)}
              >
                <Text style={styles.buttonText}>{page.title}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </ScrollView>
      );
    }

    const PageComponent = pages.find((p) => p.id === currentPage)?.component;
    if (!PageComponent) return null;

    return (
      <View style={styles.pageContainer}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => setCurrentPage(null)}
        >
          <Text style={styles.backButtonText}>← Back to Examples</Text>
        </TouchableOpacity>
        <PageComponent />
      </View>
    );
  };

  return renderPage();
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
    marginBottom: 30,
  },
  buttonContainer: {
    padding: 20,
  },
  button: {
    backgroundColor: '#007AFF',
    padding: 15,
    borderRadius: 10,
    marginBottom: 15,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  pageContainer: {
    flex: 1,
    backgroundColor: '#fff',
  },
  backButton: {
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#ccc',
  },
  backButtonText: {
    color: '#007AFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
});
