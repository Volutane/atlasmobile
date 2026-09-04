import { useEffect, useRef, useState } from 'react';
import {
  Animated,
  Dimensions,
  Easing,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';

import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { useTheme } from '@/hooks/use-theme';


export interface SideMenuProps {
  isOpen: boolean;
  onClose: () => void;
  user?: any;
  onLogout?: () => void;
  onOpenCariYonetimi?: () => void;
  onOpenCariCreate?: () => void;
  onOpenSystemSettings?: () => void;
}

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const DRAWER_WIDTH = Math.min(320, SCREEN_WIDTH * 0.82);

export function SideMenu({
  isOpen,
  onClose,
  user,
  onLogout,
  onOpenCariYonetimi,
  onOpenCariCreate,
  onOpenSystemSettings,
}: SideMenuProps) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const headerTopPadding = Platform.OS === 'web' ? 18 : Math.max(insets.top + 8, 24);

  const [isRendered, setIsRendered] = useState<boolean>(isOpen);
  const slideAnim = useRef(new Animated.Value(-DRAWER_WIDTH)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (isOpen) {
      setIsRendered(true);
      Animated.parallel([
        Animated.timing(slideAnim, {
          toValue: 0,
          duration: 500,
          easing: Easing.out(Easing.bezier(0.16, 1, 0.3, 1)),
          useNativeDriver: Platform.OS !== 'web',
        }),
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 500,
          easing: Easing.out(Easing.quad),
          useNativeDriver: Platform.OS !== 'web',
        }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(slideAnim, {
          toValue: -DRAWER_WIDTH,
          duration: 500,
          easing: Easing.in(Easing.cubic),
          useNativeDriver: Platform.OS !== 'web',
        }),
        Animated.timing(fadeAnim, {
          toValue: 0,
          duration: 500,
          easing: Easing.in(Easing.quad),
          useNativeDriver: Platform.OS !== 'web',
        }),
      ]).start(({ finished }) => {
        if (finished) {
          setIsRendered(false);
        }
      });
    }
  }, [isOpen, slideAnim, fadeAnim]);

  if (!isRendered && !isOpen) return null;

  const displayName = user?.name || user?.username || 'Kullanıcı';
  const displayRole = user?.role || 'Sistem Kullanıcısı';

  const menuSections = [
    {
      title: 'MODÜLLER VE GEZİNME',
      items: [
        {
          id: 'cari',
          label: 'Cari Yönetimi',
          description: 'Cari Listesi Görüntüleme',
          onPress: () => {
            onClose();
            if (onOpenCariYonetimi) onOpenCariYonetimi();
          },
        },
      ],
    },
    {
      title: 'SİSTEM VE AYARLAR',
      items: [
        {
          id: 'settings',
          label: 'Sistem Ayarları',
          description: 'Tercihler ve genel yapılandırmalar',
          onPress: () => {
            onClose();
            if (onOpenSystemSettings) onOpenSystemSettings();
          },
        },
        {
          id: 'profile',
          label: 'Kullanıcı Profili',
          description: 'Hesap bilgileri ve yetkiler',
          onPress: () => {
            onClose();
          },
        },
      ],
    },
  ];

  return (
    <Modal
      transparent
      visible={isRendered || isOpen}
      onRequestClose={onClose}
      animationType="none"
    >
      <View style={styles.modalContainer}>
        {/* Backdrop Overlay */}
        <Pressable style={styles.backdropPressable} onPress={onClose}>
          <Animated.View
            style={[
              styles.backdrop,
              {
                opacity: fadeAnim,
              },
            ]}
          />
        </Pressable>

        {/* Sliding Drawer Panel */}
        <Animated.View
          style={[
            styles.drawerPanel,
            {
              width: DRAWER_WIDTH,
              transform: [{ translateX: slideAnim }],
            },
          ]}
        >
          {/* Drawer Header */}
          <View style={[styles.drawerHeader, { paddingTop: headerTopPadding }]}>
            <View style={styles.headerTitleRow}>
              <View style={styles.brandBadge}>
                <ThemedText style={styles.brandBadgeText}>L</ThemedText>
              </View>
              <View>
                <ThemedText style={styles.brandTitleText}>
                  LINK LOJİSTİK
                </ThemedText>
                <ThemedText style={styles.brandSubTitleText}>
                  Yan Menü
                </ThemedText>
              </View>
            </View>

            <Pressable
              onPress={onClose}
              style={({ pressed }) => [
                styles.closeButton,
                pressed && styles.pressed,
              ]}
            >
              <ThemedText style={styles.closeButtonText}>Kapat</ThemedText>
            </Pressable>
          </View>

          {/* User Profile Info Card */}
          <View style={styles.userCard}>
            <View style={styles.userCardContent}>
              <ThemedText style={styles.userNameText} numberOfLines={1}>
                {displayName}
              </ThemedText>
              <ThemedText style={styles.userRoleText} numberOfLines={1}>
                {displayRole}
              </ThemedText>
            </View>
          </View>

          {/* Menu Items List */}
          <ScrollView
            style={styles.menuScrollView}
            contentContainerStyle={styles.menuContent}
            showsVerticalScrollIndicator={false}
          >
            {menuSections.map((section, idx) => (
              <View key={section.title} style={styles.sectionContainer}>
                {idx > 0 && <View style={styles.sectionDivider} />}
                <ThemedText style={styles.sectionTitle}>
                  {section.title}
                </ThemedText>
                {section.items.map((item) => (
                  <Pressable
                    key={item.id}
                    onPress={item.onPress}
                    style={({ pressed }) => [
                      styles.menuItem,
                      pressed && styles.menuItemPressed,
                    ]}
                  >
                    <View style={styles.menuItemTextContainer}>
                      <ThemedText style={styles.menuItemLabel}>
                        {item.label}
                      </ThemedText>
                      {item.description ? (
                        <ThemedText style={styles.menuItemDesc}>
                          {item.description}
                        </ThemedText>
                      ) : null}
                    </View>
                    <ThemedText style={styles.menuItemArrow}>›</ThemedText>
                  </Pressable>
                ))}
              </View>
            ))}
          </ScrollView>

          {/* Footer Action (Logout) */}
          {onLogout ? (
            <View style={styles.drawerFooter}>
              <Pressable
                onPress={() => {
                  onClose();
                  onLogout();
                }}
                style={({ pressed }) => [
                  styles.logoutButton,
                  pressed && styles.logoutButtonPressed,
                ]}
              >
                <ThemedText style={styles.logoutButtonText}>
                  Oturumu Kapat
                </ThemedText>
              </Pressable>
            </View>
          ) : null}
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalContainer: {
    flex: 1,
    flexDirection: 'row',
  },
  backdropPressable: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  backdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(15, 23, 42, 0.45)',
  },
  drawerPanel: {
    height: '100%',
    backgroundColor: '#ffffff',
    borderRightWidth: 1,
    borderRightColor: '#e2e8f0',
    shadowColor: '#000000',
    shadowOffset: { width: 4, height: 0 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 10,
    zIndex: 100,
  },
  drawerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 18,
    paddingTop: Platform.OS === 'web' ? 18 : 24,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  headerTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  brandBadge: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: '#2563eb',
    alignItems: 'center',
    justifyContent: 'center',
  },
  brandBadgeText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '800',
  },
  brandTitleText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0f172a',
    letterSpacing: 0.5,
  },
  brandSubTitleText: {
    fontSize: 11,
    color: '#64748b',
    fontWeight: '500',
  },
  closeButton: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
    backgroundColor: '#f1f5f9',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  closeButtonText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#475569',
  },
  userCard: {
    marginHorizontal: 16,
    marginTop: 14,
    marginBottom: 6,
    padding: 12,
    borderRadius: 10,
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  userCardContent: {
    gap: 2,
  },
  userNameText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#1e293b',
  },
  userRoleText: {
    fontSize: 11,
    color: '#64748b',
    fontWeight: '500',
  },
  menuScrollView: {
    flex: 1,
  },
  menuContent: {
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  sectionContainer: {
    marginBottom: 16,
  },
  sectionDivider: {
    height: 1,
    backgroundColor: '#f1f5f9',
    marginBottom: 14,
  },
  sectionTitle: {
    fontSize: 11,
    fontWeight: '700',
    color: '#94a3b8',
    letterSpacing: 0.8,
    marginBottom: 8,
    paddingLeft: 4,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 8,
    marginBottom: 4,
    backgroundColor: '#ffffff',
  },
  menuItemPressed: {
    backgroundColor: '#f1f5f9',
  },
  menuItemTextContainer: {
    flex: 1,
    marginRight: 8,
  },
  menuItemLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#1e293b',
  },
  menuItemDesc: {
    fontSize: 11,
    color: '#64748b',
    marginTop: 2,
  },
  menuItemArrow: {
    fontSize: 16,
    color: '#94a3b8',
    fontWeight: '300',
  },
  drawerFooter: {
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
    backgroundColor: '#ffffff',
  },
  logoutButton: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    backgroundColor: '#fef2f2',
    borderWidth: 1,
    borderColor: '#fecaca',
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoutButtonPressed: {
    backgroundColor: '#fee2e2',
  },
  logoutButtonText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#dc2626',
  },
  pressed: {
    opacity: 0.7,
  },
});
