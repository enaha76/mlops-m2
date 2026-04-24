import React, { useState, useRef } from 'react';
import { motion } from 'motion/react';
import Papa from 'papaparse';
import { ICONS } from '../constants';
import { PredictRequest, PredictResponse } from '../types';
import { cn, formatPercent } from '../lib/utils';

interface BatchRow extends PredictRequest {
  id: string;
  prediction?: 'yes' | 'no';
  probability_yes?: number;
  status: 'pending' | 'loading' | 'success' | 'error';
  error?: string;
}

export default function Batch() {
  const [data, setData] = useState<BatchRow[]>([]);
  const [progress, setProgress] = useState(0);
  const [isProcessing, setIsProcessing] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    Papa.parse(file, {
      header: true,
      dynamicTyping: true,
      skipEmptyLines: true,
      complete: (results) => {
        const rows = results.data.map((row: any, idx) => ({
          ...row,
          id: `row-${idx}`,
          status: 'pending' as const,
        })) as BatchRow[];
        setData(rows);
        setProgress(0);
      }
    });
  };

  const runBatch = async () => {
    if (isProcessing) return;
    setIsProcessing(true);
    
    const CONCURRENCY = 3;
    const rows = [...data];
    let completed = 0;

    // Sequential processing in chunks
    for (let i = 0; i < rows.length; i++) {
      rows[i].status = 'loading';
      setData([...rows]);

      try {
        const res = await fetch('/predict', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(rows[i])
        });
        const result: PredictResponse = await res.json();
        
        rows[i] = {
          ...rows[i],
          ...result,
          status: 'success'
        };
      } catch (err) {
        rows[i].status = 'error';
        rows[i].error = 'API Error';
      }

      completed++;
      setProgress(Math.round((completed / rows.length) * 100));
      setData([...rows]);
    }

    setIsProcessing(false);
  };

  const exportResults = () => {
    const csvData = data.map(({ id, status, ...rest }) => rest);
    const csv = Papa.unparse(csvData);
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `batch_scores_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      className="space-y-8"
    >
      <div className="glass rounded-lg p-8">
        <div className="flex flex-col md:flex-row justify-between items-center gap-6">
          <div className="max-w-xl text-center md:text-left">
            <h2 className="text-2xl font-bold tracking-tight text-white mb-2">High-Volume Batch Engine</h2>
            <p className="text-slate-500 text-sm">
              Process multi-client interaction models for quarterly campaign prioritization. 
              Load CSV datasets to generate automated subscription probability mappings.
            </p>
          </div>
          <div className="flex gap-3">
            <input 
              type="file" 
              ref={fileInputRef} 
              onChange={handleFileUpload} 
              accept=".csv" 
              className="hidden" 
            />
            <button 
              onClick={() => fileInputRef.current?.click()}
              className="bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 px-6 py-3 rounded font-bold transition-all flex items-center gap-2 text-[10px] uppercase tracking-widest"
            >
              <ICONS.upload size={14} /> Import Data
            </button>
            {data.length > 0 && (
              <button 
                onClick={runBatch}
                disabled={isProcessing}
                className="bg-emerald-600 hover:bg-emerald-500 text-white px-8 py-3 rounded font-bold transition-all shadow-lg shadow-emerald-500/20 flex items-center gap-2 disabled:opacity-50 text-[10px] uppercase tracking-widest"
              >
                {isProcessing ? <ICONS.refresh size={14} className="animate-spin" /> : <ICONS.predict size={14} />}
                {isProcessing ? "Processing" : "Begin Inference"}
              </button>
            )}
          </div>
        </div>

        {isProcessing && (
          <div className="mt-8 space-y-2">
            <div className="flex justify-between text-[10px] font-bold uppercase tracking-widest text-slate-500">
              <span className="flex items-center gap-2">
                <span className="status-pulse"></span>
                Inference Progress
              </span>
              <span className="text-emerald-500 font-mono">{progress}%</span>
            </div>
            <div className="h-1 bg-slate-800 rounded-full overflow-hidden">
              <motion.div 
                initial={{ width: 0 }}
                animate={{ width: `${progress}%` }}
                className="h-full bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.3)]"
              />
            </div>
          </div>
        )}
      </div>

      {data.length > 0 ? (
        <div className="glass rounded-lg overflow-hidden border border-slate-800">
          <div className="p-4 bg-slate-900 border-b border-slate-800 flex justify-between items-center">
            <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-3">
              <span className="text-emerald-500">[{data.length}]</span> 
              Ingested Registry
            </h3>
            <div className="flex gap-2">
              <button onClick={exportResults} className="p-2 text-slate-500 hover:text-emerald-500 transition-colors" title="Export Results">
                <ICONS.download size={16} />
              </button>
              <button onClick={() => setData([])} className="p-2 text-slate-500 hover:text-red-400 transition-colors" title="Clear Buffer">
                <ICONS.trash size={16} />
              </button>
            </div>
          </div>
          <div className="overflow-x-auto max-h-[500px]">
            <table className="w-full text-left text-[11px] border-collapse">
              <thead className="sticky top-0 bg-slate-900 text-slate-500 font-bold uppercase tracking-tighter z-10 border-b border-slate-800">
                <tr>
                  <th className="px-6 py-4">Client ID</th>
                  <th className="px-6 py-4">Age</th>
                  <th className="px-6 py-4">Occupation</th>
                  <th className="px-6 py-4">Balance</th>
                  <th className="px-6 py-4">Outcome</th>
                  <th className="px-6 py-4">Probability</th>
                  <th className="px-6 py-4">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/50">
                {data.slice(0, 100).map((row) => (
                  <tr key={row.id} className="hover:bg-slate-800/30 transition-colors">
                    <td className="px-6 py-3 font-mono text-slate-500">#{row.id.split('-')[1]}</td>
                    <td className="px-6 py-3 text-slate-300 font-medium">{row.age}y</td>
                    <td className="px-6 py-3 capitalize text-slate-400">{row.job}</td>
                    <td className="px-6 py-3 text-slate-300 font-mono italic">€{row.balance?.toLocaleString()}</td>
                    <td className="px-6 py-3">
                      {row.prediction && (
                        <span className={cn(
                          "px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-widest",
                          row.prediction === 'yes' ? "bg-emerald-500/10 text-emerald-500 border border-emerald-500/20" : "bg-slate-800 text-slate-500 border border-slate-700"
                        )}>
                          {row.prediction}
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-3 font-bold text-white whitespace-nowrap">
                      {row.probability_yes !== undefined ? formatPercent(row.probability_yes) : '—'}
                    </td>
                    <td className="px-6 py-3">
                      {row.status === 'loading' && <ICONS.refresh size={14} className="animate-spin text-emerald-500" />}
                      {row.status === 'success' && <ICONS.check size={14} className="text-emerald-500" />}
                      {row.status === 'error' && <ICONS.error size={14} className="text-red-500" />}
                      {row.status === 'pending' && <span className="w-1 h-1 rounded-full bg-slate-700 block" />}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {data.length > 100 && (
              <div className="p-3 bg-slate-900 text-center text-[10px] text-slate-500 font-bold uppercase tracking-widest border-t border-slate-800">
                Buffer Truncated — Showing first 100 of {data.length} records.
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="glass rounded-lg py-20 text-center">
          <div className="w-16 h-16 bg-slate-800 rounded flex items-center justify-center mx-auto mb-6 text-slate-500 border border-slate-700 shadow-inner">
            <ICONS.upload size={32} />
          </div>
          <h3 className="text-sm font-bold text-white uppercase tracking-widest">Awaiting Dataset Ingestion</h3>
          <p className="text-slate-500 text-xs max-w-sm mx-auto mt-2 leading-relaxed">
            Drag your campaign CSV file here to start parallel probability processing. Ensure valid socioeconomic headers for automatic feature mapping.
          </p>
        </div>
      )}

      {/* Warnings */}
      <div className="flex gap-4 p-5 glass border-amber-900/10 rounded-lg text-slate-400 text-[11px] leading-relaxed">
        <ICONS.error size={18} className="flex-shrink-0 text-amber-600/50" />
        <div className="space-y-1">
          <p className="font-bold uppercase tracking-widest text-slate-500">Operational Compliance</p>
          <p>Processing batch volumes exceeding 2,000 records may extend inference latency thresholds. Ensure high-speed connection for real-time model interaction. For enterprise-scale loads, utilize the parallel pipeline API.</p>
        </div>
      </div>
    </motion.div>
  );
}
