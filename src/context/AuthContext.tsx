import React, { createContext, useContext, useState, useEffect } from 'react';
import { doc, onSnapshot, setDoc, getDoc } from 'firebase/firestore';
import { User, UserBalance, UserRole, UserStatus } from '../types';
import { db, auth } from '../firebase/config';
import {
  loginWithGoogle,
  loginWithEmail,
  registerWithEmail,
  signOutUser,
  subscribeToAuthState,
  mapDocToUser,
  syncUserProfile,
} from '../firebase/auth';
import { ensureFirestoreDefaults } from '../services/firebaseSync';
import { apiRequest, getStoredToken, setStoredToken, removeStoredToken } from '../lib/api';

interface AuthContextType {
  user: User | null;
  balance: UserBalance | null;
  isLoading: boolean;
  isAdmin: boolean;
  login: (identifier: string, password: string) => Promise<void>;
  register: (name: string, username: string, email: string, password: string, referralCode?: string) => Promise<void>;
  loginGoogle: () => Promise<void>;
  quickLogin: (role: 'user' | 'admin') => Promise<void>;
  logout: () => void;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [balance, setBalance] = useState<UserBalance | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Initialize Cloud Firestore seed data once on mount
  useEffect(() => {
    ensureFirestoreDefaults().catch(console.warn);
  }, []);

  // Compute UserBalance from live user document in Firestore
  const buildBalanceFromUserData = (userId: string, data: any): UserBalance => {
    const totalBal = Number(data.balance || 0);
    const totalDep = Number(data.totalDeposit || 0);
    const totalWith = Number(data.totalWithdrawal || 0);
    return {
      userId,
      totalBalance: totalBal,
      totalDeposits: totalDep,
      totalWithdrawals: totalWith,
      todayEarnings: Number(data.todayEarnings || 0),
      totalEarnings: Number(data.totalEarnings || 0),
      availableWithdrawal: totalBal,
      referralCommission: Number(data.referralCommission || 0),
      teamRewards: Number(data.teamRewards || 0),
      promoRewards: Number(data.promoRewards || 0),
    };
  };

  // Sync state from server/me if token exists, fallback to Firebase auth
  const refreshProfile = async () => {
    try {
      const data = await apiRequest<{ user: User; balance: UserBalance }>('/api/auth/me');
      setUser(data.user);
      setBalance(data.balance);
    } catch (err) {
      removeStoredToken();
      setUser(null);
      setBalance(null);
    }
  };

  // 1. Listen to Firebase Auth state
  useEffect(() => {
    const unsubAuth = subscribeToAuthState(async (fbUser) => {
      if (fbUser) {
        try {
          const profile = await syncUserProfile(fbUser);
          setUser(profile);
          setIsLoading(false);
        } catch (e) {
          console.warn('Firebase profile sync:', e);
          setIsLoading(false);
        }
      } else {
        const token = getStoredToken();
        if (token) {
          refreshProfile().finally(() => setIsLoading(false));
        } else {
          setIsLoading(false);
        }
      }
    });

    return () => unsubAuth();
  }, []);

  // 2. Realtime listener on user doc in Cloud Firestore
  // Sub-second propagation: If an admin modifies balance, block status, etc., UI updates instantly!
  useEffect(() => {
    if (!user?.id) return;

    const userDocRef = doc(db, 'users', user.id);
    const unsubscribe = onSnapshot(
      userDocRef,
      (docSnap) => {
        if (docSnap.exists()) {
          const cloudData = docSnap.data();
          const updatedUser = mapDocToUser(cloudData, user.id);
          setUser(updatedUser);
          setBalance(buildBalanceFromUserData(user.id, cloudData));
        }
      },
      (err) => {
        console.warn('Realtime user onSnapshot:', err);
      }
    );

    return () => unsubscribe();
  }, [user?.id]);

  const login = async (identifier: string, password: string) => {
    try {
      // First try Firebase Auth if identifier is an email
      if (identifier.includes('@')) {
        const u = await loginWithEmail(identifier, password);
        setUser(u);
        return;
      }
    } catch {
      // Fallback to server route
    }

    const data = await apiRequest<{ token: string; user: User; balance: UserBalance }>('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ identifier, password }),
    });
    setStoredToken(data.token);
    setUser(data.user);
    setBalance(data.balance);

    // Sync to Firestore
    try {
      await setDoc(doc(db, 'users', data.user.id), {
        uid: data.user.id,
        name: data.user.name,
        email: data.user.email,
        username: data.user.username,
        role: data.user.role,
        status: data.user.status,
        balance: data.balance.totalBalance,
        totalDeposit: data.balance.totalDeposits,
        totalWithdrawal: data.balance.totalWithdrawals,
        referralCode: data.user.referralCode,
        updatedAt: new Date().toISOString(),
      }, { merge: true });
    } catch {
      // Ignore
    }
  };

  const register = async (name: string, username: string, email: string, password: string, referralCode?: string) => {
    try {
      const u = await registerWithEmail(name, username, email, password, referralCode);
      setUser(u);
      return;
    } catch (fbErr: any) {
      console.warn('Firebase registration fallback to server:', fbErr?.message);
    }

    const data = await apiRequest<{ token: string; user: User; balance: UserBalance }>('/api/auth/register', {
      method: 'POST',
      body: JSON.stringify({ name, username, email, password, referralCode }),
    });
    setStoredToken(data.token);
    setUser(data.user);
    setBalance(data.balance);

    // Mirror to Firestore
    try {
      await setDoc(doc(db, 'users', data.user.id), {
        uid: data.user.id,
        name: data.user.name,
        email: data.user.email,
        username: data.user.username,
        role: data.user.role,
        status: data.user.status,
        balance: 0,
        totalDeposit: 0,
        totalWithdrawal: 0,
        referralCode: data.user.referralCode,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }, { merge: true });
    } catch {
      // Ignore
    }
  };

  const loginGoogle = async () => {
    setIsLoading(true);
    try {
      const u = await loginWithGoogle();
      setUser(u);
    } finally {
      setIsLoading(false);
    }
  };

  const quickLogin = async (role: 'user' | 'admin') => {
    setIsLoading(true);
    try {
      const data = await apiRequest<{ token: string; user: User; balance: UserBalance }>('/api/auth/quick-login', {
        method: 'POST',
        body: JSON.stringify({ role }),
      });
      setStoredToken(data.token);
      setUser(data.user);
      setBalance(data.balance);

      // Mirror to Firestore user doc
      await setDoc(doc(db, 'users', data.user.id), {
        uid: data.user.id,
        name: data.user.name,
        email: data.user.email,
        username: data.user.username,
        role: data.user.role,
        status: data.user.status,
        balance: data.balance.totalBalance,
        totalDeposit: data.balance.totalDeposits,
        totalWithdrawal: data.balance.totalWithdrawals,
        referralCode: data.user.referralCode,
        updatedAt: new Date().toISOString(),
      }, { merge: true });

      if (data.user.role === 'admin') {
        await setDoc(doc(db, 'admins', data.user.id), {
          uid: data.user.id,
          email: data.user.email,
          role: 'admin',
          createdAt: new Date().toISOString(),
        }, { merge: true });
      }
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async () => {
    removeStoredToken();
    try {
      await signOutUser();
    } catch {
      // Ignore
    }
    setUser(null);
    setBalance(null);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        balance,
        isLoading,
        isAdmin: user?.role === 'admin',
        login,
        register,
        loginGoogle,
        quickLogin,
        logout,
        refreshProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
