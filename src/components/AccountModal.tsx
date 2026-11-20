import React, { useState } from 'react';
import {
  AlertTriangle,
  Bell,
  ChevronRight,
  Database,
  ExternalLink,
  FileText,
  LogOut,
  Moon,
  Scale,
  ShieldCheck,
  SlidersHorizontal,
  Sparkles,
  User,
  X,
} from 'lucide-react';
import { PartnerProfileView, UserDoc, WorkspaceDoc } from '../types';

interface AppUserInfo {
  id: string;
  email: string;
  displayName: string;
}

interface AccountModalProps {
  isOpen: boolean;
  onClose: () => void;
  authUser: AppUserInfo | null;
  userDoc: UserDoc;
  workspace: WorkspaceDoc;
  activeProfile: PartnerProfileView;
  onOpenEditOnboarding: () => void;
  onUpdateCurrency: (currency: string) => Promise<void>;
  onSignOut: () => void;
}

const CURRENCY_LIST = ['₹', '$', '€', '£', '¥', 'A$'];

export const AccountModal: React.FC<AccountModalProps> = ({
  isOpen,
  onClose,
  authUser,
  userDoc,
  workspace,
  activeProfile,
  onOpenEditOnboarding,
  onUpdateCurrency,
  onSignOut,
}) => {
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [currency, setCurrency] = useState(workspace.currency || '₹');
  const [updatingCurrency, setUpdatingCurrency] = useState(false);
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [hapticEnabled, setHapticEnabled] = useState(true);
  const [policyModal, setPolicyModal] = useState<'privacy' | 'terms' | null>(null);

  if (!isOpen) return null;

  const handleCurrencyChange = async (newCurr: string) => {
    setCurrency(newCurr);
    setUpdatingCurrency(true);
    try {
      await onUpdateCurrency(newCurr);
    } catch (err) {
      console.error('Failed to update currency:', err);
    } finally {
      setUpdatingCurrency(false);
    }
  };

  const displayName =
    authUser?.displayName || userDoc.displayName || activeProfile.name || 'DuoPulse User';
  const email = authUser?.email || 'Authenticated User';
  const initial = displayName.charAt(0).toUpperCase() || 'U';

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Account Settings"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-md overflow-y-auto no-scrollbar"
    >
      <div className="relative w-full max-w-lg rounded-3xl bg-[#12141C] border border-white/10 shadow-2xl p-5 sm:p-6 my-auto space-y-5 animate-in fade-in zoom-in-95 duration-200">
        {/* Header with 44px close affordance */}
        <div className="flex items-center justify-between gap-3 pb-3 border-b border-white/8">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-full bg-rose-500/15 border border-rose-500/30 flex items-center justify-center text-rose-400">
              <User className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold text-white tracking-tight">Account</h2>
              <p className="text-xs text-zinc-400">Profile summary, preferences & settings</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close Account Modal"
            className="w-11 h-11 rounded-full bg-white/5 hover:bg-white/10 text-zinc-400 hover:text-white flex items-center justify-center transition-colors shrink-0"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Profile Summary Card */}
        <div className="rounded-2xl bg-[#090A0F] border border-white/8 p-4 flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-full bg-gradient-to-tr from-rose-500 via-purple-500 to-sky-500 p-0.5 shrink-0 shadow-lg shadow-rose-500/10">
            <div className="w-full h-full rounded-full bg-[#12141C] flex items-center justify-center text-base font-bold text-white">
              {initial}
            </div>
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <h3 className="text-sm sm:text-base font-bold text-white truncate">{displayName}</h3>
              <span className="text-[10px] font-mono uppercase tracking-wider px-2 py-0.5 rounded-full bg-sky-500/15 border border-sky-500/30 text-sky-300">
                {userDoc.defaultSlot === 'partner1' ? 'Partner 1' : 'Partner 2'}
              </span>
            </div>
            <p className="text-xs text-zinc-400 truncate mt-0.5">{email}</p>
            <div className="flex items-center gap-2 mt-1 text-[11px] text-zinc-400">
              <span className="font-mono">Workspace Code:</span>
              <span className="font-mono font-semibold text-rose-300">
                {workspace.pairingCode || '—'}
              </span>
            </div>
          </div>
        </div>

        {/* Edit Onboarding Details Section */}
        <div className="rounded-2xl bg-[#090A0F] border border-white/8 p-4 space-y-3">
          <div className="flex items-start justify-between gap-3">
            <div className="space-y-0.5">
              <div className="flex items-center gap-1.5 text-xs font-semibold text-white">
                <SlidersHorizontal className="w-3.5 h-3.5 text-rose-400" />
                <span>Onboarding Profile & Goals</span>
              </div>
              <p className="text-[11px] text-zinc-400 leading-relaxed">
                Re-open and edit your onboarding baseline, target goals, measurements, and routine
                categories anytime.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => {
              onClose();
              onOpenEditOnboarding();
            }}
            className="w-full min-h-[44px] rounded-xl bg-gradient-to-r from-rose-500/15 to-indigo-500/15 hover:from-rose-500/25 hover:to-indigo-500/25 border border-rose-500/30 text-xs font-semibold text-rose-200 hover:text-white flex items-center justify-center gap-2 transition-all active:scale-[0.99]"
          >
            <Sparkles className="w-4 h-4 text-rose-400" />
            <span>Edit Onboarding Details</span>
            <ChevronRight className="w-4 h-4 ml-1 opacity-70" />
          </button>
        </div>

        {/* Preferences / Settings Section */}
        <div className="rounded-2xl bg-[#090A0F] border border-white/8 p-4 space-y-3.5">
          <div className="text-xs font-semibold text-white tracking-tight flex items-center gap-1.5">
            <span>Preferences & Settings</span>
          </div>

          {/* Currency Preference */}
          <div className="flex items-center justify-between gap-3 pt-1">
            <div className="min-w-0">
              <span className="text-xs font-medium text-zinc-200 block">Workspace Currency</span>
              <span className="text-[11px] text-zinc-400 block">Used for product prices & expenses</span>
            </div>
            <div className="flex items-center gap-1 shrink-0">
              {CURRENCY_LIST.map((curr) => (
                <button
                  key={curr}
                  type="button"
                  disabled={updatingCurrency}
                  onClick={() => handleCurrencyChange(curr)}
                  className={`min-w-[34px] min-h-[34px] px-2 rounded-lg text-xs font-bold transition-all ${
                    currency === curr
                      ? 'bg-rose-500 text-white shadow-md shadow-rose-500/20'
                      : 'bg-zinc-900 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 border border-white/6'
                  }`}
                >
                  {curr}
                </button>
              ))}
            </div>
          </div>

          <div className="h-px bg-white/6" />

          {/* Theme Indicator */}
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <Moon className="w-4 h-4 text-zinc-400 shrink-0" />
              <div>
                <span className="text-xs font-medium text-zinc-200 block">Appearance</span>
                <span className="text-[11px] text-zinc-400 block">Dark Theme (OLED Optimized)</span>
              </div>
            </div>
            <span className="text-[10px] font-mono uppercase tracking-wider px-2 py-0.5 rounded-full bg-white/10 text-zinc-300">
              Always Dark
            </span>
          </div>

          <div className="h-px bg-white/6" />

          {/* Routine Reminders */}
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <Bell className="w-4 h-4 text-zinc-400 shrink-0" />
              <div>
                <span className="text-xs font-medium text-zinc-200 block">Daily Reminders</span>
                <span className="text-[11px] text-zinc-400 block">AM & PM routine check-in prompts</span>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setNotificationsEnabled((prev) => !prev)}
              className={`w-11 h-6 rounded-full transition-colors p-0.5 shrink-0 ${
                notificationsEnabled ? 'bg-rose-500' : 'bg-zinc-800 border border-white/10'
              }`}
            >
              <div
                className={`w-5 h-5 rounded-full bg-white transition-transform ${
                  notificationsEnabled ? 'translate-x-5' : 'translate-x-0'
                }`}
              />
            </button>
          </div>
        </div>

        {/* App Info & Cloud Sync */}
        <div className="rounded-2xl bg-[#090A0F] border border-white/8 p-4 space-y-2.5">
          <div className="flex items-center justify-between text-xs">
            <span className="text-zinc-400 flex items-center gap-1.5">
              <Database className="w-3.5 h-3.5 text-emerald-400" />
              <span>Cloud Storage</span>
            </span>
            <span className="font-mono text-emerald-400 font-medium">Neon PostgreSQL Connected</span>
          </div>

          <div className="flex items-center justify-between text-xs">
            <span className="text-zinc-400">App Version</span>
            <span className="font-mono text-zinc-300">v1.0.0 (Production)</span>
          </div>

          <div className="pt-2 border-t border-white/6 flex items-center justify-between text-xs text-zinc-400">
            <button
              type="button"
              onClick={() => setPolicyModal('privacy')}
              className="hover:text-white transition-colors flex items-center gap-1"
            >
              <ShieldCheck className="w-3.5 h-3.5 text-zinc-400" />
              <span>Privacy Policy</span>
            </button>
            <span className="text-zinc-600">·</span>
            <button
              type="button"
              onClick={() => setPolicyModal('terms')}
              className="hover:text-white transition-colors flex items-center gap-1"
            >
              <FileText className="w-3.5 h-3.5 text-zinc-400" />
              <span>Terms of Service</span>
            </button>
          </div>
        </div>

        {/* Log Out Row: Lives ONLY here at the bottom as a destructive red row */}
        <div className="pt-1">
          <button
            type="button"
            onClick={() => setShowLogoutConfirm(true)}
            className="w-full min-h-[44px] rounded-xl bg-red-500/10 hover:bg-red-500/20 border border-red-500/25 text-xs font-semibold text-red-400 hover:text-red-300 flex items-center justify-center gap-2 transition-all active:scale-[0.99]"
          >
            <LogOut className="w-4 h-4" />
            <span>Log Out</span>
          </button>
        </div>
      </div>

      {/* Logout Confirmation Dialog */}
      {showLogoutConfirm && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md">
          <div className="w-full max-w-sm rounded-3xl bg-[#12141C] border border-red-500/30 p-5 space-y-4 shadow-2xl animate-in fade-in zoom-in-95">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-red-500/15 border border-red-500/30 flex items-center justify-center text-red-400 shrink-0">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-white">Confirm Log Out</h4>
                <p className="text-xs text-zinc-400 mt-0.5">
                  Are you sure you want to log out of DuoPulse?
                </p>
              </div>
            </div>
            <p className="text-xs text-zinc-400 leading-relaxed bg-[#090A0F] rounded-xl p-3 border border-white/6">
              You will need your login credentials to re-access this shared workspace on this device.
            </p>
            <div className="grid grid-cols-2 gap-2 pt-1">
              <button
                type="button"
                onClick={() => setShowLogoutConfirm(false)}
                className="min-h-[44px] rounded-xl bg-white/5 hover:bg-white/10 text-xs font-semibold text-zinc-300 transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowLogoutConfirm(false);
                  onClose();
                  onSignOut();
                }}
                className="min-h-[44px] rounded-xl bg-red-600 hover:bg-red-500 text-xs font-semibold text-white shadow-lg shadow-red-600/30 transition-colors"
              >
                Yes, Log Out
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Privacy / Terms Sub-Modal */}
      {policyModal && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md">
          <div className="w-full max-w-md rounded-3xl bg-[#12141C] border border-white/10 p-5 space-y-4 shadow-2xl animate-in fade-in">
            <div className="flex items-center justify-between pb-2 border-b border-white/8">
              <h4 className="text-sm font-bold text-white capitalize">
                {policyModal === 'privacy' ? 'Privacy Policy' : 'Terms of Service'}
              </h4>
              <button
                type="button"
                onClick={() => setPolicyModal(null)}
                className="w-8 h-8 rounded-full bg-white/5 text-zinc-400 hover:text-white flex items-center justify-center"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="text-xs text-zinc-400 leading-relaxed max-h-60 overflow-y-auto space-y-2 pr-1">
              <p>
                DuoPulse stores your shared health vitals, skincare routines, and wardrobe fits in a
                private encrypted PostgreSQL database hosted on Neon Cloud.
              </p>
              <p>
                Your data is only accessible to you and your paired partner using your workspace
                pairing code and encrypted authentication tokens. We do not sell or monetize personal
                health or care data.
              </p>
              <p>
                By using DuoPulse, you agree to keep your account credentials secure and respect your
                partner’s shared logs.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setPolicyModal(null)}
              className="w-full min-h-[40px] rounded-xl bg-white/10 hover:bg-white/15 text-xs font-semibold text-white transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
