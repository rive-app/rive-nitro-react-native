import {
  DarkTheme,
  DefaultTheme,
  ThemeProvider,
} from '@react-navigation/native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { runOnUI } from 'react-native-reanimated';
import { installWorkletDispatcher } from '@rive-app/react-native';

import { useColorScheme } from '@/hooks/use-color-scheme';

// Install dispatcher on Reanimated's UI runtime for worklet-based listeners
installWorkletDispatcher(runOnUI);

export default function RootLayout() {
  const colorScheme = useColorScheme();

  return (
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      <Stack>
        <Stack.Screen name="index" options={{ headerShown: false }} />
        <Stack.Screen
          name="[pageId]"
          options={{
            headerShown: true,
          }}
        />
      </Stack>
      <StatusBar style="auto" />
    </ThemeProvider>
  );
}
