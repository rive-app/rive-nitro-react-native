import { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActionSheetIOS,
  Platform,
  Alert,
} from 'react-native';
import { NavigationContainer, useNavigation } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { PagesList, type PageItem } from './PagesList';
import { HomeMenu } from './shared/HomeMenu';

const LAST_OPENED_KEY = '@rive_example_last_opened';

type RootStackParamList = {
  Home: undefined;
} & {
  [K in (typeof PagesList)[number]['id']]: undefined;
};

const Stack = createStackNavigator<RootStackParamList>();

function invokeGC() {
  if (typeof global.gc === 'function') {
    global.gc();
    Alert.alert('GC', 'Garbage collection invoked');
  } else {
    Alert.alert('GC', 'GC not available (Hermes debugger not attached)');
  }
}

function HeaderMenuButton() {
  const navigation = useNavigation<any>();

  const openTests = () => {
    navigation.navigate('TestsPage');
  };

  const showDevMenu = () => {
    const options = ['Run Tests', 'Invoke GC', 'Cancel'];
    const cancelButtonIndex = 2;

    if (Platform.OS === 'ios') {
      ActionSheetIOS.showActionSheetWithOptions(
        { options, cancelButtonIndex },
        (buttonIndex) => {
          if (buttonIndex === 0) {
            openTests();
          } else if (buttonIndex === 1) {
            invokeGC();
          }
        }
      );
    } else {
      Alert.alert('Dev Menu', undefined, [
        { text: 'Run Tests', onPress: openTests },
        { text: 'Invoke GC', onPress: invokeGC },
        { text: 'Cancel', style: 'cancel' },
      ]);
    }
  };

  return (
    <TouchableOpacity onPress={showDevMenu} style={styles.headerButton}>
      <Text style={styles.headerButtonText}>🔧</Text>
    </TouchableOpacity>
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
    <View style={styles.container}>
      <HomeMenu lastOpened={lastOpened} onNavigate={handleNavigate} />
    </View>
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
  headerButton: {
    marginRight: 16,
    padding: 4,
  },
  headerButtonText: {
    fontSize: 22,
    color: '#fff',
  },
});
