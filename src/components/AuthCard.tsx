import React, { useState } from 'react';
import {
  createUserWithEmailAndPassword,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  signInWithPopup,
  updateProfile,
} from 'firebase/auth';
import {
  AlertCircle,
  ArrowRight,
  CheckCircle2,
  Eye,
  EyeOff,
  HeartHandshake,
  Loader2,
  Lock,
  Mail,
  User,
} from 'lucide-react';
import { auth, googleProvider } from '../firebase';

interface AuthCardProps {
  onSuccess?: () => void;
}

export const AuthCard: React.FC<AuthCardProps> = ({ onSuccess }) => {
  const [authMode, setAuthMode] = useState<'signin' | 'signup'>('signin');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const [loadingGoogle, setLoadingGoogle] = useState(false);
  const [loadingEmail, setLoadingEmail] = useState(false);
  const [resetSent, setResetSent] = useState(false);
  const [resetLoading, setResetLoading] = useState(false);

  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleGoogleSignIn = async () => {
    setLoadingGoogle(true);
    setErrorMessage(null);
    try {
      await signInWithPopup(auth, googleProvider);
      onSuccess?.();
    } catch (err: unknown) {
      const code = (err as { code?: string })?.code;
      if (code === 'auth/popup-closed-by-user') {
        // user closed popup, don't scream error
        return;
      }
      if (code === 'auth/unauthorized-domain') {
        setErrorMessage(
          'This domain is not authorized in Firebase. Please add duopulse18.vercel.app to Firebase Console > Authentication > Settings > Authorized domains.'
        );
        return;
      }
      setErrorMessage(
        err instanceof Error ? err.message : 'Google sign-in was cancelled or failed.'
      );
    } finally {
      setLoadingGoogle(false);
    }
  };

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setResetSent(false);

    const cleanEmail = email.trim();
    if (!cleanEmail) {
      setErrorMessage('Please enter a valid email address.');
      return;
    }

    if (!password || password.length < 6) {
      setErrorMessage('Password must be at least 6 characters.');
      return;
    }

    setLoadingEmail(true);

    try {
      if (authMode === 'signup') {
        const userCredential = await createUserWithEmailAndPassword(auth, cleanEmail, password);
        if (name.trim()) {
          await updateProfile(userCredential.user, {
            displayName: name.trim().slice(0, 50),
          });
        }
      } else {
        await signInWithEmailAndPassword(auth, cleanEmail, password);
      }
      onSuccess?.();
    } catch (err: unknown) {
      const code = (err as { code?: string })?.code;
      if (code === 'auth/email-already-in-use') {
        setErrorMessage('This email is already registered. Please switch to Sign In.');
      } else if (
        code === 'auth/invalid-credential' ||
        code === 'auth/wrong-password' ||
        code === 'auth/user-not-found'
      ) {
        setErrorMessage('Incorrect email or password. Please verify and try again.');
      } else if (code === 'auth/weak-password') {
        setErrorMessage('Password should be at least 6 characters.');
      } else if (code === 'auth/operation-not-allowed') {
        setErrorMessage(
          'Email/Password sign-in is not enabled in Firebase Console. Please enable it under Authentication > Sign-in method.'
        );
      } else if (code === 'auth/too-many-requests') {
        setErrorMessage('Too many failed attempts. Please wait a few moments or reset password.');
      } else {
        setErrorMessage(err instanceof Error ? err.message : 'Authentication failed.');
      }
    } finally {
      setLoadingEmail(false);
    }
  };

  const handleForgotPassword = async () => {
    const cleanEmail = email.trim();
    if (!cleanEmail) {
      setErrorMessage('Please enter your email above to receive a password reset link.');
      return;
    }
    setResetLoading(true);
    setErrorMessage(null);
    try {
      await sendPasswordResetEmail(auth, cleanEmail);
      setResetSent(true);
    } catch (err: unknown) {
      const code = (err as { code?: string })?.code;
      if (code === 'auth/user-not-found') {
        setErrorMessage('No account found with that email address.');
      } else {
        setErrorMessage(
          err instanceof Error ? err.message : 'Failed to send password reset email.'
        );
      }
    } finally {
      setResetLoading(false);
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

      {/* Option 1: Google One-Click Sign In */}
      <div>
        <button
          type="button"
          onClick={handleGoogleSignIn}
          disabled={loadingGoogle || loadingEmail}
          className="w-full min-h-[48px] px-4 py-2.5 rounded-2xl bg-white text-zinc-950 hover:bg-zinc-200 text-xs sm:text-sm font-semibold inline-flex items-center justify-center gap-2.5 transition-all shadow-md disabled:opacity-60"
        >
          {loadingGoogle ? (
            <Loader2 className="w-4 h-4 animate-spin text-zinc-950" />
          ) : (
            <svg className="w-4 h-4" viewBox="0 0 24 24">
              <path
                fill="#4285F4"
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              />
              <path
                fill="#34A853"
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              />
              <path
                fill="#FBBC05"
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
              />
              <path
                fill="#EA4335"
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
              />
            </svg>
          )}
          <span>
            {loadingGoogle
              ? 'Connecting Google...'
              : authMode === 'signup'
              ? 'Sign up with Google'
              : 'Continue with Google'}
          </span>
        </button>
      </div>

      {/* Divider */}
      <div className="relative flex items-center justify-center">
        <div className="absolute inset-x-0 h-px bg-white/10" />
        <span className="relative px-3 bg-[#12141C] text-[11px] font-medium text-zinc-500 uppercase tracking-wider">
          or with email & password
        </span>
      </div>

      {/* Option 2: Email & Password Form */}
      <form onSubmit={handleEmailAuth} className="space-y-3.5">
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
          <div className="flex items-center justify-between">
            <label className="block text-xs font-medium text-zinc-300">Password</label>
            {authMode === 'signin' && (
              <button
                type="button"
                onClick={handleForgotPassword}
                disabled={resetLoading}
                className="text-[11px] text-zinc-400 hover:text-rose-400 transition-colors"
              >
                {resetLoading ? 'Sending...' : 'Forgot password?'}
              </button>
            )}
          </div>
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

        {/* Reset Email Sent Confirmation */}
        {resetSent && (
          <div className="rounded-xl bg-emerald-500/10 border border-emerald-500/30 p-2.5 flex items-start gap-2 text-xs text-emerald-300 leading-relaxed">
            <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5 text-emerald-400" />
            <span>Password reset email sent! Check your inbox to update your password.</span>
          </div>
        )}

        <button
          type="submit"
          disabled={loadingEmail || loadingGoogle}
          className="w-full min-h-[46px] rounded-2xl bg-gradient-to-r from-rose-500 to-rose-600 hover:from-rose-600 hover:to-rose-700 text-white text-xs sm:text-sm font-semibold flex items-center justify-center gap-2 transition-all shadow-lg shadow-rose-500/20 disabled:opacity-60"
        >
          {loadingEmail ? (
            <Loader2 className="w-4 h-4 animate-spin text-white" />
          ) : (
            <>
              <span>{authMode === 'signup' ? 'Create Account' : 'Sign In with Email'}</span>
              <ArrowRight className="w-4 h-4" />
            </>
          )}
        </button>
      </form>

      <div className="pt-1 text-center">
        <p className="text-[11px] text-zinc-500">
          Encrypted Firebase Cloud Sync · Pair cross-device with a 6-digit code.
        </p>
      </div>
    </div>
  );
};
