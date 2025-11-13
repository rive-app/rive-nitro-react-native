import { useLocalSearchParams, Stack } from 'expo-router';
import { PagesList, type PageItem } from '@example/pages';
import { View, Text, StyleSheet } from 'react-native';

export default function PageRoute() {
  const { pageId } = useLocalSearchParams<{ pageId: string }>();

  const page = PagesList.find((p: PageItem) => p.id === pageId);

  if (!page) {
    return (
      <View style={styles.container}>
        <Text style={styles.errorText}>Page not found: {pageId}</Text>
      </View>
    );
  }

  const PageComponent = page.component;

  return (
    <>
      <Stack.Screen options={{ title: page.name }} />
      <PageComponent />
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorText: {
    fontSize: 16,
    color: 'red',
  },
});
