import { useEffect, useState } from "react";
import { UserSettings } from "../types";

const DEFAULT_SETTINGS: UserSettings = {
  threshold: 0.5,
  theme: "system",
  autoRefreshInterval: 15,
  csvSeparator: ".",
};

export function useSettings() {
  const [settings, setSettings] = useState<UserSettings>(() => {
    const saved = localStorage.getItem("bank_predictor_settings");
    return saved ? { ...DEFAULT_SETTINGS, ...JSON.parse(saved) } : DEFAULT_SETTINGS;
  });

  useEffect(() => {
    localStorage.setItem("bank_predictor_settings", JSON.stringify(settings));
    
    const root = window.document.documentElement;
    const isDark = 
      settings.theme === "dark" || 
      (settings.theme === "system" && window.matchMedia("(prefers-color-scheme: dark)").matches);
    
    root.classList.toggle("dark", isDark);
  }, [settings]);

  return { settings, setSettings };
}
