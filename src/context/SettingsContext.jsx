import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '../utils/supabaseClient';
import { storageFallback } from '../utils/storageFallback';

const SettingsContext = createContext({
  settings: null,
  hours: [],
  loading: true,
  refreshSettings: async () => {},
});

export const SettingsProvider = ({ children }) => {
  const [settings, setSettings] = useState(storageFallback.getSettings());
  const [hours, setHours] = useState(storageFallback.getHours());
  const [loading, setLoading] = useState(true);

  const fetchSettingsAndHours = async () => {
    const configured = import.meta.env.VITE_SUPABASE_URL && 
                       import.meta.env.VITE_SUPABASE_ANON_KEY && 
                       !import.meta.env.VITE_SUPABASE_URL.includes('placeholder') &&
                       !import.meta.env.VITE_SUPABASE_URL.includes('your-project-id');

    if (!configured) {
      setSettings(storageFallback.getSettings());
      setHours(storageFallback.getHours());
      setLoading(false);
      return;
    }

    try {
      // Fetch shop config (singleton row at ID 1)
      const { data: configData, error: configError } = await supabase
        .from('business_settings')
        .select('*')
        .eq('id', 1)
        .single();

      if (!configError && configData) {
        setSettings(configData);
        storageFallback.saveSettings(configData);
      } else {
        // Use localStorage values
        setSettings(storageFallback.getSettings());
      }

      // Fetch weekly hours
      const { data: hoursData, error: hoursError } = await supabase
        .from('business_hours')
        .select('*')
        .order('day_of_week', { ascending: true });

      if (!hoursError && hoursData && hoursData.length > 0) {
        setHours(hoursData);
        storageFallback.saveHours(hoursData);
      } else {
        // Use localStorage values
        setHours(storageFallback.getHours());
      }
    } catch (err) {
      console.error('Error fetching settings and hours:', err);
      setSettings(storageFallback.getSettings());
      setHours(storageFallback.getHours());
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSettingsAndHours();
  }, []);

  const value = {
    settings,
    hours,
    loading,
    refreshSettings: fetchSettingsAndHours,
  };

  return (
    <SettingsContext.Provider value={value}>
      {children}
    </SettingsContext.Provider>
  );
};

export const useSettings = () => useContext(SettingsContext);
