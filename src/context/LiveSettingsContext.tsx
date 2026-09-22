import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { PlatformSettings } from '../types';
import { firestoreDb } from '../lib/firebase';
import { doc, onSnapshot, setDoc, getDoc, deleteField, updateDoc } from 'firebase/firestore';
import { apiRequest } from '../lib/api';

export const DEFAULT_PLATFORM_SETTINGS: PlatformSettings = {
  siteName: 'AssetFlow',
  tagline: 'Next-Gen Automated Yield & Staking Platform',
  currency: 'USD',
  currencySymbol: '$',
  usdToPkrRate: 280.0,
  referralCommissionPercent: 6.0,
  referralBonusPercent: 6.0,
  minDeposit: 10.0,
  maxDeposit: 5000.0,
  minWithdrawal: 2.0,
  maxWithdrawal: 10000.0,
  withdrawalFeePercent: 0.0,
  dailyEarningCycleHours: 24,
  supportEmail: 'support@assetflow.com',
  supportPhone: '+92 300 1234567',
  supportWhatsApp: 'https://wa.me/923001234567',
  supportTelegram: 'https://t.me/assetflow_official',
  maintenanceMode: false,
  announcementText: 'Special Weekend Earning Multiplier is active for all Gold and Diamond plans!',
  showAnnouncement: true,
  withdrawalTimingEnabled: true,
  withdrawalStartTime: '09:00',
  withdrawalEndTime: '18:00',
  withdrawalAllowedDays: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'],
  withdrawalTimezoneOffset: 5,
  withdrawalTimezoneName: 'PKT (UTC+5)',
  withdrawalClosedMessage: 'Withdrawals are currently closed. Requests are only accepted from 09:00 AM to 06:00 PM (Monday to Saturday) PKT.',
  withdrawalBoxes: [2, 4, 8, 10, 20, 30, 40, 50, 70, 100],
};

interface LiveSettingsContextType {
  settings: PlatformSettings;
  isLiveConnected: boolean;
  lastSyncedAt: Date | null;
  updateSettings: (updates: Partial<PlatformSettings>) => Promise<void>;
  deleteSettingField: (fieldKey: keyof PlatformSettings) => Promise<void>;
  resetToDefaultSettings: () => Promise<void>;
  refreshSettings: () => Promise<void>;
}

const LiveSettingsContext = createContext<LiveSettingsContextType | undefined>(undefined);

export const LiveSettingsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [settings, setSettings] = useState<PlatformSettings>(DEFAULT_PLATFORM_SETTINGS);
  const [isLiveConnected, setIsLiveConnected] = useState<boolean>(false);
  const [lastSyncedAt, setLastSyncedAt] = useState<Date | null>(null);

  // Helper to sync from API
  const syncFromApi = useCallback(async () => {
    try {
      const res = await apiRequest<{ settings: PlatformSettings }>('/api/public-settings');
      if (res.settings) {
        setSettings((prev) => ({ ...prev, ...res.settings }));
        setLastSyncedAt(new Date());
      }
    } catch {
      // ignore network errors
    }
  }, []);

  // Real-time Firestore Listener
  useEffect(() => {
    let unsubscribe: (() => void) | null = null;

    if (firestoreDb) {
      try {
        const settingsDocRef = doc(firestoreDb, 'settings', 'global');

        // Check if doc exists; if not, initialize it with current backend settings
        getDoc(settingsDocRef).then((snap) => {
          if (!snap.exists()) {
            apiRequest<{ settings: PlatformSettings }>('/api/public-settings')
              .then((apiRes) => {
                const initData = apiRes.settings || DEFAULT_PLATFORM_SETTINGS;
                setDoc(settingsDocRef, { ...initData, updatedAt: new Date().toISOString() }, { merge: true });
              })
              .catch(() => {
                setDoc(settingsDocRef, { ...DEFAULT_PLATFORM_SETTINGS, updatedAt: new Date().toISOString() }, { merge: true });
              });
          }
        }).catch((err) => {
          console.warn('Initial Firestore read note:', err);
        });

        // Set up real-time onSnapshot listener (updates within ~100-300ms across ALL devices worldwide!)
        unsubscribe = onSnapshot(
          settingsDocRef,
          (snapshot) => {
            if (snapshot.exists()) {
              const liveData = snapshot.data() as Partial<PlatformSettings>;
              setSettings((prev) => ({
                ...prev,
                ...liveData,
              }));
              setIsLiveConnected(true);
              setLastSyncedAt(new Date());

              // Also trigger a window event so any legacy listeners re-render
              if (typeof window !== 'undefined') {
                window.dispatchEvent(new CustomEvent('settings:realtime_updated', { detail: liveData }));
              }
            } else {
              setIsLiveConnected(true);
            }
          },
          (error) => {
            console.warn('Firestore real-time listener note, falling back to HTTP sync:', error);
            setIsLiveConnected(false);
            syncFromApi();
          }
        );
      } catch (err) {
        console.warn('Firebase setup error, using polling fallback:', err);
        setIsLiveConnected(false);
      }
    }

    // Always fetch once on mount
    syncFromApi();

    // Fast polling fallback (every 2 seconds if not connected to live firestore, or every 10s as safety)
    const interval = setInterval(() => {
      syncFromApi();
    }, 4000);

    return () => {
      if (unsubscribe) unsubscribe();
      clearInterval(interval);
    };
  }, [syncFromApi]);

  // Update Settings globally (Writes to Firebase Firestore & Server Database)
  const updateSettings = async (updates: Partial<PlatformSettings>) => {
    // 1. Optimistic local update
    setSettings((prev) => ({ ...prev, ...updates }));
    setLastSyncedAt(new Date());

    // 2. Push to Firestore for real-time <1s broadcast to all other open tabs / devices
    if (firestoreDb) {
      try {
        const settingsDocRef = doc(firestoreDb, 'settings', 'global');
        await setDoc(
          settingsDocRef,
          {
            ...updates,
            updatedAt: new Date().toISOString(),
          },
          { merge: true }
        );
      } catch (err) {
        console.warn('Firestore write note:', err);
      }
    }

    // 3. Persist to Express server backend & disk
    await apiRequest('/api/admin/settings', {
      method: 'PUT',
      body: JSON.stringify(updates),
    });
  };

  // Delete a specific setting field or reset it
  const deleteSettingField = async (fieldKey: keyof PlatformSettings) => {
    const defaultValue = DEFAULT_PLATFORM_SETTINGS[fieldKey];

    // Optimistically update
    setSettings((prev) => ({ ...prev, [fieldKey]: defaultValue }));

    if (firestoreDb) {
      try {
        const settingsDocRef = doc(firestoreDb, 'settings', 'global');
        await updateDoc(settingsDocRef, {
          [fieldKey]: deleteField(),
          updatedAt: new Date().toISOString(),
        });
      } catch (err) {
        console.warn('Firestore delete field note:', err);
      }
    }

    // Update on server
    await apiRequest('/api/admin/settings', {
      method: 'PUT',
      body: JSON.stringify({ [fieldKey]: defaultValue }),
    });
  };

  // Reset all settings to defaults
  const resetToDefaultSettings = async () => {
    setSettings(DEFAULT_PLATFORM_SETTINGS);
    setLastSyncedAt(new Date());

    if (firestoreDb) {
      try {
        const settingsDocRef = doc(firestoreDb, 'settings', 'global');
        await setDoc(settingsDocRef, {
          ...DEFAULT_PLATFORM_SETTINGS,
          updatedAt: new Date().toISOString(),
        });
      } catch (err) {
        console.warn('Firestore reset note:', err);
      }
    }

    await apiRequest('/api/admin/settings', {
      method: 'PUT',
      body: JSON.stringify(DEFAULT_PLATFORM_SETTINGS),
    });
  };

  return (
    <LiveSettingsContext.Provider
      value={{
        settings,
        isLiveConnected,
        lastSyncedAt,
        updateSettings,
        deleteSettingField,
        resetToDefaultSettings,
        refreshSettings: syncFromApi,
      }}
    >
      {children}
    </LiveSettingsContext.Provider>
  );
};

export const useLiveSettings = () => {
  const context = useContext(LiveSettingsContext);
  if (!context) {
    throw new Error('useLiveSettings must be used within a LiveSettingsProvider');
  }
  return context;
};
