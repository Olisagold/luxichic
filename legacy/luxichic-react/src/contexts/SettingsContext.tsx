import React, { createContext, useContext } from 'react';
import { businessConfig } from '../data/config';
import { useDb } from '../services/db';

interface Settings {
  payOnDeliveryEnabled: boolean;
}

const SettingsContext = createContext<Settings>({ payOnDeliveryEnabled: businessConfig.payOnDeliveryEnabled });

/** `value` comes from App props (Controls panel) and acts as a master switch over the admin setting. */
export function SettingsProvider({ value, children }: {value: Settings;children: React.ReactNode;}) {
  return <SettingsContext.Provider value={value}>{children}</SettingsContext.Provider>;
}

export function useSettings(): Settings {
  const override = useContext(SettingsContext);
  const adminEnabled = useDb((s) => s.settings.payOnDeliveryEnabled);
  return { payOnDeliveryEnabled: override.payOnDeliveryEnabled && adminEnabled };
}