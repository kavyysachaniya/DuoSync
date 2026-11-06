import React, { useState } from 'react';
import { Check, Copy, Link2, RotateCcw, Sparkles, Trash2, Unlink, Users, X } from 'lucide-react';
import { ProfileSlot, UserDoc, WorkspaceDoc } from '../types';

interface PartnerModalProps {
  isOpen: boolean;
  onClose: () => void;
  userDoc: UserDoc;
  workspace: WorkspaceDoc;
  onJoinByCode: (code: string) => Promise<void>;
  onUnlinkPartner: () => Promise<void>;
  onOpenOnboardingWizard: () => void;
  onUpdateWorkspaceIdentities: (updates: {
    currency: string;
    partner1Name: string;
    partner1Role: string;
    partner2Name: string;
    partner2Role: string;
    defaultSlot: ProfileSlot;
  }) => Promise<void>;
  onDeleteAllUserData?: () => Promise<void>;
}

const CURRENCY_OPTIONS = ['₹', '$', '€', '£', '¥', 'A$'];

export const PartnerModal: React.FC<PartnerModalProps> = ({
  isOpen,
  onClose,
  userDoc,
  workspace,
  onJoinByCode,
  onUnlinkPartner,
  onOpenOnboardingWizard,
  onUpdateWorkspaceIdentities,
  onDeleteAllUserData,
}) => {
  const [copied, setCopied] = useState(false);
  const [inputCode, setInputCode] = useState('');
  const [joinLoading, setJoinLoading] = useState(false);
  const [joinError, setJoinError] = useState<string | null>(null);
  const [joinSuccess, setJoinSuccess] = useState<string | null>(null);

  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deletingData, setDeletingData] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const [currency, setCurrency] = useState(workspace.currency || '₹');
  const [partner1Name, setPartner1Name] = useState(workspace.partner1Name);
  const [partner1Role, setPartner1Role] = useState(workspace.partner1Role);
  const [partner2Name, setPartner2Name] = useState(workspace.partner2Name);
  const [partner2Role, setPartner2Role] = useState(workspace.partner2Role);
  const [defaultSlot, setDefaultSlot] = useState<ProfileSlot>(userDoc.defaultSlot);
  const [savingSettings, setSavingSettings] = useState(false);
  const [savedBanner, setSavedBanner] = useState(false);

  if (!isOpen) return null;

  const isPairedWithSecondAccount = Boolean(workspace.partnerUid && workspace.partnerUid.trim().length > 0);

  const handleCopyCode = async () => {
    try {
      await navigator.clipboard.writeText(workspace.pairingCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  };

  const handleJoinSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setJoinError(null);
    setJoinSuccess(null);
    const cleaned = inputCode.replace(/\D/g, '').slice(0, 6);
    if (cleaned.length !== 6) {
      setJoinError('Please enter a valid 6-digit numeric pairing code.');
      return;
    }
    if (cleaned === workspace.pairingCode) {
      setJoinError('This is already your active workspace code.');
      return;
    }
    setJoinLoading(true);
    try {
      await onJoinByCode(cleaned);
      setJoinSuccess('Connected to your partner’s shared workspace!');
      setInputCode('');
    } catch (err) {
      setJoinError(err instanceof Error ? err.message : 'Unable to connect with that code.');
    } finally {
      setJoinLoading(false);
    }
  };

  const handleSaveIdentities = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingSettings(true);
    setSavedBanner(false);
    try {
      await onUpdateWorkspaceIdentities({
        currency,
        partner1Name: partner1Name.trim() || 'User 1',
        partner1Role: partner1Role.trim() || 'My Dashboard',
        partner2Name: partner2Name.trim() || 'Partner',
        partner2Role: partner2Role.trim() || 'Partner Dashboard',
        defaultSlot,
      });
      setSavedBanner(true);
      setTimeout(() => setSavedBanner(false), 2200);
    } finally {
      setSavingSettings(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/75 backdrop-blur-sm p-0 sm:p-4">
      <div className="w-full sm:max-w-lg max-h-[92vh] overflow-y-auto rounded-t-3xl sm:rounded-3xl bg-[#12141C] border border-white/10 p-5 sm:p-6 text-zinc-100 shadow-2xl">
        {/* Grab handle on mobile */}
        <div className="w-10 h-1.5 bg-zinc-700 rounded-full mx-auto mb-4 sm:hidden" />

        <div className="flex items-center justify-between gap-4 pb-4 border-b border-white/10">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-rose-500/15 border border-rose-500/30 flex items-center justify-center text-rose-400">
              <Users className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-white">Partner Connection & Profiles</h2>
              <p className="text-xs text-zinc-400">
                Link with your partner via 6-digit code or customize names
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="min-w-[44px] min-h-[44px] rounded-xl flex items-center justify-center text-zinc-400 hover:text-white hover:bg-white/5 transition-colors"
            aria-label="Close modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="space-y-6 pt-5">
          {/* 6-Digit Pairing Code Card */}
          <div className="rounded-2xl bg-zinc-900/90 border border-white/10 p-4 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-zinc-300">
                Your 6-Digit Partner Invite Code
              </span>
              <span className="text-xs text-zinc-400">
                {isPairedWithSecondAccount ? '2 Accounts Linked' : 'Ready to Pair'}
              </span>
            </div>

            <div className="flex items-center justify-between gap-3 bg-[#090A0F] border border-white/10 rounded-xl px-4 py-3">
              <span className="text-2xl font-mono font-semibold tracking-[0.25em] text-white tabular-nums">
                {workspace.pairingCode}
              </span>
              <button
                type="button"
                onClick={handleCopyCode}
                className="min-h-[40px] px-3.5 py-2 rounded-lg bg-white/10 hover:bg-white/15 text-xs font-medium text-white flex items-center gap-1.5 transition-colors whitespace-nowrap shrink-0"
              >
                {copied ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Copied</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    <span>Copy Code</span>
                  </>
                )}
              </button>
            </div>

            <p className="text-xs text-zinc-400 leading-relaxed">
              Share this 6-digit code with your partner so they can sign in with Google on their device and link directly to this shared dashboard.
            </p>

            {isPairedWithSecondAccount && (
              <div className="pt-2 flex items-center justify-between border-t border-white/5">
                <span className="text-xs text-emerald-400">
                  Partner Google account connected for live sync
                </span>
                <button
                  type="button"
                  onClick={onUnlinkPartner}
                  className="min-h-[36px] px-3 py-1.5 rounded-lg text-xs font-medium text-rose-400 hover:bg-rose-500/10 flex items-center gap-1.5 transition-colors"
                >
                  <Unlink className="w-3.5 h-3.5" />
                  <span>Unlink Account</span>
                </button>
              </div>
            )}
          </div>

          {/* Enter Partner's 6-Digit Code */}
          <form onSubmit={handleJoinSubmit} className="rounded-2xl bg-zinc-900/90 border border-white/10 p-4 space-y-3">
            <label className="block text-xs font-medium text-zinc-300">
              Connect to Your Partner’s 6-Digit Code
            </label>
            <div className="flex items-center gap-2">
              <input
                type="text"
                inputMode="numeric"
                maxLength={6}
                value={inputCode}
                onChange={(e) => setInputCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                placeholder="Enter 6-digit code (e.g. 482910)"
                className="flex-1 min-h-[44px] bg-[#090A0F] border border-white/10 rounded-xl px-3.5 text-sm font-mono tabular-nums text-white placeholder:text-zinc-600 focus:outline-none focus:border-rose-500/60"
              />
              <button
                type="submit"
                disabled={joinLoading || inputCode.length !== 6}
                className="min-h-[44px] px-4 rounded-xl bg-rose-500 hover:bg-rose-600 disabled:opacity-40 text-xs font-semibold text-white flex items-center gap-1.5 transition-colors whitespace-nowrap shrink-0"
              >
                <Link2 className="w-4 h-4" />
                <span>{joinLoading ? 'Linking...' : 'Link Partner'}</span>
              </button>
            </div>
            {joinError && <p className="text-xs text-rose-400">{joinError}</p>}
            {joinSuccess && <p className="text-xs text-emerald-400">{joinSuccess}</p>}
          </form>

          {/* Customize Names, Default Dashboard & Currency */}
          <form onSubmit={handleSaveIdentities} className="space-y-4 pt-2 border-t border-white/10">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-white flex items-center gap-1.5">
                <Sparkles className="w-4 h-4 text-amber-400" />
                <span>Profile Names & Currency</span>
              </h3>
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onOpenOnboardingWizard();
                }}
                className="text-xs text-rose-400 hover:text-rose-300 flex items-center gap-1 transition-colors"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Setup Wizard</span>
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="rounded-xl bg-zinc-900/80 border border-white/10 p-3.5 space-y-2.5">
                <span className="text-xs font-medium text-sky-400">Primary Profile</span>
                <div>
                  <label className="block text-[11px] text-zinc-400 mb-1">Display Name</label>
                  <input
                    type="text"
                    maxLength={60}
                    value={partner1Name}
                    onChange={(e) => setPartner1Name(e.target.value)}
                    className="w-full min-h-[40px] bg-[#090A0F] border border-white/10 rounded-lg px-3 text-sm text-white focus:outline-none focus:border-sky-500/60"
                  />
                </div>
                <div>
                  <label className="block text-[11px] text-zinc-400 mb-1">Dashboard Label</label>
                  <input
                    type="text"
                    maxLength={40}
                    value={partner1Role}
                    onChange={(e) => setPartner1Role(e.target.value)}
                    className="w-full min-h-[40px] bg-[#090A0F] border border-white/10 rounded-lg px-3 text-xs text-zinc-200 focus:outline-none focus:border-sky-500/60"
                  />
                </div>
              </div>

              <div className="rounded-xl bg-zinc-900/80 border border-white/10 p-3.5 space-y-2.5">
                <span className="text-xs font-medium text-rose-400">Partner Profile</span>
                <div>
                  <label className="block text-[11px] text-zinc-400 mb-1">Display Name</label>
                  <input
                    type="text"
                    maxLength={60}
                    value={partner2Name}
                    onChange={(e) => setPartner2Name(e.target.value)}
                    className="w-full min-h-[40px] bg-[#090A0F] border border-white/10 rounded-lg px-3 text-sm text-white focus:outline-none focus:border-rose-500/60"
                  />
                </div>
                <div>
                  <label className="block text-[11px] text-zinc-400 mb-1">Dashboard Label</label>
                  <input
                    type="text"
                    maxLength={40}
                    value={partner2Role}
                    onChange={(e) => setPartner2Role(e.target.value)}
                    className="w-full min-h-[40px] bg-[#090A0F] border border-white/10 rounded-lg px-3 text-xs text-zinc-200 focus:outline-none focus:border-rose-500/60"
                  />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs text-zinc-400 mb-1.5">
                  Default Dashboard on Launch
                </label>
                <div className="grid grid-cols-2 gap-1.5 p-1 bg-[#090A0F] border border-white/10 rounded-xl">
                  <button
                    type="button"
                    onClick={() => setDefaultSlot('partner1')}
                    className={`min-h-[38px] rounded-lg text-xs font-medium transition-colors truncate px-2 ${
                      defaultSlot === 'partner1'
                        ? 'bg-sky-500 text-white'
                        : 'text-zinc-400 hover:text-white'
                    }`}
                  >
                    {partner1Name || 'Me'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setDefaultSlot('partner2')}
                    className={`min-h-[38px] rounded-lg text-xs font-medium transition-colors truncate px-2 ${
                      defaultSlot === 'partner2'
                        ? 'bg-rose-500 text-white'
                        : 'text-zinc-400 hover:text-white'
                    }`}
                  >
                    {partner2Name || 'Partner'}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs text-zinc-400 mb-1.5">
                  Price Currency Symbol
                </label>
                <div className="grid grid-cols-6 gap-1 p-1 bg-[#090A0F] border border-white/10 rounded-xl">
                  {CURRENCY_OPTIONS.map((sym) => (
                    <button
                      key={sym}
                      type="button"
                      onClick={() => setCurrency(sym)}
                      className={`min-h-[38px] rounded-lg text-xs font-mono font-semibold transition-colors ${
                        currency === sym
                          ? 'bg-white text-zinc-950'
                          : 'text-zinc-400 hover:text-white'
                      }`}
                    >
                      {sym}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              {savedBanner && (
                <span className="text-xs text-emerald-400">Saved changes!</span>
              )}
              <button
                type="submit"
                disabled={savingSettings}
                className="min-h-[44px] px-5 rounded-xl bg-white text-zinc-950 hover:bg-zinc-200 text-xs font-semibold transition-colors whitespace-nowrap shrink-0"
              >
                {savingSettings ? 'Saving...' : 'Save Preferences'}
              </button>
            </div>

            {/* Account Reset / Danger Zone */}
            {onDeleteAllUserData && (
              <div className="pt-4 border-t border-white/8 space-y-2">
                <div className="text-xs font-semibold text-rose-400">Danger Zone</div>
                <p className="text-[11px] text-zinc-400 leading-relaxed">
                  Permanently delete all workspace data, vitals logs, routine completions, fits, and your user account from Firestore.
                </p>
                {deleteError && (
                  <div className="text-xs text-rose-400 bg-rose-500/10 p-2 rounded-lg border border-rose-500/20">
                    {deleteError}
                  </div>
                )}
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={async () => {
                      if (!confirmDelete) {
                        setConfirmDelete(true);
                        return;
                      }
                      setDeletingData(true);
                      setDeleteError(null);
                      try {
                        await onDeleteAllUserData();
                      } catch (err) {
                        setDeleteError(
                          err instanceof Error ? err.message : 'Failed to delete user data.'
                        );
                        setDeletingData(false);
                      }
                    }}
                    disabled={deletingData}
                    className={`min-h-[40px] px-4 rounded-xl text-xs font-semibold transition-colors flex items-center gap-1.5 ${
                      confirmDelete
                        ? 'bg-rose-600 hover:bg-rose-700 text-white'
                        : 'bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/30'
                    }`}
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>
                      {deletingData
                        ? 'Deleting Everything...'
                        : confirmDelete
                        ? 'Confirm: Wipe All My Data Now'
                        : 'Delete All My Data & Reset'}
                    </span>
                  </button>
                  {confirmDelete && !deletingData && (
                    <button
                      type="button"
                      onClick={() => setConfirmDelete(false)}
                      className="min-h-[40px] px-3 rounded-xl text-xs text-zinc-400 hover:text-white bg-[#090A0F] border border-white/10"
                    >
                      Cancel
                    </button>
                  )}
                </div>
              </div>
            )}
          </form>
        </div>
      </div>
    </div>
  );
};
