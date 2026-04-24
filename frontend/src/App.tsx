import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Link, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { ICONS, API_BASE_URL } from './constants';
import { cn } from './lib/utils';
import { useSettings } from './hooks/useSettings';
import Home from './pages/Home';
import Predict from './pages/Predict';
import Batch from './pages/Batch';
import Worklist from './pages/Worklist';
import Status from './pages/Status';
import Help from './pages/Help';
import Settings from './pages/Settings';
import { HealthResponse } from './types';

const NavLink = ({ to, icon: Icon, children }: { to: string; icon: any; children: React.ReactNode }) => {
  const location = useLocation();
  const isActive = location.pathname === to;
  
  return (
    <Link
      to={to}
      className={cn(
        "flex items-center gap-3 px-3 py-2 rounded-md transition-all duration-200 text-xs",
        isActive 
          ? "bg-emerald-500/10 text-emerald-400 font-medium" 
          : "text-slate-400 hover:bg-slate-800 hover:text-white"
      )}
    >
      <Icon size={16} />
      <span>{children}</span>
    </Link>
  );
};

const Layout = ({ children }: { children: React.ReactNode }) => {
  const [health, setHealth] = useState<HealthResponse | null>(null);
  const location = useLocation();

  useEffect(() => {
    fetch(`${API_BASE_URL}/health`)
      .then(res => res.json())
      .then(data => setHealth(data))
      .catch(() => {});
  }, []);

  const pageTitle = {
    '/': 'Dashboard Overview',
    '/predict': 'Single Client Prediction',
    '/batch': 'Batch Scoring Engine',
    '/worklist': 'Campaign Worklist',
    '/status': 'System Status',
    '/help': 'Help & Glossary',
    '/settings': 'System Settings'
  }[location.pathname] || 'Bank Marketing Predictor';

  return (
    <div className="flex h-screen w-full overflow-hidden bg-bg-deep text-slate-100">
      {/* Sidebar Navigation */}
      <aside className="w-64 border-r border-slate-800 bg-slate-900 flex flex-col p-4">
        <div className="flex items-center gap-3 mb-8 px-2">
          <div className="w-8 h-8 bg-emerald-500 rounded flex items-center justify-center font-bold text-slate-900">
            BM
          </div>
          <h1 className="text-sm font-bold tracking-tight text-white">Predictor v1.4</h1>
        </div>

        <nav className="space-y-1 flex-1">
          <NavLink to="/" icon={ICONS.dashboard}>Dashboard</NavLink>
          <NavLink to="/predict" icon={ICONS.predict}>Single Predictor</NavLink>
          <NavLink to="/batch" icon={ICONS.batch}>Batch Scoring</NavLink>
          <NavLink to="/worklist" icon={ICONS.worklist}>Campaign Worklist</NavLink>
          <NavLink to="/status" icon={ICONS.status}>System Status</NavLink>
          <NavLink to="/help" icon={ICONS.help}>Help & Glossary</NavLink>
          <NavLink to="/settings" icon={ICONS.settings}>Settings</NavLink>
        </nav>

        <div className="mt-auto p-4 border-t border-slate-800 -mx-4">
          <div className="flex items-center justify-between text-[10px] text-slate-500 mb-3 uppercase tracking-widest font-bold">
            <span>ENV: DEMO</span>
            <span>PROD-01</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-slate-800 flex items-center justify-center text-[10px] font-bold border border-slate-700">
              MK
            </div>
            <div className="text-xs font-semibold text-slate-300">Marketing Demo</div>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col min-w-0">
        <header className="h-16 border-b border-slate-800 flex items-center justify-between px-6 bg-slate-900/50 backdrop-blur-sm">
          <div className="flex items-center gap-4">
            <h2 className="text-lg font-semibold tracking-tight text-slate-100">{pageTitle}</h2>
            <span className="px-2 py-0.5 rounded-full bg-slate-800 text-[10px] text-slate-400 uppercase tracking-widest border border-slate-700 font-bold">
              Operational
            </span>
          </div>
          <div className="flex items-center gap-6">
            <div className="text-right text-[11px]">
              <div className="text-slate-500 uppercase font-bold tracking-tighter">Model Health</div>
              <div className="flex items-center gap-1.5 justify-end">
                <span className="status-pulse"></span>
                <span className="text-slate-300 font-medium uppercase tracking-tighter">Active</span>
              </div>
            </div>
            <div className="h-8 w-px bg-slate-800"></div>
            <Link to="/settings" className="p-2 bg-slate-800 hover:bg-slate-700 rounded-md transition-colors text-slate-400 hover:text-white">
              <ICONS.settings size={16} />
            </Link>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto p-6 scrollbar-hide">
          <div className="max-w-6xl mx-auto h-full">
            {children}
          </div>
        </div>

        <footer className="h-10 border-t border-slate-800 flex items-center justify-between px-6 text-[10px] text-slate-500 bg-slate-900/80">
          <div>© 2026 Banking Systems Inc. • Global Marketing Predictor v1.4.2</div>
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-1">
              <span className={cn("w-1.5 h-1.5 rounded-full", health?.status === 'ok' ? 'bg-emerald-500' : 'bg-red-500')} />
              System: Healthy
            </span>
            <span>API: 12ms</span>
            <span className="text-emerald-500/80">MLflow: Connected</span>
          </div>
        </footer>
      </main>
    </div>
  );
};

export default function App() {
  useSettings(); // Initialize theme/settings

  return (
    <Router>
      <Layout>
        <AnimatePresence mode="wait">
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/predict" element={<Predict />} />
            <Route path="/batch" element={<Batch />} />
            <Route path="/worklist" element={<Worklist />} />
            <Route path="/status" element={<Status />} />
            <Route path="/help" element={<Help />} />
            <Route path="/settings" element={<Settings />} />
          </Routes>
        </AnimatePresence>
      </Layout>
    </Router>
  );
}
