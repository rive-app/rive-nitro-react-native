import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import RiveFileLoadingExample from './pages/RiveFileLoadingExample';
import DataBindingExample from './pages/RiveDataBindingExample';
import TemplatePage from './pages/TemplatePage';
import EventsExample from './pages/RiveEventsExample';
import StateMachineInputsExample from './pages/RiveStateMachineInputsExample';
import TextRunExample from './pages/RiveTextRunExample';
import OutOfBandAssets from './pages/OutOfBandAssets';

const Examples = [
  {
    title: 'Rive File Loading Examples',
    screenId: 'RiveFileLoading',
    component: RiveFileLoadingExample,
  },
  {
    title: 'Rive Data Binding Example',
    screenId: 'RiveDataBinding',
    component: DataBindingExample,
  },
  {
    title: 'Rive Events Example',
    screenId: 'RiveEvents',
    component: EventsExample,
  },
  {
    title: 'Rive State Machine Inputs Example',
    screenId: 'RiveStateMachineInputs',
    component: StateMachineInputsExample,
  },
  {
    title: 'Rive Text Run Example',
    screenId: 'RiveTextRun',
    component: TextRunExample,
  },
  {
    title: 'Out of band assets',
    screenId: 'OutOfBandAssets',
    component: OutOfBandAssets,
  },
  { title: 'Template Page', screenId: 'Template', component: TemplatePage },
] as const;

type RootStackParamList = {
  Home: undefined;
} & {
  [K in (typeof Examples)[number]['screenId']]: undefined;
};

const Stack = createStackNavigator<RootStackParamList>();

function HomeScreen({ navigation }: { navigation: any }) {
  return (
    <ScrollView style={styles.container}>
      <Text style={styles.header}>Rive React Native Examples</Text>
      <View style={styles.buttonContainer}>
        {Examples.map(({ title, screenId }) => (
          <TouchableOpacity
            key={screenId}
            style={styles.button}
            onPress={() => navigation.navigate(screenId)}
          >
            <Text style={styles.buttonText}>{title}</Text>
          </TouchableOpacity>
        ))}
      </View>
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
          options={{ title: 'Rive Examples' }}
        />
        {Examples.map(({ screenId, component, title }) => (
          <Stack.Screen
            key={screenId}
            name={screenId}
            component={component}
            options={{ title }}
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
});
