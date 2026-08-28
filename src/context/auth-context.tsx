import React, { createContext, useContext, useState } from 'react';
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

interface AuthContextType {
  user: UserData | null;
  token: string | null;
  apiUrl: string;
  isLoggedIn: boolean;
  login: (user: UserData, token: string, customApiUrl?: string) => void;
  logout: () => void;
  setApiUrl: (url: string) => void;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  token: null,
  apiUrl: DEFAULT_API_URL,
  isLoggedIn: false,
  login: () => {},
  logout: () => {},
  setApiUrl: () => {},
});

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<UserData | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [apiUrl, setApiUrlState] = useState<string>(DEFAULT_API_URL);

  const login = (userData: UserData, userToken?: string, customApiUrl?: string) => {
    setUser(userData);
    setToken(userToken || null);
    if (customApiUrl) {
      setApiUrlState(customApiUrl.trim().replace(/\/$/, ''));
    }
  };

  const logout = () => {
    setUser(null);
    setToken(null);
  };

  const setApiUrl = (url: string) => {
    if (url) {
      setApiUrlState(url.trim().replace(/\/$/, ''));
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        apiUrl,
        isLoggedIn: !!user,
        login,
        logout,
        setApiUrl,
      }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
