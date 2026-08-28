import { useState } from 'react';
import {
  ActivityIndicator,
  Platform,
  Pressable,
  StyleSheet,
  Switch,
  TextInput,
  View,
} from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { DEFAULT_API_URL } from '@/constants/api';
import { useAuth } from '@/context/auth-context';
import { useResponsive } from '@/hooks/use-responsive';

export function LoginCard() {
  const responsive = useResponsive();
  const { login: authLogin } = useAuth();
  const [username, setUsername] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [rememberMe, setRememberMe] = useState<boolean>(true);
  const [loading, setLoading] = useState<boolean>(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [statusType, setStatusType] = useState<'success' | 'error' | null>(null);
  const [userToken, setUserToken] = useState<string | null>(null);
  const [userData, setUserData] = useState<any | null>(null);



  const handleLogin = async () => {
    if (!username.trim()) {
      setStatusMessage('Lütfen kullanıcı adınızı giriniz.');
      setStatusType('error');
      return;
    }
    if (!password) {
      setStatusMessage('Lütfen şifrenizi giriniz.');
      setStatusType('error');
      return;
    }

    setLoading(true);
    setStatusMessage(null);
    setStatusType(null);
    setUserToken(null);
    setUserData(null);

    const cleanBaseUrl = DEFAULT_API_URL.trim().replace(/\/$/, '');
    const targetUrl = cleanBaseUrl.toLowerCase().includes('/userlogincontrol')
      ? cleanBaseUrl
      : `${cleanBaseUrl}/Login/UserLoginControl`;

    try {
      const response = await fetch(targetUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          USERNAME: username.trim(),
          PASSWORD: password,
          username: username.trim(),
          password: password,
        }),
      });

      const responseText = await response.text();
      let json: any = null;

      try {
        json = JSON.parse(responseText);
      } catch (parseErr) {
        json = null;
      }

      if (json && (json.success === true || json.token || json.user)) {
        const extractedToken =
          json.token ||
          json.user?.TOKEN ||
          json.user?.token ||
          json.user?.Token ||
          json.user?.USERRID ||
          json.user?.userrid ||
          json.user?.RID ||
          json.user?.rid ||
          null;

        if (!extractedToken) {
          setStatusMessage('Sunucudan geçerli oturum tokeni alınamadı.');
          setStatusType('error');
          return;
        }

        const rawUser = json.user || {};
        const extractedRid =
          rawUser.useraccountrid ||
          rawUser.USERACCOUNTRID ||
          rawUser.userAccountRid ||
          rawUser.USERRID ||
          rawUser.userrid ||
          rawUser.RID ||
          rawUser.rid ||
          extractedToken;

        const userPayload = {
          USERNAME: username.trim(),
          username: username.trim(),
          ...(typeof rawUser === 'object' ? rawUser : {}),
          useraccountrid: extractedRid,
          USERACCOUNTRID: extractedRid,
          USERRID: extractedRid,
          userrid: extractedRid,
        };

        setUserToken(extractedToken);
        setUserData(userPayload);
        setStatusMessage(json.message || 'Giriş başarılı!');
        setStatusType('success');

        authLogin(userPayload, extractedToken, cleanBaseUrl);
      } else {
        setStatusMessage('Kullanıcı adı veya şifre hatalı. Lütfen bilgilerinizi kontrol ediniz.');
        setStatusType('error');
      }
    } catch (err: any) {
      console.error('Login error:', err);
      setStatusMessage('Giriş işlemi gerçekleştirilemedi. Lütfen bağlantınızı kontrol edip tekrar deneyiniz.');
      setStatusType('error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={[styles.cardWrapper, responsive.isMobile && { marginVertical: 8 }]}>
      <View style={[
        styles.cardContainer,
        responsive.isMobile && styles.cardContainerMobile,
        responsive.isTablet && styles.cardContainerTablet
      ]}>
        {/* Header Bar */}
        <View style={[styles.headerBar, responsive.isMobile && styles.headerBarMobile]}>
          <ThemedText style={styles.headerTitle}>Kullanıcı Giriş</ThemedText>
        </View>

        {/* Card Body */}
        <View style={[styles.cardBody, responsive.isMobile && styles.cardBodyMobile]}>
          {/* Subtitle */}
          <ThemedText style={styles.subtitle}>
            Sisteme giriş yapmak için kayıtlı isim ve şifrenizi giriniz
          </ThemedText>

          {/* Username Input */}
          <View style={styles.inputContainer}>
            <TextInput
              style={styles.textInput}
              value={username}
              onChangeText={setUsername}
              placeholder="Kullanıcı Adı"
              placeholderTextColor="#94a3b8"
              autoCapitalize="none"
            />
          </View>

          {/* Password Input */}
          <View style={styles.inputContainer}>
            <TextInput
              style={styles.textInput}
              value={password}
              onChangeText={setPassword}
              placeholder="Şifre"
              placeholderTextColor="#94a3b8"
              secureTextEntry={true}
              autoCapitalize="none"
            />
          </View>




          {/* Forgot Password & Remember Me Row */}
          <View style={styles.optionsRow}>
            <Pressable
              onPress={() => alert('Şifre sıfırlama bağlantısı gönderildi.')}
              style={({ pressed }) => pressed && styles.pressed}>
              <ThemedText style={styles.forgotPasswordText}>
                Şifrenizi mi unuttunuz ?
              </ThemedText>
            </Pressable>

            <View style={styles.rememberMeContainer}>
              <Switch
                value={rememberMe}
                onValueChange={setRememberMe}
                trackColor={{ false: '#cbd5e1', true: '#1d72f3' }}
                thumbColor="#ffffff"
                style={Platform.OS === 'ios' ? { transform: [{ scaleX: 0.8 }, { scaleY: 0.8 }] } : undefined}
              />
              <ThemedText style={styles.rememberMeText}>Beni Hatırla</ThemedText>
            </View>
          </View>

          {/* Divider */}
          <View style={styles.divider} />

          {/* Login Primary Button */}
          <Pressable
            style={({ pressed }) => [styles.loginButton, pressed && styles.buttonPressed]}
            onPress={handleLogin}
            disabled={loading}>
            {loading ? (
              <ActivityIndicator color="#ffffff" />
            ) : (
              <ThemedText style={styles.loginButtonText}>Oturumu Açın</ThemedText>
            )}
          </Pressable>

          {/* Status Message */}
          {statusMessage && (
            <View
              style={[
                styles.statusBox,
                {
                  backgroundColor: statusType === 'success'
                    ? 'rgba(34, 197, 94, 0.12)'
                    : 'rgba(239, 68, 68, 0.12)',
                  borderColor: statusType === 'success' ? '#22c55e' : '#ef4444',
                },
              ]}>
              <ThemedText
                style={{
                  fontSize: 13,
                  fontWeight: '600',
                  color: statusType === 'success' ? '#166534' : '#991b1b',
                  textAlign: 'center',
                }}>
                {statusMessage}
              </ThemedText>
            </View>
          )}
        </View>

        {/* Footer Bar */}
        <View style={styles.footerBar} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  cardWrapper: {
    width: '100%',
    alignItems: 'center',
    marginVertical: 12,
  },
  cardContainer: {
    width: '100%',
    maxWidth: 440,
    backgroundColor: '#ffffff',
    borderRadius: 14,
    overflow: 'hidden',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.12,
    shadowRadius: 16,
    elevation: 6,
    borderWidth: Platform.OS === 'web' ? 1 : 0,
    borderColor: '#e2e8f0',
    marginTop: 70,
  },
  cardContainerMobile: {
    width: '94%',
    marginTop: 20,
  },
  cardContainerTablet: {
    maxWidth: 480,
    marginTop: 60,
  },
  headerBar: {
    backgroundColor: '#2350a2',
    paddingVertical: 18,
    paddingHorizontal: 22,
  },
  headerBarMobile: {
    paddingVertical: 14,
    paddingHorizontal: 16,
  },
  headerTitle: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  cardBody: {
    backgroundColor: '#f7f9fc',
    padding: 24,
    gap: 16,
  },
  cardBodyMobile: {
    padding: 16,
    gap: 12,
  },
  subtitle: {
    color: '#7e8b9b',
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 4,
  },
  inputContainer: {
    width: '100%',
  },
  textInput: {
    backgroundColor: '#e4effe',
    borderRadius: 10,
    paddingHorizontal: 16,
    paddingVertical: Platform.OS === 'ios' ? 14 : 12,
    fontSize: 15,
    color: '#1e293b',
    borderWidth: 1,
    borderColor: '#d0e1fd',
  },
  copyBadgeInline: {
    backgroundColor: '#2563eb',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 5,
  },
  optionsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 2,
  },
  forgotPasswordText: {
    color: '#1d72f3',
    fontSize: 13.5,
    fontWeight: '600',
  },
  rememberMeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  rememberMeText: {
    color: '#7e8b9b',
    fontSize: 13,
  },
  divider: {
    height: 1,
    backgroundColor: '#e2e8f0',
    marginVertical: 4,
  },
  loginButton: {
    backgroundColor: '#1d72f3',
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#1d72f3',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 3,
  },
  buttonPressed: {
    opacity: 0.88,
  },
  loginButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  statusBox: {
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    marginTop: 4,
  },
  copyBadge: {
    backgroundColor: '#2563eb',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 6,
  },
  copyBadgeText: {
    color: '#ffffff',
    fontSize: 11,
    fontWeight: '600',
  },
  languageContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 12,
  },
  flagBadge: {
    width: 26,
    height: 20,
    borderRadius: 4,
    overflow: 'hidden',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#e11d48',
  },
  flagEmoji: {
    fontSize: 14,
    lineHeight: 16,
  },
  languageText: {
    color: '#334155',
    fontSize: 14,
    fontWeight: '600',
  },
  chevron: {
    color: '#94a3b8',
    fontSize: 14,
    fontWeight: 'bold',
    marginLeft: 2,
  },
  footerBar: {
    backgroundColor: '#2350a2',
    paddingVertical: 16,
    paddingHorizontal: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  footerText: {
    color: '#94b3eb',
    fontSize: 12,
    textAlign: 'center',
    fontWeight: '500',
  },
  pressed: {
    opacity: 0.7,
  },
});
