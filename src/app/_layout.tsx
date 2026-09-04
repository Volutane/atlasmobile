import { DarkTheme, DefaultTheme, Slot, ThemeProvider } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useState } from 'react';
import { useColorScheme, View } from 'react-native';

import { AnimatedSplashOverlay } from '@/components/animated-icon';
import { AuthProvider } from '@/context/auth-context';

SplashScreen.preventAutoHideAsync().catch(() => { });

export default function RootLayout() {
  const colorScheme = useColorScheme();
  const [showOverlay, setShowOverlay] = useState(true);

  return (
    <AuthProvider>
      <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
        <View style={{ flex: 1 }}>
          <Slot />
          {showOverlay && (
            <AnimatedSplashOverlay onFinish={() => setShowOverlay(false)} />
          )}
        </View>
      </ThemeProvider>
    </AuthProvider>
  );
}
