import React, { useEffect, useState } from 'react';
import { motion } from 'motion/react';
import { Link } from 'react-router-dom';
import { ICONS } from '../constants';
import { HealthResponse } from '../types';
import { cn, formatDate } from '../lib/utils';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';

const summaryData = [
  { name: 'Admin', value: 400, color: '#10b981' },
  { name: 'Technician', value: 300, color: '#059669' },
  { name: 'Services', value: 200, color: '#047857' },
  { name: 'Management', value: 500, color: '#065f46' },
  { name: 'Others', value: 150, color: '#334155' },
];

export default function Home() {
  const [health, setHealth] = useState<HealthResponse | null>(null);
  const [lastChecked, setLastChecked] = useState<Date>(new Date());
  const [loading, setLoading] = useState(true);

  const fetchHealth = async () => {
    setLoading(true);
    try {
      const res = await fetch('/health');
      const data = await res.json();
      setHealth(data);
      setLastChecked(new Date());
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHealth();
  }, []);

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      className="space-y-8"
    >
      {/* Hero */}
      <section className="glass rounded-lg p-10 relative overflow-hidden">
        <div className="relative z-10 max-w-2xl">
          <h2 className="text-4xl font-extrabold mb-4 leading-tight text-white">
            Target high-potential leads with precision.
          </h2>
          <p className="text-slate-400 text-base mb-8 max-w-lg">
            Our predictive engine analyzes historical interaction patterns and socioeconomic profiles to maximize your campaign conversion.
          </p>
          <div className="flex flex-wrap gap-4">
            <Link to="/predict" className="bg-emerald-600 hover:bg-emerald-500 text-white px-8 py-3 rounded font-bold transition-all inline-flex items-center gap-2 text-xs uppercase tracking-widest shadow-lg shadow-emerald-500/20">
              <ICONS.predict size={16} /> New Analysis
            </Link>
            <Link to="/batch" className="bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 px-8 py-3 rounded font-bold transition-all inline-flex items-center gap-2 text-xs uppercase tracking-widest">
              <ICONS.batch size={16} /> Batch Engine
            </Link>
          </div>
        </div>
        <div className="absolute top-0 right-0 h-full w-1/3 bg-emerald-500/5 skew-x-12 translate-x-1/2 pointer-events-none" />
        <div className="absolute -bottom-20 -right-20 w-80 h-80 bg-emerald-500/10 rounded-full blur-3xl opacity-50" />
      </section>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="glass p-6 rounded-lg transition-all hover:border-slate-700">
          <div className="flex justify-between items-start mb-4">
            <div className="p-2.5 bg-emerald-500/10 rounded text-emerald-500">
              <ICONS.status size={20} />
            </div>
            <button onClick={fetchHealth} className={cn("text-slate-500 hover:text-emerald-500 transition-colors", loading && "animate-spin")}>
              <ICONS.refresh size={14} />
            </button>
          </div>
          <p className="label-tiny">System Health</p>
          <p className={cn("text-2xl font-bold mt-1", health?.status === 'ok' ? "text-white" : "text-amber-500")}>
            {loading ? "..." : (health?.status === 'ok' ? 'Nominal' : 'Warning')}
          </p>
          <p className="text-[10px] text-slate-500 mt-2 font-mono uppercase tracking-tighter">
            Last Synced: {lastChecked.toLocaleTimeString()}
          </p>
        </div>

        <div className="glass p-6 rounded-lg transition-all hover:border-slate-700">
          <div className="p-2.5 bg-emerald-500/10 rounded text-emerald-500 w-fit mb-4">
            <ICONS.check size={20} />
          </div>
          <p className="label-tiny">Inference Engine</p>
          <p className="text-2xl font-bold mt-1 text-white">
            {health?.model_loaded ? "Fully Active" : "Initializing"}
          </p>
          <div className="flex gap-2 mt-2">
            <span className="px-2 py-0.5 rounded-full text-[9px] font-bold uppercase border border-emerald-500/30 text-emerald-500">Core Ready</span>
            <span className="px-2 py-0.5 rounded-full text-[9px] font-bold uppercase border border-slate-700 text-slate-500">Pipeline Validated</span>
          </div>
        </div>

        <div className="glass p-6 rounded-lg transition-all hover:border-slate-700">
          <div className="p-2.5 bg-emerald-500/10 rounded text-emerald-500 w-fit mb-4">
            <ICONS.history size={20} />
          </div>
          <p className="label-tiny">Active Registry</p>
          <p className="text-2xl font-bold mt-1 text-white">v{health?.model_version || "2.1.0"}</p>
          <p className="text-[10px] text-slate-500 mt-2 font-mono tracking-tighter truncate">
            ID: {health?.run_id || "#452d_f2"}
          </p>
        </div>
      </div>

      {/* Secondary Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Chart Section */}
        <div className="lg:col-span-2 glass p-6 rounded-lg">
          <div className="flex justify-between items-center mb-6">
            <div>
              <h3 className="text-xs font-black uppercase tracking-widest text-slate-400">Campaign Distribution</h3>
              <p className="text-[10px] text-slate-500 mt-1 uppercase font-bold tracking-tighter">By Client Occupation</p>
            </div>
            <div className="flex items-center gap-2 text-[9px] font-black uppercase text-slate-500 border border-slate-800 px-3 py-1 rounded">
              <span className="status-pulse"></span>
              Live Model Data
            </div>
          </div>
          <div className="h-[200px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={summaryData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#1e293b" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#64748b' }} />
                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#64748b' }} />
                <Tooltip 
                  cursor={{ fill: 'rgba(30, 41, 59, 0.4)' }} 
                  contentStyle={{ backgroundColor: '#0f172a', borderRadius: '4px', border: '1px solid #334155', color: '#f8fafc', fontSize: '10px' }}
                />
                <Bar dataKey="value" radius={[2, 2, 0, 0]}>
                  {summaryData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} fillOpacity={0.8} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* How it works */}
        <div className="space-y-3">
          <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-2">Process Lifecycle</h3>
          {[
            { step: 1, title: 'Attribute Mapping', desc: 'Socioeconomic and behavioral feature extraction.' },
            { step: 2, title: 'Inference Cycle', desc: 'Predictive calculation via forest-based ensembles.' },
            { step: 3, title: 'Actionable Output', desc: 'Probability scores for prioritized human outreach.' }
          ].map((item) => (
            <div key={item.step} className="flex gap-4 p-4 glass rounded-lg hover:border-slate-700 transition-colors">
              <div className="w-8 h-8 rounded bg-slate-800 border border-slate-700 flex-shrink-0 flex items-center justify-center font-black text-emerald-500 text-xs">
                0{item.step}
              </div>
              <div>
                <h4 className="font-bold text-[11px] text-slate-200 uppercase tracking-wide">{item.title}</h4>
                <p className="text-[10px] text-slate-500 mt-1 leading-relaxed font-medium">{item.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </motion.div>
  );
}
