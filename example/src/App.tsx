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

type RootStackParamList = {
  Home: undefined;
  RiveFileLoading: undefined;
  RiveDataBinding: undefined;
  RiveEvents: undefined;
  RiveStateMachineInputs: undefined;
  Template: undefined;
};

const Stack = createStackNavigator<RootStackParamList>();

function HomeScreen({ navigation }: { navigation: any }) {
  return (
    <ScrollView style={styles.container}>
      <Text style={styles.header}>Rive React Native Examples</Text>
      <View style={styles.buttonContainer}>
        <TouchableOpacity
          style={styles.button}
          onPress={() => navigation.navigate('RiveFileLoading')}
        >
          <Text style={styles.buttonText}>Rive File Loading Examples</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.button}
          onPress={() => navigation.navigate('RiveDataBinding')}
        >
          <Text style={styles.buttonText}>Rive Data Binding Example</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.button}
          onPress={() => navigation.navigate('RiveEvents')}
        >
          <Text style={styles.buttonText}>Rive Events Example</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.button}
          onPress={() => navigation.navigate('RiveStateMachineInputs')}
        >
          <Text style={styles.buttonText}>
            Rive State Machine Inputs Example
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.button}
          onPress={() => navigation.navigate('Template')}
        >
          <Text style={styles.buttonText}>Template Page</Text>
        </TouchableOpacity>
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
        <Stack.Screen
          name="RiveFileLoading"
          component={RiveFileLoadingExample}
          options={{ title: 'Rive File Loading' }}
        />
        <Stack.Screen
          name="RiveDataBinding"
          component={DataBindingExample}
          options={{ title: 'Rive Data Binding' }}
        />
        <Stack.Screen
          name="RiveEvents"
          component={EventsExample}
          options={{ title: 'Rive Events' }}
        />
        <Stack.Screen
          name="RiveStateMachineInputs"
          component={StateMachineInputsExample}
          options={{ title: 'Rive State Machine Inputs' }}
        />
        <Stack.Screen
          name="Template"
          component={TemplatePage}
          options={{ title: 'Template' }}
        />
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
