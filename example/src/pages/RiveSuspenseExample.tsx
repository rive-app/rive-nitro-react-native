import {
  Text,
  View,
  StyleSheet,
  ActivityIndicator,
  ScrollView,
} from 'react-native';
import { Fit, RiveView, RiveSuspense } from 'react-native-rive';
import { Suspense, Component, type ReactNode } from 'react';

class ErrorBoundary extends Component<
  { children: ReactNode; fallback: ReactNode },
  { hasError: boolean; error?: Error }
> {
  constructor(props: { children: ReactNode; fallback: ReactNode }) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback;
    }
    return this.props.children;
  }
}

const RiveCard = ({ title, input }: { title: string; input: any }) => {
  const riveFile = RiveSuspense.useRiveFile(input);

  return (
    <View style={styles.card}>
      <Text style={styles.cardTitle}>{title}</Text>
      <RiveView
        style={styles.riveView}
        autoBind={false}
        autoPlay={true}
        fit={Fit.Contain}
        file={riveFile}
      />
    </View>
  );
};

const SuspenseContent = () => {
  return (
    <ScrollView style={styles.scrollView}>
      <Text style={styles.description}>
        This example demonstrates the Suspense API. All three cards below use
        the same Rive file, which is cached and shared efficiently.
      </Text>

      <RiveCard
        title="Card 1"
        input={require('../../assets/rive/rating.riv')}
      />
      <RiveCard
        title="Card 2"
        input={require('../../assets/rive/rating.riv')}
      />
      <RiveCard
        title="Card 3"
        input={require('../../assets/rive/rating.riv')}
      />

      <Text style={styles.note}>
        Note: All three cards share the same cached RiveFile instance, loaded
        only once!
      </Text>
    </ScrollView>
  );
};

export default function RiveSuspenseExample() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>RiveSuspense Example</Text>

      <RiveSuspense.Provider>
        <ErrorBoundary
          fallback={
            <View style={styles.errorContainer}>
              <Text style={styles.errorText}>
                Failed to load Rive animation
              </Text>
            </View>
          }
        >
          <Suspense
            fallback={
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#007AFF" />
                <Text style={styles.loadingText}>Loading animations...</Text>
              </View>
            }
          >
            <SuspenseContent />
          </Suspense>
        </ErrorBoundary>
      </RiveSuspense.Provider>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
    marginTop: 20,
    marginBottom: 10,
    color: '#333',
  },
  description: {
    fontSize: 14,
    textAlign: 'center',
    marginHorizontal: 20,
    marginBottom: 20,
    color: '#666',
    lineHeight: 20,
  },
  scrollView: {
    flex: 1,
  },
  card: {
    margin: 20,
    padding: 15,
    backgroundColor: '#f5f5f5',
    borderRadius: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 10,
    color: '#333',
  },
  riveView: {
    height: 200,
    backgroundColor: '#fff',
    borderRadius: 8,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: '#007AFF',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorText: {
    color: 'red',
    fontSize: 16,
    textAlign: 'center',
    padding: 20,
  },
  note: {
    fontSize: 12,
    fontStyle: 'italic',
    textAlign: 'center',
    marginHorizontal: 20,
    marginBottom: 40,
    color: '#007AFF',
  },
});
