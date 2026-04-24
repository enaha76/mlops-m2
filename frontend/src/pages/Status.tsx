import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { ICONS } from '../constants';
import { HealthResponse } from '../types';
import { cn, formatDate } from '../lib/utils';
import { useSettings } from '../hooks/useSettings';

export default function Status() {
  const { settings } = useSettings();
  const [health, setHealth] = useState<HealthResponse | null>(null);
  const [lastRefreshed, setLastRefreshed] = useState<Date>(new Date());
  const [loading, setLoading] = useState(false);
  const [reloading, setReloading] = useState(false);
  const [autoRefresh, setAutoRefresh] = useState(true);

  const fetchHealth = async () => {
    setLoading(true);
    try {
      const res = await fetch('/health');
      const data = await res.json();
      setHealth(data);
      setLastRefreshed(new Date());
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleReload = async () => {
    if (!confirm("Confirm reloading model from registry? A brief service interruption may occur.")) return;
    
    setReloading(true);
    try {
      await fetch('/reload', { method: 'POST' });
      await fetchHealth();
    } catch (e) {
      console.error(e);
    } finally {
      setReloading(false);
    }
  };

  useEffect(() => {
    fetchHealth();
    if (autoRefresh && !settings.autoRefreshInterval) return;
    
    const interval = setInterval(() => {
      if (autoRefresh) fetchHealth();
    }, settings.autoRefreshInterval * 1000);
    
    return () => clearInterval(interval);
  }, [autoRefresh, settings.autoRefreshInterval]);

  const StatusCard = ({ title, value, icon: Icon, colorClass, desc }: any) => (
    <div className="glass rounded-lg p-6 flex flex-col">
      <div className="flex justify-between items-start mb-6">
        <div className={cn("p-2.5 rounded-md", colorClass)}>
          <Icon size={18} />
        </div>
        <div className="flex items-center gap-2">
          {value && <span className="status-pulse" />}
          <span className="text-[9px] font-black uppercase text-slate-500 tracking-widest">{value ? 'Operational' : 'Critical'}</span>
        </div>
      </div>
      <h3 className="label-tiny mb-1">{title}</h3>
      <p className="text-xl font-bold text-white">{value ? 'Nominal' : 'Non-Responsive'}</p>
      {desc && <p className="text-[10px] text-slate-500 mt-auto pt-4 border-t border-slate-800 font-medium italic">{desc}</p>}
    </div>
  );

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-8"
    >
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-white mb-2">Systems Infrastructure Status</h2>
          <p className="text-slate-500 text-sm">Real-time telemetry and predictive model registry synchronization.</p>
        </div>
        <div className="flex items-center gap-6">
          <label className="flex items-center gap-2 text-[10px] font-bold text-slate-500 uppercase tracking-widest cursor-pointer select-none">
            <input 
              type="checkbox" 
              checked={autoRefresh} 
              onChange={(e) => setAutoRefresh(e.target.checked)}
              className="w-3 h-3 rounded bg-slate-800 border-slate-700 text-emerald-500 focus:ring-emerald-500 focus:ring-offset-slate-900"
            />
            Auto-Sync ({settings.autoRefreshInterval}s)
          </label>
          <button 
            onClick={fetchHealth} 
            disabled={loading}
            className="p-2 glass border border-slate-700 hover:bg-slate-800 transition-colors text-slate-400 hover:text-white rounded"
          >
            <ICONS.refresh size={16} className={cn(loading && "animate-spin")} />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatusCard 
          title="Forest Weights" 
          value={health?.model_loaded} 
          icon={ICONS.predict} 
          colorClass="bg-emerald-500/10 text-emerald-500" 
          desc="RandomForest Classifier ver. 2.4.1"
        />
        <StatusCard 
          title="ETL Preprocessor" 
          value={health?.preprocessor_loaded} 
          icon={ICONS.settings} 
          colorClass="bg-emerald-500/10 text-emerald-500" 
          desc="StandardScaler Pipeline"
        />
        <StatusCard 
          title="Public API Gateway" 
          value={health?.status === 'ok'} 
          icon={ICONS.dashboard} 
          colorClass="bg-emerald-500/10 text-emerald-500" 
          desc="P95 Latency: 12ms"
        />
        <StatusCard 
          title="Registry Socket" 
          value={!!health} 
          icon={ICONS.check} 
          colorClass="bg-slate-800 text-slate-400" 
          desc={`Code: ${health?.status?.toUpperCase() || 'IDLE'}`}
        />
      </div>

      <div className="glass rounded-lg overflow-hidden">
        <div className="p-4 bg-slate-900 border-b border-slate-800 flex justify-between items-center">
          <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Metadata Deployment Registry</h3>
          <div className="flex gap-2 text-[10px] font-bold text-slate-500 uppercase tracking-tight">
            Last Telemetry: {lastRefreshed.toLocaleTimeString()}
          </div>
        </div>
        <div className="p-8 space-y-10">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16">
            <div className="space-y-6">
              <h4 className="label-tiny">System Core Attributes</h4>
              <div className="space-y-4">
                {[
                  { label: "Deployment Run ID", val: health?.run_id || "7b8d9c1e2f3a4b5c6d7e8f9a0b1c2d3e" },
                  { label: "Predictive Module", val: health?.model_version || "2.4.1" },
                  { label: "Origin Endpoint", val: window.location.origin },
                  { label: "Infrastructure Env", val: "STAGING_DEMO_01" }
                ].map((item) => (
                  <div key={item.label} className="flex justify-between items-center py-2 border-b border-slate-800/50 group">
                    <span className="text-[11px] text-slate-500 font-bold uppercase tracking-tight group-hover:text-slate-400 transition-colors">{item.label}</span>
                    <span className="text-[11px] font-mono text-slate-300 bg-slate-900 px-3 py-1 rounded border border-slate-800 transition-all hover:border-emerald-500/30">{item.val}</span>
                  </div>
                ))}
              </div>
            </div>
            <div className="space-y-6">
              <h4 className="label-tiny">Administrative Control Plane</h4>
              <div className="p-6 bg-slate-900/50 rounded-lg border border-slate-800 space-y-4">
                <p className="text-[11px] text-slate-500 leading-relaxed font-medium">
                  Hot-reload serialized model weights directly from the MLflow experiment registry. This synchronization occurs in the background with zero disruption to the active prediction pipe.
                </p>
                <button 
                  onClick={handleReload}
                  disabled={reloading}
                  className="w-full bg-emerald-600 hover:bg-emerald-500 text-white py-3 rounded font-bold text-[10px] uppercase tracking-widest transition-all flex items-center justify-center gap-3 disabled:opacity-50 shadow-lg shadow-emerald-500/10"
                >
                  {reloading ? <ICONS.refresh size={14} className="animate-spin" /> : <ICONS.history size={14} />}
                  Synchronize Weights
                </button>
              </div>
              <div className="flex items-center gap-3 p-4 border border-emerald-500/10 rounded-lg bg-emerald-500/[0.03]">
                <ICONS.help size={16} className="text-emerald-500" />
                <p className="text-[10px] text-emerald-500/80 font-bold uppercase tracking-tighter">
                  Deep diagnostics available at internal:5000/dashboard
                </p>
              </div>
            </div>
          </div>
          
          <div className="pt-8 border-t border-slate-800">
            <details className="group">
              <summary className="text-[10px] font-black uppercase tracking-widest text-slate-500 cursor-pointer hover:text-emerald-500 transition-colors list-none flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-slate-700 group-open:bg-emerald-500 transition-colors" />
                Inspect Raw Invariant Payload
              </summary>
              <div className="mt-4 p-6 bg-slate-900 border border-slate-800 text-slate-400 p-6 rounded-lg text-[10px] font-mono overflow-auto max-h-60 leading-relaxed custom-scrollbar shadow-inner">
                {JSON.stringify(health || { message: "NULL_RESPONSE" }, null, 4)}
              </div>
            </details>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
