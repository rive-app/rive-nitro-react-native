import { View, Text, StyleSheet, ScrollView } from 'react-native';
import {
  useRiveFile,
  useViewModelInstance,
  type ViewModelPropertyInfo,
  type ViewModel,
} from '@rive-app/react-native';
import { useMemo } from 'react';
import type { Metadata } from '../helpers/metadata';

function PropertyList({ properties }: { properties: ViewModelPropertyInfo[] }) {
  if (properties.length === 0) {
    return <Text style={styles.emptyText}>No properties found</Text>;
  }
  return (
    <View style={styles.propertyList}>
      {properties.map((prop, index) => (
        <View key={index} style={styles.propertyRow}>
          <Text style={styles.propertyName}>{prop.name}</Text>
          <Text style={styles.propertyType}>{prop.type}</Text>
        </View>
      ))}
    </View>
  );
}

export default function PropertyInspector() {
  const { riveFile } = useRiveFile(
    require('../../assets/rive/quick_start.riv')
  );

  const viewModel: ViewModel | undefined = useMemo(
    () => riveFile?.defaultArtboardViewModel(),
    [riveFile]
  );
  const viewModelInstance = useViewModelInstance(riveFile);

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.title}>ViewModel Inspector</Text>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>ViewModel Info</Text>
        <Text style={styles.info}>Name: {viewModel?.modelName ?? 'N/A'}</Text>
        <Text style={styles.info}>
          Property Count: {viewModel?.propertyCount ?? 0}
        </Text>
        <Text style={styles.info}>
          Instance Count: {viewModel?.instanceCount ?? 0}
        </Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>ViewModel Properties</Text>
        <PropertyList properties={viewModel?.properties ?? []} />
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>
          Instance Properties ({viewModelInstance?.instanceName})
        </Text>
        <PropertyList properties={viewModelInstance?.properties ?? []} />
      </View>
    </ScrollView>
  );
}

PropertyInspector.metadata = {
  name: 'Property Inspector',
  description:
    'Debug tool to inspect ViewModel and ViewModelInstance properties',
} satisfies Metadata;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1a1a2e',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
    textAlign: 'center',
    marginVertical: 20,
  },
  section: {
    backgroundColor: '#16213e',
    margin: 10,
    padding: 15,
    borderRadius: 10,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#e94560',
    marginBottom: 10,
  },
  info: {
    fontSize: 14,
    color: '#fff',
    marginBottom: 5,
  },
  propertyList: {
    marginTop: 5,
  },
  propertyRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#0f3460',
  },
  propertyName: {
    fontSize: 14,
    color: '#fff',
    fontWeight: '500',
  },
  propertyType: {
    fontSize: 14,
    color: '#e94560',
    fontFamily: 'monospace',
  },
  emptyText: {
    fontSize: 14,
    color: '#666',
    fontStyle: 'italic',
  },
});
