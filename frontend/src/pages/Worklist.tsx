import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { ICONS } from '../constants';
import { WorklistEntry } from '../types';
import { cn, formatPercent, formatDate } from '../lib/utils';
import { useSettings } from '../hooks/useSettings';
import Papa from 'papaparse';

export default function Worklist() {
  const { settings } = useSettings();
  const [worklist, setWorklist] = useState<WorklistEntry[]>(() => {
    const saved = localStorage.getItem('bank_predictor_worklist');
    return saved ? JSON.parse(saved) : [];
  });
  const [threshold, setThreshold] = useState(settings.threshold * 100);

  useEffect(() => {
    localStorage.setItem('bank_predictor_worklist', JSON.stringify(worklist));
  }, [worklist]);

  const addFromLast = () => {
    const last = sessionStorage.getItem('last_prediction');
    if (last) {
      const entry = JSON.parse(last) as WorklistEntry;
      if (!worklist.find(e => e.clientId === entry.clientId)) {
        setWorklist([entry, ...worklist]);
      }
    }
  };

  const removeEntry = (id: string) => {
    setWorklist(worklist.filter(e => e.clientId !== id));
  };

  const clearAll = () => {
    if (confirm("Clear all clients from worklist?")) {
      setWorklist([]);
    }
  };

  const sortedWorklist = [...worklist].sort((a, b) => b.probability_yes - a.probability_yes);

  const exportCSV = () => {
    const csv = Papa.unparse(worklist);
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `campaign_worklist_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
  };

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.98 }}
      animate={{ opacity: 1, scale: 1 }}
      className="space-y-8"
    >
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-white mb-2">Lead Prioritization Queue</h2>
          <p className="text-slate-500 text-sm">Sort and manage high-conversion targets for direct marketing outreach.</p>
        </div>
        <div className="flex gap-3">
          <button 
            onClick={addFromLast}
            className="glass hover:bg-slate-800 text-slate-300 text-[10px] uppercase font-bold tracking-widest px-4 py-2 rounded transition-all flex items-center gap-2"
          >
            <ICONS.predict size={14} /> Import Analysis
          </button>
          <button 
            onClick={exportCSV}
            className="bg-emerald-600 hover:bg-emerald-500 text-white px-6 py-2 rounded font-bold text-[10px] uppercase tracking-widest transition-all shadow-lg shadow-emerald-500/20 flex items-center gap-2"
          >
            <ICONS.download size={14} /> Export Dataset
          </button>
        </div>
      </div>

      <div className="glass rounded-lg p-8">
        <div className="flex flex-col md:flex-row justify-between items-center gap-8">
          <div className="flex-grow w-full max-w-xl">
            <div className="flex justify-between items-end mb-4">
              <div>
                <h4 className="label-tiny">Inference Threshold</h4>
                <p className="text-3xl font-black text-emerald-400">{threshold}%</p>
              </div>
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-tighter">Confidence Cut-off</span>
            </div>
            <input 
              type="range" 
              min="0" 
              max="100" 
              value={threshold} 
              onChange={(e) => setThreshold(parseInt(e.target.value))}
              className="w-full h-1 bg-slate-800 rounded-full appearance-none cursor-pointer accent-emerald-500"
            />
          </div>
          <div className="flex gap-12 text-center md:text-right border-l border-slate-800 px-8">
            <div>
              <p className="label-tiny">Total Backlog</p>
              <p className="text-2xl font-bold text-white">{worklist.length}</p>
            </div>
            <div>
              <p className="label-tiny text-emerald-500">Tier 1 Target</p>
              <p className="text-2xl font-bold text-emerald-500">
                {worklist.filter(w => w.probability_yes >= threshold / 100).length}
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="glass rounded-lg overflow-hidden border border-slate-800">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-[11px] border-collapse">
            <thead className="bg-slate-900 text-slate-500 font-bold uppercase tracking-tighter border-b border-bold border-slate-800">
              <tr>
                <th className="px-6 py-4">Client Composite</th>
                <th className="px-6 py-4">Registry Date</th>
                <th className="px-6 py-4">Confidence Spectrum</th>
                <th className="px-6 py-4 text-center">Protocol</th>
                <th className="px-6 py-4"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/50">
              {sortedWorklist.map((entry) => {
                const isPriority = entry.probability_yes >= threshold / 100;
                return (
                  <tr key={entry.clientId} className={cn(
                    "hover:bg-slate-800/30 transition-colors",
                    isPriority ? "bg-emerald-500/[0.03]" : ""
                  )}>
                    <td className="px-6 py-4">
                      <div>
                        <p className="font-bold text-slate-200 uppercase tracking-tight">{entry.clientId}</p>
                        <p className="text-[10px] text-slate-500 mt-0.5">{entry.age}y • {entry.job}</p>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-slate-500 font-mono italic">
                      {formatDate(new Date(entry.addedAt))}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-4">
                        <div className="w-20 h-1 bg-slate-800 rounded-full overflow-hidden">
                          <div 
                            className={cn("h-full transition-all duration-1000", isPriority ? "bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.4)]" : "bg-slate-600")}
                            style={{ width: `${entry.probability_yes * 100}%` }}
                          />
                        </div>
                        <span className={cn("font-bold font-mono", isPriority ? "text-white" : "text-slate-500")}>{formatPercent(entry.probability_yes)}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <span className={cn(
                        "px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-widest inline-flex items-center gap-1.5",
                        isPriority 
                          ? "bg-emerald-500/10 text-emerald-500 border border-emerald-500/20" 
                          : "bg-slate-800 text-slate-500 border border-slate-700"
                      )}>
                        {isPriority ? "Priority Call" : "Cold List"}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button onClick={() => removeEntry(entry.clientId)} className="p-2 text-slate-600 hover:text-red-500 transition-colors">
                        <ICONS.trash size={14} />
                      </button>
                    </td>
                  </tr>
                );
              })}
              {worklist.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-6 py-20 text-center">
                    <div className="max-w-xs mx-auto">
                      <div className="w-12 h-12 bg-slate-800 border border-slate-700 rounded flex items-center justify-center mx-auto mb-4 text-slate-600">
                        <ICONS.worklist size={24} />
                      </div>
                      <h3 className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Registry Vacuum</h3>
                      <p className="text-[10px] text-slate-600 mt-2 font-medium">Generate inferences via predictor modules to populate actionable campaign lists.</p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        {worklist.length > 0 && (
          <div className="p-4 bg-slate-900 border-t border-slate-800 flex justify-end">
            <button onClick={clearAll} className="text-[10px] font-bold text-slate-600 hover:text-red-500 transition-colors flex items-center gap-2 uppercase tracking-widest">
              <ICONS.trash size={12} /> Purge Queue
            </button>
          </div>
        )}
      </div>
    </motion.div>
  );
}
