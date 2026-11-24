import React, { useState } from 'react';
import { api, UserInfo } from '../api';
import { Shield, Lock, Mail, ArrowRight, UserCheck } from 'lucide-react';

interface LoginModalProps {
  onSuccess: (user: UserInfo) => void;
}

export const LoginModal: React.FC<LoginModalProps> = ({ onSuccess }) => {
  const [email, setEmail] = useState('sid@acme.com');
  const [password, setPassword] = useState('sid123');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const res = await api.post('/api/auth/login', { email, password });
      const { access_token, user_id, name, email: userEmail, role, org_id, org_name } = res.data;
      localStorage.setItem('smartcorp_token', access_token);
      onSuccess({ id: user_id, name, email: userEmail, role, org_id, org_name });
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Invalid email or password');
    } finally {
      setLoading(false);
    }
  };

  const handleSelectDemo = async (eMail: string, pass: string) => {
    setEmail(eMail);
    setPassword(pass);
    setLoading(true);
    setError(null);
    try {
      const res = await api.post('/api/auth/login', { email: eMail, password: pass });
      const { access_token, user_id, name, email: userEmail, role, org_id, org_name } = res.data;
      localStorage.setItem('smartcorp_token', access_token);
      onSuccess({ id: user_id, name, email: userEmail, role, org_id, org_name });
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Invalid email or password');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-md flex items-center justify-center p-4 z-50">
      <div className="bg-white/85 backdrop-blur-2xl border border-white/80 rounded-3xl max-w-md w-full p-8 shadow-2xl space-y-6 animate-in fade-in">
        <div className="text-center">
          <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-indigo-600 via-indigo-500 to-violet-500 flex items-center justify-center text-white font-bold text-base mx-auto shadow-md shadow-indigo-500/20 ring-1 ring-white/50 mb-3">
            SC
          </div>
          <h2 className="text-xl font-bold text-slate-900 tracking-tight">SmartCorp AI Platform</h2>
          <p className="text-xs text-slate-500 mt-1">
            Enterprise Multi-Tenant Smart Workspace & Organizational Intelligence
          </p>
        </div>

        {error && (
          <div className="bg-rose-50/80 border border-rose-200/70 text-rose-700 text-xs rounded-xl p-3 text-center font-medium backdrop-blur-xs shadow-2xs">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-1.5">
              Email Address
            </label>
            <div className="relative">
              <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" strokeWidth={1.5} />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full glass-input rounded-xl pl-9 pr-3 py-2 text-xs text-slate-900 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-1.5">
              Password
            </label>
            <div className="relative">
              <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" strokeWidth={1.5} />
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="w-full glass-input rounded-xl pl-9 pr-3 py-2 text-xs text-slate-900 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-500 hover:to-indigo-600 text-white rounded-xl text-xs font-semibold shadow-xs ring-1 ring-indigo-500/30 transition flex items-center justify-center gap-2 cursor-pointer"
          >
            {loading ? 'Authenticating...' : 'Sign In to Workspace'}
            <ArrowRight className="w-3.5 h-3.5" strokeWidth={1.5} />
          </button>
        </form>

        {/* Demo Roles Quick Pick */}
        <div className="pt-4 border-t border-slate-200/50">
          <div className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider text-center mb-2.5">
            Quick 1-Click Demo Login
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            <button
              type="button"
              onClick={() => handleSelectDemo('sid@acme.com', 'sid123')}
              className={`p-2.5 rounded-xl border text-left transition cursor-pointer backdrop-blur-xs ${
                email === 'sid@acme.com'
                  ? 'border-indigo-400 bg-indigo-50/70 shadow-xs'
                  : 'border-white/80 bg-white/50 hover:bg-white/80'
              }`}
            >
              <div className="text-[11px] font-semibold text-slate-800">Sid</div>
              <div className="text-[9px] text-slate-500">Admin</div>
            </button>

            <button
              type="button"
              onClick={() => handleSelectDemo('anush@acme.com', 'anush123')}
              className={`p-2.5 rounded-xl border text-left transition cursor-pointer backdrop-blur-xs ${
                email === 'anush@acme.com'
                  ? 'border-indigo-400 bg-indigo-50/70 shadow-xs'
                  : 'border-white/80 bg-white/50 hover:bg-white/80'
              }`}
            >
              <div className="text-[11px] font-semibold text-slate-800">Anush</div>
              <div className="text-[9px] text-slate-500">Manager</div>
            </button>

            <button
              type="button"
              onClick={() => handleSelectDemo('nick@acme.com', 'nick123')}
              className={`p-2.5 rounded-xl border text-left transition cursor-pointer backdrop-blur-xs ${
                email === 'nick@acme.com'
                  ? 'border-indigo-400 bg-indigo-50/70 shadow-xs'
                  : 'border-white/80 bg-white/50 hover:bg-white/80'
              }`}
            >
              <div className="text-[11px] font-semibold text-slate-800">Nick</div>
              <div className="text-[9px] text-slate-500">HR</div>
            </button>

            <button
              type="button"
              onClick={() => handleSelectDemo('rahul@acme.com', 'rahul123')}
              className={`p-2.5 rounded-xl border text-left transition cursor-pointer backdrop-blur-xs ${
                email === 'rahul@acme.com'
                  ? 'border-indigo-400 bg-indigo-50/70 shadow-xs'
                  : 'border-white/80 bg-white/50 hover:bg-white/80'
              }`}
            >
              <div className="text-[11px] font-semibold text-slate-800">Rahul</div>
              <div className="text-[9px] text-slate-500">Employee</div>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
