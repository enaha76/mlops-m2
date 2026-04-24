import React, { useState } from 'react';
import { motion } from 'motion/react';
import { ICONS, GLOSSARY } from '../constants';
import { cn } from '../lib/utils';

export default function Help() {
  const [search, setSearch] = useState("");

  const filteredGlossary = GLOSSARY.filter(item => 
    item.title.toLowerCase().includes(search.toLowerCase()) || 
    item.description.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.98 }}
      animate={{ opacity: 1, scale: 1 }}
      className="space-y-12"
    >
      <div className="text-center space-y-4">
        <h2 className="text-3xl font-bold tracking-tight text-white mb-2">Systems Intelligence Glossary</h2>
        <p className="text-slate-500 max-w-xl mx-auto text-sm">
          Technical definitions and socioeconomic domain logic for campaign interaction parameters.
        </p>
      </div>

      <div className="relative max-w-xl mx-auto">
        <ICONS.search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" size={16} />
        <input 
          type="text" 
          placeholder="Search Registry Protocols..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full glass h-12 pl-12 pr-4 rounded-md shadow-inner text-xs uppercase tracking-widest font-black text-white focus:border-emerald-500/50 outline-none transition-all placeholder:text-slate-700"
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {filteredGlossary.map((item) => (
          <motion.div 
            key={item.id} 
            layout
            className="glass rounded-lg flex flex-col overflow-hidden transition-all hover:border-slate-700"
          >
            <div className="p-6 flex-1">
              <div className="flex justify-between items-start mb-6">
                <h3 className="text-sm font-bold text-white uppercase tracking-tight">{item.title}</h3>
                <span className="bg-slate-900 border border-slate-800 px-2.5 py-1 rounded text-[9px] font-black text-slate-500 font-mono">
                  {item.id.toUpperCase()}
                </span>
              </div>
              <p className="text-[11px] text-slate-500 leading-relaxed font-medium">
                {item.description}
              </p>
            </div>
            
            <div className="space-y-4 bg-slate-900/50 p-6 border-t border-slate-800">
              <div className="flex justify-between items-center">
                <span className="label-tiny">Example Data</span>
                <span className="text-[10px] font-mono text-emerald-400 font-bold">{item.example}</span>
              </div>
              <div className="space-y-1">
                <span className="label-tiny">Validation Set</span>
                <p className="text-[10px] text-slate-500 leading-tight font-medium">
                  {item.values}
                </p>
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      {filteredGlossary.length === 0 && (
        <div className="py-20 text-center text-[10px] font-bold text-slate-600 uppercase tracking-widest italic">
          Zero records matching query string.
        </div>
      )}

      <div className="glass rounded-lg p-10 border-l-4 border-l-emerald-600">
        <h3 className="text-xl font-bold mb-8 text-white">Domain Intelligence FAQ</h3>
        <div className="space-y-10">
          {[
            { q: "Define: Term Deposit Subscription", a: "A banking vehicle where assets are retained for fixed maturation. The predictor identifies conversion likelihood for prioritized outbound marketing." },
            { q: "Inference Logic: Probability vs Determinitism", a: "Model outputs represent statistical density relative to historical socioeconomic interaction clusters, not absolute future certainty." },
            { q: "Numerical Edge Case: 'pdays = -1'", a: "A sentinel value indicating the 'Null Hypothesis' — client has no recorded interaction history in the previous campaign cycle." }
          ].map((faq, i) => (
            <div key={i} className="space-y-3">
              <h4 className="text-[11px] font-black text-emerald-500 uppercase tracking-widest flex items-center gap-2">
                <span className="w-1 h-3 bg-emerald-500 rounded-full" />
                {faq.q}
              </h4>
              <p className="text-[11px] text-slate-400 leading-relaxed font-medium border-l border-slate-800 pl-4">{faq.a}</p>
            </div>
          ))}
        </div>
      </div>
    </motion.div>
  );
}
