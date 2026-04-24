import React from 'react';
import { motion } from 'motion/react';
import { ICONS } from '../constants';
import { useSettings } from '../hooks/useSettings';
import { cn } from '../lib/utils';
import { Theme } from '../types';

export default function Settings() {
  const { settings, setSettings } = useSettings();

  const handleUpdate = (updates: Partial<typeof settings>) => {
    setSettings({ ...settings, ...updates });
  };

  const SettingSection = ({ title, desc, children }: { title: string, desc: string, children: React.ReactNode }) => (
    <div className="flex flex-col md:flex-row justify-between gap-6 py-8 border-b border-slate-800 last:border-0 border-dashed">
      <div className="max-w-md">
        <h3 className="text-sm font-bold text-white uppercase tracking-tight">{title}</h3>
        <p className="text-[11px] text-slate-500 mt-1 leading-relaxed font-medium">{desc}</p>
      </div>
      <div className="flex-shrink-0 flex items-center">
        {children}
      </div>
    </div>
  );

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-8"
    >
      <div className="mb-4">
        <h2 className="text-2xl font-bold tracking-tight text-white mb-2">User Environment Preferences</h2>
        <p className="text-slate-500 text-sm">Synchronize operational defaults and UI behaviors for the predictive suite.</p>
      </div>

      <div className="glass rounded-lg p-8">
        <SettingSection 
          title="UI Manifest Theme" 
          desc="Synchronize the predictive visual shell across global system themes and custom overlays."
        >
          <div className="flex bg-slate-900 border border-slate-800 p-1 rounded">
            {(["light", "dark", "system"] as Theme[]).map((t) => (
              <button 
                key={t}
                onClick={() => handleUpdate({ theme: t })}
                className={cn(
                  "px-4 py-1.5 rounded text-[10px] uppercase font-bold tracking-widest transition-all",
                  settings.theme === t ? "bg-slate-800 text-emerald-400 shadow-sm" : "text-slate-500"
                )}
              >
                {t}
              </button>
            ))}
          </div>
        </SettingSection>

        <SettingSection 
          title="Inference Threshold" 
          desc="Define the minimum probability score required to push specific clients into the high-priority campaign backlog."
        >
          <div className="flex items-center gap-4">
            <input 
              type="number" 
              value={Math.round(settings.threshold * 100)} 
              onChange={(e) => handleUpdate({ threshold: parseInt(e.target.value) / 100 })}
              className="w-20 input-dark text-center font-mono text-emerald-400"
              min="0" max="100"
            />
            <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">%</span>
          </div>
        </SettingSection>

        <SettingSection 
          title="Telemetry Pulse Rate" 
          desc="Frequency of automated health checks against the inference engine and metadata registry."
        >
          <select 
            value={settings.autoRefreshInterval}
            onChange={(e) => handleUpdate({ autoRefreshInterval: parseInt(e.target.value) })}
            className="input-dark min-w-[140px] appearance-none"
          >
            {[5, 10, 15, 30, 60].map(v => (
              <option key={v} value={v} className="bg-slate-900">{v} Seconds</option>
            ))}
            <option value={0} className="bg-slate-900">Manual Toggle</option>
          </select>
        </SettingSection>

        <SettingSection 
          title="CSV Parser Encoding" 
          desc="Global decimal separator for multi-client dataset ingestion (standard: '.', european: ',')."
        >
           <div className="flex bg-slate-900 border border-slate-800 p-1 rounded">
            {([".", ","] as const).map((s) => (
              <button 
                key={s}
                onClick={() => handleUpdate({ csvSeparator: s })}
                className={cn(
                  "w-12 h-8 rounded text-sm font-black transition-all",
                  settings.csvSeparator === s ? "bg-slate-800 text-emerald-400 shadow-sm" : "text-slate-500"
                )}
              >
                {s}
              </button>
            ))}
          </div>
        </SettingSection>
      </div>

      <div className="flex justify-center pt-8">
        <button 
          onClick={() => {
            if (confirm("Reset current buffer and clear system registry?")) {
              localStorage.clear();
              window.location.reload();
            }
          }}
          className="text-slate-600 hover:text-red-500 text-[10px] font-bold uppercase tracking-widest transition-colors flex items-center gap-2"
        >
          <ICONS.trash size={14} /> Clear Local Registry Cache
        </button>
      </div>
    </motion.div>
  );
}

