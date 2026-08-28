import { Platform, ScrollView, StatusBar, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { LoginCard } from '@/components/login-card';
import { MainDashboard } from '@/components/main-dashboard';
import { WebBadge } from '@/components/web-badge';
import { AuthProvider, useAuth } from '@/context/auth-context';
import { Spacing } from '@/constants/theme';
import { useResponsive } from '@/hooks/use-responsive';
import { useTheme } from '@/hooks/use-theme';

// Auth durumuna göre ekranı seçen iç bileşen
function HomeScreenContent() {
  const { isLoggedIn } = useAuth();
  const safeAreaInsets = useSafeAreaInsets();
  const theme = useTheme();
  const responsive = useResponsive();

  if (isLoggedIn) {
    return <MainDashboard />;
  }

  const insets = {
    ...safeAreaInsets,
    bottom: safeAreaInsets.bottom + Spacing.four,
  };

  const contentPlatformStyle = Platform.select({
    android: {
      paddingTop: insets.top + Spacing.three,
      paddingLeft: insets.left,
      paddingRight: insets.right,
      paddingBottom: insets.bottom,
    },
    ios: {
      paddingTop: insets.top + Spacing.two,
      paddingLeft: insets.left,
      paddingRight: insets.right,
      paddingBottom: insets.bottom,
    },
    web: {
      paddingTop: Spacing.six,
      paddingBottom: Spacing.six,
    },
  });

  return (
    <ScrollView
      style={[styles.scrollView, { backgroundColor: theme.background }]}
      contentInset={insets}
      showsVerticalScrollIndicator={true}
      contentContainerStyle={[
        styles.contentContainer,
        { paddingHorizontal: responsive.isTablet ? Spacing.five : Spacing.four },
        contentPlatformStyle,
      ]}>
      <StatusBar barStyle="dark-content" backgroundColor="#ffffff" translucent={true} />
      <View style={[styles.innerContainer, { maxWidth: responsive.contentMaxWidth }]}>
        <LoginCard />
        {Platform.OS === 'web' && <WebBadge />}
      </View>
    </ScrollView>
  );
}

// AuthProvider'ı bu sayfanın kök bileşeninde tanımlıyoruz
// böylece LoginCard ve MainDashboard kesinlikle aynı context'i paylaşır
export default function HomeScreen() {
  return <HomeScreenContent />;
}

const styles = StyleSheet.create({
  scrollView: {
    flex: 1,
  },
  contentContainer: {
    flexGrow: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  innerContainer: {
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.four,
  },
});
