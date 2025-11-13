import { View, Text, StyleSheet } from 'react-native';
import { type Metadata } from '../helpers/metadata';

export default function TemplatePage() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Template Page</Text>
      <Text style={styles.subtitle}>Use this as a base for new examples</Text>
    </View>
  );
}

TemplatePage.metadata = {
  name: 'Template',
  description: 'A template page for creating new Rive examples',
} satisfies Metadata;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    padding: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
    marginTop: 20,
    marginBottom: 10,
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
  },
});
