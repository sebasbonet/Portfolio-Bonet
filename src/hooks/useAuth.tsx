import React, { createContext, useContext, useEffect, useState } from 'react';
import { onAuthStateChanged, User, signInWithPopup, GoogleAuthProvider, signOut, signInAnonymously } from 'firebase/auth';
import { auth } from '../lib/firebase';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: () => Promise<void>;
  loginAsDemo: () => Promise<void>;
  skipAuth: () => void;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check if we have a skipped auth session in local storage
    const savedUser = localStorage.getItem('nexus_mock_user');
    if (savedUser) {
      setUser(JSON.parse(savedUser));
      setLoading(false);
      return;
    }

    const unsubscribe = onAuthStateChanged(auth, (u) => {
      setUser(u);
      setLoading(false);
    });
    return unsubscribe;
  }, []);

  const login = async () => {
    const provider = new GoogleAuthProvider();
    try {
      await signInWithPopup(auth, provider);
    } catch (error: any) {
      console.error('Firebase Login Error:', error);
      // Fallback for demo purposes if domain isn't authorized yet
      if (error.code === 'auth/unauthorized-domain' || error.code === 'auth/popup-blocked') {
        alert(`Login Failed: ${error.message}. Use "Try Now" to explore the app without login.`);
      } else {
        alert(`Login Failed: ${error.message}.`);
      }
    }
  };

  const loginAsDemo = async () => {
    try {
      await signInAnonymously(auth);
    } catch (error: any) {
      console.error('Demo Login Error:', error);
    }
  };

  const skipAuth = () => {
    const mockUser = {
      uid: 'mock-user-id',
      displayName: 'Guest User',
      email: 'guest@nexus.io',
      photoURL: null,
    } as any;
    setUser(mockUser);
    localStorage.setItem('nexus_mock_user', JSON.stringify(mockUser));
    setLoading(false);
  };

  const logout = async () => {
    localStorage.removeItem('nexus_mock_user');
    await signOut(auth);
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, logout, loginAsDemo, skipAuth }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
};
