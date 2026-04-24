import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ICONS, JOB_OPTIONS, MARITAL_OPTIONS, EDUCATION_OPTIONS, YES_NO_OPTIONS, CONTACT_OPTIONS, MONTH_OPTIONS, POUTCOME_OPTIONS } from '../constants';
import { PredictRequest, PredictResponse } from '../types';
import { cn, formatPercent } from '../lib/utils';

const INITIAL_FORM: PredictRequest = {
  age: 35,
  job: "management",
  marital: "married",
  education: "tertiary",
  default: "no",
  housing: "no",
  loan: "no",
  contact: "cellular",
  month: "may",
  poutcome: "unknown",
  balance: 2000,
  day: 15,
  duration: 180,
  campaign: 1,
  pdays: -1,
  previous: 0
};

export default function Predict() {
  const [form, setForm] = useState<PredictRequest>(INITIAL_FORM);
  const [result, setResult] = useState<PredictResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [section, setSection] = useState<'profile' | 'campaign'>('profile');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch('/predict', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form)
      });
      const data = await res.json();
      setResult(data);
      
      // Save for worklist
      const worklistEntry = {
        ...data,
        clientId: `Client-${Math.floor(Math.random() * 10000)}`,
        age: form.age,
        job: form.job,
        addedAt: new Date().toISOString()
      };
      sessionStorage.setItem('last_prediction', JSON.stringify(worklistEntry));
      
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    setForm(prev => ({
      ...prev,
      [name]: type === 'number' ? parseFloat(value) : value
    }));
  };

  const InputField = ({ label, name, icon: Icon, type = "text", ...props }: any) => (
    <div className="space-y-1">
      <label className="label-tiny">
        {label}
      </label>
      <input
        type={type}
        name={name}
        className="input-dark"
        {...props}
      />
    </div>
  );

  const SelectField = ({ label, name, icon: Icon, options, ...props }: any) => (
    <div className="space-y-1">
      <label className="label-tiny">
        {label}
      </label>
      <select
        name={name}
        className="input-dark appearance-none bg-[url('data:image/svg+xml;charset=utf-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20fill%3D%22none%22%20viewBox%3D%220%200%2020%2020%22%3E%3Cpath%20stroke%3D%22%236b7280%22%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%20stroke-width%3D%221.5%22%20d%3D%22m6%208%204%204%204-4%22%2F%3E%3C%2Fsvg%3E')] bg-[position:right_0.5rem_center] bg-[size:1.5em_1.5em] bg-no-repeat pr-10"
        {...props}
      >
        {options.map((opt: string) => (
          <option key={opt} value={opt} className="bg-slate-900">{opt}</option>
        ))}
      </select>
    </div>
  );

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className="space-y-8"
    >
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-white mb-2">Target Audience Analysis</h2>
          <p className="text-slate-500 text-sm">Configure client attributes to generate subscription likelihood.</p>
        </div>
        <div className="flex bg-slate-900 p-1 rounded-lg border border-slate-800">
          <button 
            onClick={() => setSection('profile')}
            className={cn("px-4 py-1.5 rounded-md text-[10px] uppercase font-bold tracking-widest transition-all", section === 'profile' ? "bg-slate-800 text-emerald-400 shadow-sm" : "text-slate-500")}
          >
            Profile
          </button>
          <button 
            onClick={() => setSection('campaign')}
            className={cn("px-4 py-1.5 rounded-md text-[10px] uppercase font-bold tracking-widest transition-all", section === 'campaign' ? "bg-slate-800 text-emerald-400 shadow-sm" : "text-slate-500")}
          >
            Campaign
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        <div className="lg:col-span-3">
          <form onSubmit={handleSubmit} className="glass rounded-lg px-6 py-6 space-y-6">
            <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest border-b border-slate-800 pb-3">{section === 'profile' ? 'Client Profile' : 'Campaign Experience'}</h3>
            <AnimatePresence mode="wait">
              {section === 'profile' ? (
                <motion.div 
                  key="profile"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4"
                >
                  <InputField label="Age" name="age" type="number" icon={ICONS.age} value={form.age} onChange={handleInputChange} min="18" max="100" />
                  <SelectField label="Job" name="job" icon={ICONS.job} options={JOB_OPTIONS} value={form.job} onChange={handleInputChange} />
                  <SelectField label="Marital" name="marital" icon={ICONS.marital} options={MARITAL_OPTIONS} value={form.marital} onChange={handleInputChange} />
                  <SelectField label="Education" name="education" icon={ICONS.education} options={EDUCATION_OPTIONS} value={form.education} onChange={handleInputChange} />
                  <InputField label="Yearly Balance (€)" name="balance" type="number" icon={ICONS.balance} value={form.balance} onChange={handleInputChange} />
                  <SelectField label="Housing Loan" name="housing" icon={ICONS.housing} options={YES_NO_OPTIONS} value={form.housing} onChange={handleInputChange} />
                  <SelectField label="Personal Loan" name="loan" icon={ICONS.loan} options={YES_NO_OPTIONS} value={form.loan} onChange={handleInputChange} />
                  <SelectField label="Credit Default" name="default" icon={ICONS.default} options={YES_NO_OPTIONS} value={form.default} onChange={handleInputChange} />
                </motion.div>
              ) : (
                <motion.div 
                  key="campaign"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4"
                >
                  <SelectField label="Contact Method" name="contact" icon={ICONS.contact} options={CONTACT_OPTIONS} value={form.contact} onChange={handleInputChange} />
                  <SelectField label="Contact Month" name="month" icon={ICONS.month} options={MONTH_OPTIONS} value={form.month} onChange={handleInputChange} />
                  <InputField label="Contact Day" name="day" type="number" icon={ICONS.day} value={form.day} onChange={handleInputChange} min="1" max="31" />
                  <InputField label="Duration (sec)" name="duration" type="number" icon={ICONS.duration} value={form.duration} onChange={handleInputChange} min="0" />
                  <InputField label="Current Campaign" name="campaign" type="number" icon={ICONS.campaign} value={form.campaign} onChange={handleInputChange} min="1" />
                  <InputField label="Days Since Prev" name="pdays" type="number" icon={ICONS.pdays} value={form.pdays} onChange={handleInputChange} min="-1" />
                  <InputField label="Previous Contacts" name="previous" type="number" icon={ICONS.poutcome} value={form.previous} onChange={handleInputChange} min="0" />
                  <SelectField label="Previous Outcome" name="poutcome" icon={ICONS.poutcome} options={POUTCOME_OPTIONS} value={form.poutcome} onChange={handleInputChange} />
                </motion.div>
              )}
            </AnimatePresence>

            <div className="pt-6 border-t border-slate-800 flex justify-between items-center">
              <button 
                type="button" 
                onClick={() => setForm(INITIAL_FORM)}
                className="text-slate-500 hover:text-red-400 text-[10px] uppercase font-bold tracking-widest transition-colors"
                disabled={loading}
              >
                Reset Data
              </button>
              <button 
                type="submit" 
                className={cn(
                   "bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-3 px-8 rounded-md transition-all shadow-lg shadow-emerald-500/20 uppercase tracking-widest text-xs flex items-center gap-2",
                  loading && "opacity-70 cursor-not-allowed"
                )}
                disabled={loading}
              >
                {loading ? <ICONS.refresh size={16} className="animate-spin" /> : <ICONS.predict size={16} />}
                {loading ? "Processing..." : "Run Prediction"}
              </button>
            </div>
          </form>
        </div>

        <div className="lg:col-span-2">
          <AnimatePresence mode="wait">
            {result ? (
              <motion.div
                key="result"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="glass rounded-lg flex flex-col h-full overflow-hidden"
              >
                <div className="p-8 flex-1 flex flex-col items-center justify-center text-center">
                  <div className={cn(
                    "w-24 h-24 rounded-full border-4 flex items-center justify-center mb-6 shadow-xl",
                    result.prediction === 'yes' ? 'border-emerald-500 shadow-emerald-500/20' : 'border-amber-500 shadow-amber-500/20'
                  )}>
                    <span className="text-4xl font-black text-white uppercase">{result.prediction}</span>
                  </div>
                  
                  <div className="text-4xl font-bold mb-1 text-white">{formatPercent(result.probability_yes)}</div>
                  <div className="text-[10px] text-slate-400 uppercase tracking-widest font-bold">
                    {result.prediction === 'yes' ? 'Likely to Subscribe' : 'Unlikely to Subscribe'}
                  </div>
                  
                  <div className="mt-8 w-full space-y-2 text-[11px]">
                    <div className="flex justify-between py-2 border-b border-slate-800">
                      <span className="text-slate-500 font-bold uppercase tracking-tighter">Model Version</span>
                      <span className="text-slate-200 font-mono">{result.model_version}</span>
                    </div>
                    <div className="flex justify-between py-2 border-b border-slate-800">
                      <span className="text-slate-500 font-bold uppercase tracking-tighter">Inference Outcome</span>
                      <span className={cn("font-bold uppercase", result.prediction === 'yes' ? 'text-emerald-400' : 'text-amber-400')}>
                        {result.prediction === 'yes' ? 'Validated' : 'Low Confidence'}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="p-4 bg-slate-900/50 flex gap-2 w-full mt-auto border-t border-slate-800">
                  <button 
                    onClick={() => navigator.clipboard.writeText(JSON.stringify({ ...form, ...result }, null, 2))}
                    className="flex-1 bg-slate-800 hover:bg-slate-700 text-slate-300 py-2.5 rounded text-[10px] uppercase font-bold tracking-widest transition-colors flex items-center justify-center gap-2"
                  >
                    <ICONS.download size={14} /> Copy JSON
                  </button>
                  <button className="flex-1 bg-slate-800 hover:bg-slate-700 text-slate-300 py-2.5 rounded text-[10px] uppercase font-bold tracking-widest transition-colors flex items-center justify-center gap-2">
                    <ICONS.worklist size={14} /> Add to list
                  </button>
                </div>
              </motion.div>
            ) : (
              <div className="glass rounded-lg h-full flex flex-col items-center justify-center p-12 text-center opacity-40">
                <div className="w-16 h-16 rounded-full border border-slate-800 flex items-center justify-center mb-4">
                  <ICONS.predict size={24} className="text-slate-400" />
                </div>
                <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest">Awaiting Analysis</h3>
              </div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </motion.div>
  );
}
