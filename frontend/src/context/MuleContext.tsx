import React, { createContext, useContext, ReactNode, useState, useMemo, useEffect } from 'react';
import { useMuleAnalysis, AppState } from '@/hooks/useMuleAnalysis';
import { AnalysisResult, Transaction } from '@/services/api';

export interface AppSettings {
  highRiskThreshold: number;
  mediumRiskThreshold: number;
  enableDarkTheme: boolean; // Always false; light mode strictly enforced
  detectCycles: boolean;
  detectSmurfing: boolean;
}

interface MuleContextType {
  state: AppState;
  result: AnalysisResult | null;
  transactions: Transaction[];
  error: string | null;
  fileName: string;
  analyze: (file: File) => Promise<void>;
  reset: () => void;
  downloadJSON: () => void;
  settings: AppSettings;
  updateSettings: (newSettings: Partial<AppSettings>) => void;
}

const DEFAULT_SETTINGS: AppSettings = {
  highRiskThreshold: 85,
  mediumRiskThreshold: 65,
  enableDarkTheme: false,
  detectCycles: true,
  detectSmurfing: true,
};

function enforceLightMode() {
  if (typeof document !== 'undefined') {
    document.documentElement.classList.remove('dark');
  }
}

function getInitialSettings(): AppSettings {
  enforceLightMode();

  try {
    const saved = localStorage.getItem('mule_settings');
    if (saved) {
      const parsed = JSON.parse(saved);
      // Preserve other user-configured settings, but strictly override enableDarkTheme to false
      const sanitized: AppSettings = {
        ...DEFAULT_SETTINGS,
        ...parsed,
        enableDarkTheme: false,
      };
      // Overwrite any legacy dark theme setting in localStorage
      localStorage.setItem('mule_settings', JSON.stringify(sanitized));
      return sanitized;
    }
  } catch {
    // Fallback to defaults on error
  }

  try {
    localStorage.setItem('mule_settings', JSON.stringify(DEFAULT_SETTINGS));
  } catch {
    // Ignore storage errors
  }

  return DEFAULT_SETTINGS;
}

const MuleContext = createContext<MuleContextType | undefined>(undefined);

export function MuleProvider({ children }: { children: ReactNode }) {
  const muleData = useMuleAnalysis();
  const [settings, setSettings] = useState<AppSettings>(getInitialSettings);

  useEffect(() => {
    // Guarantee light mode on every render and state change
    enforceLightMode();

    const sanitizedSettings: AppSettings = {
      ...settings,
      enableDarkTheme: false,
    };

    try {
      localStorage.setItem('mule_settings', JSON.stringify(sanitizedSettings));
    } catch {
      // Ignore storage errors
    }
  }, [settings]);

  const updateSettings = (newSettings: Partial<AppSettings>) => {
    setSettings(prev => ({
      ...prev,
      ...newSettings,
      enableDarkTheme: false, // Cannot be set to true
    }));
  };

  const value = useMemo(() => ({
    ...muleData,
    settings,
    updateSettings,
  }), [muleData, settings]);

  return (
    <MuleContext.Provider value={value}>
      {children}
    </MuleContext.Provider>
  );
}

export function useMuleContext() {
  const context = useContext(MuleContext);
  if (context === undefined) {
    throw new Error('useMuleContext must be used within a MuleProvider');
  }
  return context;
}
