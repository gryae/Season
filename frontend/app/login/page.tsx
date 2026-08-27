'use client';

import { useState } from 'react';
import { Ship, Lock, User, Loader2, ArrowRight } from 'lucide-react';
import { authApi } from '@/lib/api';
import { useAuthStore } from '@/store/auth.store';
import { useRouter } from 'next/navigation';

export default function LoginPage() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  
  const setAuth = useAuthStore(s => s.setAuth);
  const router = useRouter();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');
    
    try {
      const res = await authApi.login(username, password);
      setAuth(res.access_token, res.user);
      router.push('/');
    } catch(err: any) {
      setError(err.response?.data?.message || 'Invalid username or password.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0a0514] flex items-center justify-center p-4 relative overflow-hidden">
      {/* Background Orbs */}
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-purple-600/20 rounded-full blur-[120px]" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-sky-600/20 rounded-full blur-[120px]" />
      
      <div className="relative w-full max-w-md">
        <div className="flex flex-col items-center mb-8">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-purple-500 to-sky-500 flex items-center justify-center mb-4 shadow-lg shadow-purple-500/20">
            <Ship size={32} className="text-white" />
          </div>
          <h1 className="text-3xl font-bold text-white mb-2">SeaSon</h1>
          <p className="text-slate-400">Ship Management System</p>
        </div>

        <div className="bg-[#120a2e]/80 backdrop-blur-xl border border-purple-500/20 rounded-3xl p-8 shadow-[0_0_60px_rgba(139,92,246,0.15)]">
          <h2 className="text-xl font-semibold text-white mb-6">Welcome Back</h2>
          
          <form onSubmit={handleLogin} className="space-y-5">
            <div>
              <label className="block text-xs font-semibold mb-2 uppercase text-slate-400 tracking-wider">Username</label>
              <div className="relative">
                <User size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" />
                <input 
                  type="text" 
                  value={username}
                  onChange={e => setUsername(e.target.value)}
                  className="w-full bg-white/5 border border-purple-500/20 rounded-xl py-3 pl-12 pr-4 text-white focus:outline-none focus:border-purple-500 focus:bg-white/10 transition-all placeholder-slate-600"
                  placeholder="Enter your username"
                  required
                />
              </div>
            </div>
            
            <div>
              <label className="block text-xs font-semibold mb-2 uppercase text-slate-400 tracking-wider">Password</label>
              <div className="relative">
                <Lock size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" />
                <input 
                  type="password" 
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  className="w-full bg-white/5 border border-purple-500/20 rounded-xl py-3 pl-12 pr-4 text-white focus:outline-none focus:border-purple-500 focus:bg-white/10 transition-all placeholder-slate-600"
                  placeholder="••••••••"
                  required
                />
              </div>
            </div>

            {error && (
              <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm text-center">
                {error}
              </div>
            )}
            
            <button 
              type="submit" 
              disabled={isLoading || !username || !password}
              className="w-full py-3.5 rounded-xl bg-gradient-to-r from-purple-600 to-sky-500 text-white font-semibold flex items-center justify-center gap-2 hover:opacity-90 disabled:opacity-50 transition-all shadow-lg shadow-purple-500/25 mt-2"
            >
              {isLoading ? <Loader2 size={18} className="animate-spin" /> : (
                <>Sign In <ArrowRight size={18} /></>
              )}
            </button>
          </form>
        </div>
        
        <p className="text-center text-xs text-slate-500 mt-6">Secure Gateway © 2026 SeaSon SMS</p>
      </div>
    </div>
  );
}
