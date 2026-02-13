import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { fetchSettings } from '@/lib/api';

interface SettingsContextType {
  settings: Record<string, string>;
  refreshSettings: () => Promise<void>;
}

const SettingsContext = createContext<SettingsContextType>({
  settings: { site_name: 'CNPJ Data', site_subtitle: 'Receita Federal' },
  refreshSettings: async () => {},
});

export function SettingsProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<Record<string, string>>({
    site_name: 'CNPJ Data',
    site_subtitle: 'Receita Federal',
  });

  const refreshSettings = async () => {
    try {
      const data = await fetchSettings();
      if (data) setSettings(data);
    } catch {
      // keep defaults
    }
  };

  useEffect(() => { refreshSettings(); }, []);

  return (
    <SettingsContext.Provider value={{ settings, refreshSettings }}>
      {children}
    </SettingsContext.Provider>
  );
}

export const useSettings = () => useContext(SettingsContext);
