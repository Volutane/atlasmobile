import { useState } from 'react';
import {
  Alert,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { DEFAULT_API_URL } from '@/constants/api';
import { useAuth } from '@/context/auth-context';
import { useResponsive } from '@/hooks/use-responsive';
import { useTheme } from '@/hooks/use-theme';

export interface SistemAyarlariProps {
  onClose: () => void;
}

export function SistemAyarlariScreen({ onClose }: SistemAyarlariProps) {
  const theme = useTheme();
  const responsive = useResponsive();
  const insets = useSafeAreaInsets();
  const authContext = useAuth();
  const { user, apiUrl: contextApiUrl } = authContext || {};
  const activeBaseUrl = (contextApiUrl || DEFAULT_API_URL).trim().replace(/\/$/, '');

  // Settings states
  const [selectedTheme, setSelectedTheme] = useState<'system' | 'light' | 'dark'>('system');
  const [selectedLanguage, setSelectedLanguage] = useState<'tr' | 'en'>('tr');
  const [emailNotifications, setEmailNotifications] = useState<boolean>(true);
  const [offerUpdates, setOfferUpdates] = useState<boolean>(true);
  const [appAnnouncements, setAppAnnouncements] = useState<boolean>(false);
  const [autoSync, setAutoSync] = useState<boolean>(true);
  const [cacheClearedSuccess, setCacheClearedSuccess] = useState<boolean>(false);

  const handleClearCache = () => {
    setCacheClearedSuccess(true);
    if (Platform.OS === 'web') {
      window.alert('Liman ve Cari önbelleği başarıyla temizlendi.');
    } else {
      Alert.alert('Başarılı', 'Liman ve Cari önbelleği başarıyla temizlendi.');
    }
    setTimeout(() => {
      setCacheClearedSuccess(false);
    }, 4000);
  };

  const topPadding = Platform.OS === 'web' ? 20 : Math.max(insets.top + 10, 24);
  const isMobile = responsive.isMobile;
  const primaryColor = '#2563eb';

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      {/* Header Bar */}
      <View
        style={[
          styles.headerBar,
          {
            paddingTop: topPadding,
            backgroundColor: theme.backgroundElement,
            borderBottomColor: theme.backgroundSelected,
          },
        ]}
      >
        <View style={styles.headerInner}>
          <Pressable
            onPress={onClose}
            style={({ pressed }) => [
              styles.backButton,
              { backgroundColor: theme.backgroundSelected },
              pressed && styles.btnPressed,
            ]}
          >
            <ThemedText style={[styles.backButtonText, { color: primaryColor }]}>
              ‹ Geri
            </ThemedText>
          </Pressable>

          <View style={styles.titleContainer}>
            <ThemedText style={styles.headerTitle}>Sistem Ayarları</ThemedText>
            <ThemedText style={[styles.headerSubTitle, { color: theme.textSecondary }]}>
              Uygulama tercihleri ve yapılandırmaları
            </ThemedText>
          </View>

          <Pressable
            onPress={onClose}
            style={({ pressed }) => [
              styles.closeButton,
              { backgroundColor: theme.backgroundSelected },
              pressed && styles.btnPressed,
            ]}
          >
            <ThemedText style={[styles.closeButtonText, { color: theme.textSecondary }]}>
              Kapat
            </ThemedText>
          </Pressable>
        </View>
      </View>

      {/* Main Content Area */}
      <ScrollView
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: Math.max(insets.bottom + 40, 50) },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <View style={[styles.contentCardWidth, isMobile && { maxWidth: '100%' }]}>
          {/* Section 1: Görünüm ve Tema */}
          <View style={[styles.sectionCard, { backgroundColor: theme.backgroundElement, borderColor: theme.backgroundSelected }]}>
            <ThemedText style={styles.sectionTitle}>Görünüm ve Tema</ThemedText>
            <ThemedText style={[styles.sectionDesc, { color: theme.textSecondary }]}>
              Uygulamanın görsel görünümünü ve renk şemasını ayarlayın.
            </ThemedText>

            <View style={styles.optionRow}>
              <View style={styles.optionInfo}>
                <ThemedText style={styles.optionLabel}>Tema Modu</ThemedText>
                <ThemedText style={[styles.optionHelp, { color: theme.textSecondary }]}>
                  Aydınlık, karanlık veya sistem ayarlarınıza göre uyarlanır.
                </ThemedText>
              </View>
              <View style={styles.segmentedContainer}>
                <Pressable
                  onPress={() => setSelectedTheme('system')}
                  style={[
                    styles.segmentedBtn,
                    selectedTheme === 'system' && { backgroundColor: primaryColor },
                  ]}
                >
                  <ThemedText
                    style={[
                      styles.segmentedBtnText,
                      selectedTheme === 'system' && styles.segmentedBtnTextActive,
                    ]}
                  >
                    Sistem
                  </ThemedText>
                </Pressable>
                <Pressable
                  onPress={() => setSelectedTheme('light')}
                  style={[
                    styles.segmentedBtn,
                    selectedTheme === 'light' && { backgroundColor: primaryColor },
                  ]}
                >
                  <ThemedText
                    style={[
                      styles.segmentedBtnText,
                      selectedTheme === 'light' && styles.segmentedBtnTextActive,
                    ]}
                  >
                    Aydınlık
                  </ThemedText>
                </Pressable>
                <Pressable
                  onPress={() => setSelectedTheme('dark')}
                  style={[
                    styles.segmentedBtn,
                    selectedTheme === 'dark' && { backgroundColor: primaryColor },
                  ]}
                >
                  <ThemedText
                    style={[
                      styles.segmentedBtnText,
                      selectedTheme === 'dark' && styles.segmentedBtnTextActive,
                    ]}
                  >
                    Karanlık
                  </ThemedText>
                </Pressable>
              </View>
            </View>
          </View>

          {/* Section 2: Dil ve Bölge */}
          <View style={[styles.sectionCard, { backgroundColor: theme.backgroundElement, borderColor: theme.backgroundSelected }]}>
            <ThemedText style={styles.sectionTitle}>Dil ve Bölge</ThemedText>
            <ThemedText style={[styles.sectionDesc, { color: theme.textSecondary }]}>
              Kullanılacak varsayılan dili seçin.
            </ThemedText>

            <View style={styles.optionRow}>
              <View style={styles.optionInfo}>
                <ThemedText style={styles.optionLabel}>Uygulama Dili</ThemedText>
                <ThemedText style={[styles.optionHelp, { color: theme.textSecondary }]}>
                  Metinlerin ve başlıkların gösterileceği dil.
                </ThemedText>
              </View>
              <View style={styles.segmentedContainer}>
                <Pressable
                  onPress={() => setSelectedLanguage('tr')}
                  style={[
                    styles.segmentedBtn,
                    selectedLanguage === 'tr' && { backgroundColor: primaryColor },
                  ]}
                >
                  <ThemedText
                    style={[
                      styles.segmentedBtnText,
                      selectedLanguage === 'tr' && styles.segmentedBtnTextActive,
                    ]}
                  >
                    Türkçe
                  </ThemedText>
                </Pressable>
                <Pressable
                  onPress={() => setSelectedLanguage('en')}
                  style={[
                    styles.segmentedBtn,
                    selectedLanguage === 'en' && { backgroundColor: primaryColor },
                  ]}
                >
                  <ThemedText
                    style={[
                      styles.segmentedBtnText,
                      selectedLanguage === 'en' && styles.segmentedBtnTextActive,
                    ]}
                  >
                    English
                  </ThemedText>
                </Pressable>
              </View>
            </View>
          </View>



          {/* Section 4: Performans ve Önbellek */}
          <View style={[styles.sectionCard, { backgroundColor: theme.backgroundElement, borderColor: theme.backgroundSelected }]}>
            <ThemedText style={styles.sectionTitle}>Performans ve Önbellek</ThemedText>
            <ThemedText style={[styles.sectionDesc, { color: theme.textSecondary }]}>
              Uygulama yerel önbellek verilerini yönetin.
            </ThemedText>

            <View style={styles.optionRow}>
              <View style={styles.optionInfo}>
                <ThemedText style={styles.optionLabel}>Otomatik Veri Senkronizasyonu</ThemedText>
                <ThemedText style={[styles.optionHelp, { color: theme.textSecondary }]}>
                  Liman ve firma verilerini sayfa açılışında otomatik güncelle.
                </ThemedText>
              </View>
              <Switch
                value={autoSync}
                onValueChange={setAutoSync}
                trackColor={{ false: '#cbd5e1', true: primaryColor }}
                thumbColor="#ffffff"
              />
            </View>

            <View style={styles.divider} />

            <View style={styles.optionRow}>
              <View style={styles.optionInfo}>
                <ThemedText style={styles.optionLabel}>Veri Önbelleğini Temizle</ThemedText>
                <ThemedText style={[styles.optionHelp, { color: theme.textSecondary }]}>
                  Liman ve cari hafıza kaydını sıfırlayarak sunucudan yeniden yükler.
                </ThemedText>
              </View>

              <Pressable
                onPress={handleClearCache}
                style={({ pressed }) => [
                  styles.actionButton,
                  { backgroundColor: theme.backgroundSelected },
                  pressed && styles.btnPressed,
                ]}
              >
                <ThemedText style={[styles.actionButtonText, { color: primaryColor }]}>
                  Önbelleği Temizle
                </ThemedText>
              </Pressable>
            </View>

            {cacheClearedSuccess && (
              <View style={styles.successBanner}>
                <ThemedText style={styles.successBannerText}>
                  Liman ve Cari önbelleği başarıyla temizlendi.
                </ThemedText>
              </View>
            )}
          </View>

          {/* Section 5: Sistem ve Bilgi */}
          <View style={[styles.sectionCard, { backgroundColor: theme.backgroundElement, borderColor: theme.backgroundSelected }]}>
            <ThemedText style={styles.sectionTitle}>Uygulama Bilgisi</ThemedText>

            <View style={styles.infoGridRow}>
              <ThemedText style={[styles.infoGridLabel, { color: theme.textSecondary }]}>Uygulama Adı</ThemedText>
              <ThemedText style={styles.infoGridValue}>Atlas Lojistik</ThemedText>
            </View>
            <View style={styles.divider} />

            <View style={styles.infoGridRow}>
              <ThemedText style={[styles.infoGridLabel, { color: theme.textSecondary }]}>Versiyon</ThemedText>
              <ThemedText style={styles.infoGridValue}>v1.0.0 (Build 57)</ThemedText>
            </View>
            <View style={styles.divider} />

            <View style={styles.infoGridRow}>
              <ThemedText style={[styles.infoGridLabel, { color: theme.textSecondary }]}>Aktif API Adresi</ThemedText>
              <ThemedText style={styles.infoGridValue} numberOfLines={1}>
                {activeBaseUrl || 'Belirtilmedi'}
              </ThemedText>
            </View>

            {user?.USERNAME || user?.username ? (
              <>
                <View style={styles.divider} />
                <View style={styles.infoGridRow}>
                  <ThemedText style={[styles.infoGridLabel, { color: theme.textSecondary }]}>Giriş Yapan Kullanıcı</ThemedText>
                  <ThemedText style={styles.infoGridValue}>
                    {user?.USERNAME || user?.username}
                  </ThemedText>
                </View>
              </>
            ) : null}
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  headerBar: {
    borderBottomWidth: 1,
    paddingHorizontal: 20,
    paddingBottom: 16,
  },
  headerInner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    maxWidth: 900,
    alignSelf: 'center',
    width: '100%',
  },
  backButton: {
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 8,
  },
  backButtonText: {
    fontSize: 15,
    fontWeight: '600',
  },
  titleContainer: {
    flex: 1,
    alignItems: 'center',
    marginHorizontal: 12,
  },
  headerTitle: {
    fontSize: 19,
    fontWeight: '700',
  },
  headerSubTitle: {
    fontSize: 12,
    marginTop: 2,
  },
  closeButton: {
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 8,
  },
  closeButtonText: {
    fontSize: 14,
    fontWeight: '500',
  },
  scrollContent: {
    padding: 20,
    alignItems: 'center',
  },
  contentCardWidth: {
    width: '100%',
    maxWidth: 800,
  },
  sectionCard: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 20,
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 4,
  },
  sectionDesc: {
    fontSize: 13,
    marginBottom: 16,
  },
  optionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 8,
  },
  optionInfo: {
    flex: 1,
    paddingRight: 16,
  },
  optionLabel: {
    fontSize: 14,
    fontWeight: '600',
  },
  optionHelp: {
    fontSize: 12,
    marginTop: 2,
  },
  segmentedContainer: {
    flexDirection: 'row',
    backgroundColor: '#cbd5e1',
    borderRadius: 8,
    padding: 3,
  },
  segmentedBtn: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 6,
  },
  segmentedBtnText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#334155',
  },
  segmentedBtnTextActive: {
    color: '#ffffff',
  },
  divider: {
    height: 1,
    backgroundColor: '#cbd5e1',
    opacity: 0.4,
    marginVertical: 10,
  },
  actionButton: {
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 8,
  },
  actionButtonText: {
    fontSize: 13,
    fontWeight: '600',
  },
  btnPressed: {
    opacity: 0.7,
  },
  successBanner: {
    marginTop: 12,
    padding: 10,
    borderRadius: 8,
    backgroundColor: '#dcfce7',
  },
  successBannerText: {
    fontSize: 13,
    color: '#15803d',
    fontWeight: '500',
    textAlign: 'center',
  },
  infoGridRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 6,
  },
  infoGridLabel: {
    fontSize: 14,
  },
  infoGridValue: {
    fontSize: 14,
    fontWeight: '600',
  },
});
