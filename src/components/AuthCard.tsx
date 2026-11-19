import React, { useState } from 'react';
import {
  AlertCircle,
  ArrowRight,
  Eye,
  EyeOff,
  Loader2,
  Lock,
  Mail,
  ShieldCheck,
  User,
} from 'lucide-react';
import { api, AuthResponse, setStoredToken } from '../services/apiClient';

interface AuthCardProps {
  onSuccess?: (authData: AuthResponse) => void;
}

export const AuthCard: React.FC<AuthCardProps> = ({ onSuccess }) => {
  const [authMode, setAuthMode] = useState<'signin' | 'signup'>('signin');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    const cleanEmail = email.trim().toLowerCase();
    const cleanPassword = password.trim();

    if (!cleanEmail || !cleanEmail.includes('@')) {
      setErrorMessage('Please enter a valid email address.');
      return;
    }

    if (!cleanPassword || cleanPassword.length < 6) {
      setErrorMessage('Password must be at least 6 characters long.');
      return;
    }

    setLoading(true);

    try {
      let res: AuthResponse;
      if (authMode === 'signup') {
        const cleanName = name.trim().slice(0, 50) || 'My Profile';
        res = await api.auth.register({
          email: cleanEmail,
          password: cleanPassword,
          name: cleanName,
        });
      } else {
        res = await api.auth.login({
          email: cleanEmail,
          password: cleanPassword,
        });
      }

      // Persist long-lived JWT token across browser sessions and refreshes
      setStoredToken(res.token);
      onSuccess?.(res);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Authentication failed. Please try again.';
      setErrorMessage(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full max-w-md mx-auto rounded-3xl bg-[#12141C] border border-white/10 p-5 sm:p-7 shadow-2xl shadow-black/60 space-y-5">
      {/* Auth Mode Toggle Pill */}
      <div className="flex items-center p-1 rounded-2xl bg-[#090A0F] border border-white/8 text-xs font-semibold">
        <button
          type="button"
          onClick={() => {
            setAuthMode('signin');
            setErrorMessage(null);
          }}
          className={`flex-1 min-h-[38px] rounded-xl transition-all flex items-center justify-center gap-1.5 ${
            authMode === 'signin'
              ? 'bg-white text-zinc-950 font-bold shadow-sm'
              : 'text-zinc-400 hover:text-white'
          }`}
        >
          <span>Sign In</span>
        </button>
        <button
          type="button"
          onClick={() => {
            setAuthMode('signup');
            setErrorMessage(null);
          }}
          className={`flex-1 min-h-[38px] rounded-xl transition-all flex items-center justify-center gap-1.5 ${
            authMode === 'signup'
              ? 'bg-white text-zinc-950 font-bold shadow-sm'
              : 'text-zinc-400 hover:text-white'
          }`}
        >
          <span>Create Account</span>
        </button>
      </div>

      {/* Password-Based Form */}
      <form onSubmit={handleSubmit} className="space-y-3.5">
        {authMode === 'signup' && (
          <div className="space-y-1">
            <label className="block text-xs font-medium text-zinc-300">Your Name</label>
            <div className="relative">
              <User className="w-4 h-4 text-zinc-500 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Alex"
                maxLength={40}
                required
                className="w-full min-h-[44px] bg-[#090A0F] border border-white/10 rounded-xl pl-9 pr-3 text-xs text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:border-rose-500/70"
              />
            </div>
          </div>
        )}

        <div className="space-y-1">
          <label className="block text-xs font-medium text-zinc-300">Email Address</label>
          <div className="relative">
            <Mail className="w-4 h-4 text-zinc-500 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              autoComplete="email"
              className="w-full min-h-[44px] bg-[#090A0F] border border-white/10 rounded-xl pl-9 pr-3 text-xs text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:border-rose-500/70"
            />
          </div>
        </div>

        <div className="space-y-1">
          <label className="block text-xs font-medium text-zinc-300">Password</label>
          <div className="relative">
            <Lock className="w-4 h-4 text-zinc-500 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type={showPassword ? 'text' : 'password'}
              required
              minLength={6}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Min. 6 characters"
              autoComplete={authMode === 'signup' ? 'new-password' : 'current-password'}
              className="w-full min-h-[44px] bg-[#090A0F] border border-white/10 rounded-xl pl-9 pr-10 text-xs text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:border-rose-500/70"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300"
              aria-label={showPassword ? 'Hide password' : 'Show password'}
            >
              {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
        </div>

        {/* Error message */}
        {errorMessage && (
          <div className="rounded-xl bg-rose-500/10 border border-rose-500/30 p-2.5 flex items-start gap-2 text-xs text-rose-300 leading-relaxed">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-400" />
            <span>{errorMessage}</span>
          </div>
        )}

        <button
          type="submit"
          disabled={loading}
          className="w-full min-h-[46px] rounded-2xl bg-gradient-to-r from-rose-500 to-rose-600 hover:from-rose-600 hover:to-rose-700 text-white text-xs sm:text-sm font-semibold flex items-center justify-center gap-2 transition-all shadow-lg shadow-rose-500/20 disabled:opacity-60"
        >
          {loading ? (
            <Loader2 className="w-4 h-4 animate-spin text-white" />
          ) : (
            <>
              <span>{authMode === 'signup' ? 'Create Account & Start' : 'Sign In'}</span>
              <ArrowRight className="w-4 h-4" />
            </>
          )}
        </button>
      </form>

      {/* Security Reassurance */}
      <div className="pt-2 text-center border-t border-white/5 space-y-1">
        <div className="flex items-center justify-center gap-1.5 text-[11px] text-zinc-400">
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
          <span>Persistent session · Stays signed in across refreshes</span>
        </div>
        <p className="text-[10px] text-zinc-500">
          Syncs bi-directionally between Partner 1 & Partner 2 via 6-digit code.
        </p>
      </div>
    </div>
  );
};
