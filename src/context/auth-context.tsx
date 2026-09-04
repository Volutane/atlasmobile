import React, { createContext, useContext, useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { DEFAULT_API_URL } from '@/constants/api';

export interface UserData {
  username?: string;
  name?: string;
  isim?: string;
  NAME?: string;
  ISIM?: string;
  USERNAME?: string;
  TOKEN?: string;
  token?: string;
  [key: string]: any;
}

const STORAGE_KEYS = {
  USER: '@auth_user',
  TOKEN: '@auth_token',
  API_URL: '@auth_api_url',
  REMEMBER_ME: '@auth_remember_me',
  SAVED_USERNAME: '@auth_saved_username',
  SAVED_PASSWORD: '@auth_saved_password',
};

interface AuthContextType {
  user: UserData | null;
  token: string | null;
  apiUrl: string;
  isLoggedIn: boolean;
  isLoading: boolean;
  savedUsername: string;
  savedPassword: string;
  rememberMe: boolean;
  login: (
    userData: UserData,
    token: string,
    customApiUrl?: string,
    shouldRemember?: boolean,
    rawPassword?: string
  ) => Promise<void>;
  logout: () => Promise<void>;
  setApiUrl: (url: string) => void;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  token: null,
  apiUrl: DEFAULT_API_URL,
  isLoggedIn: false,
  isLoading: true,
  savedUsername: '',
  savedPassword: '',
  rememberMe: true,
  login: async () => {},
  logout: async () => {},
  setApiUrl: () => {},
});

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<UserData | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [apiUrl, setApiUrlState] = useState<string>(DEFAULT_API_URL);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [savedUsername, setSavedUsername] = useState<string>('');
  const [savedPassword, setSavedPassword] = useState<string>('');
  const [rememberMe, setRememberMeState] = useState<boolean>(true);

  useEffect(() => {
    let isMounted = true;
    (async () => {
      try {
        const [storedUser, storedToken, storedApiUrl, storedRememberMe, storedUsername, storedPassword] =
          await Promise.all([
            AsyncStorage.getItem(STORAGE_KEYS.USER),
            AsyncStorage.getItem(STORAGE_KEYS.TOKEN),
            AsyncStorage.getItem(STORAGE_KEYS.API_URL),
            AsyncStorage.getItem(STORAGE_KEYS.REMEMBER_ME),
            AsyncStorage.getItem(STORAGE_KEYS.SAVED_USERNAME),
            AsyncStorage.getItem(STORAGE_KEYS.SAVED_PASSWORD),
          ]);

        if (!isMounted) return;

        if (storedApiUrl) {
          setApiUrlState(storedApiUrl);
        }

        const isRemember = storedRememberMe !== 'false';
        setRememberMeState(isRemember);

        if (storedUsername) setSavedUsername(storedUsername);
        if (storedPassword) setSavedPassword(storedPassword);

        if (isRemember && storedUser && storedToken) {
          try {
            const parsedUser = JSON.parse(storedUser);
            setUser(parsedUser);
            setToken(storedToken);
          } catch (e) {
            console.error('Failed to parse stored user:', e);
          }
        }
      } catch (err) {
        console.error('Failed to restore auth state from AsyncStorage:', err);
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    })();

    return () => {
      isMounted = false;
    };
  }, []);

  const login = async (
    userData: UserData,
    userToken?: string,
    customApiUrl?: string,
    shouldRemember: boolean = true,
    rawPassword?: string
  ) => {
    setUser(userData);
    const effectiveToken = userToken || null;
    setToken(effectiveToken);
    setRememberMeState(shouldRemember);

    let effectiveUrl = apiUrl;
    if (customApiUrl) {
      effectiveUrl = customApiUrl.trim().replace(/\/$/, '');
      setApiUrlState(effectiveUrl);
    }

    try {
      const usernameToSave = userData.username || userData.USERNAME || '';

      await AsyncStorage.multiSet([
        [STORAGE_KEYS.USER, JSON.stringify(userData)],
        [STORAGE_KEYS.TOKEN, effectiveToken || ''],
        [STORAGE_KEYS.API_URL, effectiveUrl],
        [STORAGE_KEYS.REMEMBER_ME, shouldRemember ? 'true' : 'false'],
      ]);

      if (shouldRemember) {
        await AsyncStorage.multiSet([
          [STORAGE_KEYS.SAVED_USERNAME, usernameToSave],
          [STORAGE_KEYS.SAVED_PASSWORD, rawPassword || ''],
        ]);
        setSavedUsername(usernameToSave);
        if (rawPassword) setSavedPassword(rawPassword);
      } else {
        await AsyncStorage.multiRemove([STORAGE_KEYS.SAVED_USERNAME, STORAGE_KEYS.SAVED_PASSWORD]);
        setSavedUsername('');
        setSavedPassword('');
      }
    } catch (err) {
      console.error('Failed to save auth state to AsyncStorage:', err);
    }
  };

  const logout = async () => {
    setUser(null);
    setToken(null);
    try {
      await AsyncStorage.multiRemove([STORAGE_KEYS.USER, STORAGE_KEYS.TOKEN]);
      await AsyncStorage.setItem(STORAGE_KEYS.REMEMBER_ME, 'false');
    } catch (err) {
      console.error('Failed to clear auth state from AsyncStorage:', err);
    }
  };

  const setApiUrl = (url: string) => {
    if (url) {
      const formatted = url.trim().replace(/\/$/, '');
      setApiUrlState(formatted);
      AsyncStorage.setItem(STORAGE_KEYS.API_URL, formatted).catch(() => {});
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        apiUrl,
        isLoggedIn: !!user,
        isLoading,
        savedUsername,
        savedPassword,
        rememberMe,
        login,
        logout,
        setApiUrl,
      }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
