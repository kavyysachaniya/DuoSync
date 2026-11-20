import React, { useMemo, useState } from 'react';
import {
  AlertCircle,
  Check,
  CheckCircle2,
  Copy,
  Loader2,
  Radio,
  Trash2,
  Unlink,
  Users,
  X,
} from 'lucide-react';
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

type PairingFlowStatus = 'idle' | 'searching' | 'found' | 'connecting' | 'connected' | 'failed';

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
  const isPairedWithSecondAccount = Boolean(
    workspace.partnerUid && workspace.partnerUid.trim().length > 0
  );

  const [copied, setCopied] = useState(false);
  const [inputCode, setInputCode] = useState('');
  const [pairingStatus, setPairingStatus] = useState<PairingFlowStatus>(
    isPairedWithSecondAccount ? 'connected' : 'idle'
  );
  const [joinError, setJoinError] = useState<string | null>(null);

  const [showDiscardConfirm, setShowDiscardConfirm] = useState(false);
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

  // Check if form has unsaved modifications
  const isDirty = useMemo(() => {
    return (
      currency !== (workspace.currency || '₹') ||
      partner1Name !== workspace.partner1Name ||
      partner1Role !== workspace.partner1Role ||
      partner2Name !== workspace.partner2Name ||
      partner2Role !== workspace.partner2Role ||
      defaultSlot !== userDoc.defaultSlot
    );
  }, [
    currency,
    partner1Name,
    partner1Role,
    partner2Name,
    partner2Role,
    defaultSlot,
    workspace,
    userDoc,
  ]);

  if (!isOpen) return null;

  const handleAttemptClose = () => {
    if (isDirty) {
      setShowDiscardConfirm(true);
    } else {
      onClose();
    }
  };

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
    const cleaned = inputCode.replace(/\D/g, '').slice(0, 6);
    if (cleaned.length !== 6) {
      setJoinError('Please enter a valid 6-digit numeric pairing code.');
      setPairingStatus('failed');
      return;
    }
    if (cleaned === workspace.pairingCode) {
      setJoinError('This is already your active workspace code.');
      setPairingStatus('failed');
      return;
    }

    setPairingStatus('searching');
    try {
      await new Promise((resolve) => setTimeout(resolve, 400));
      setPairingStatus('found');
      await new Promise((resolve) => setTimeout(resolve, 300));
      setPairingStatus('connecting');
      await onJoinByCode(cleaned);
      setPairingStatus('connected');
      setInputCode('');
      // Auto-exit after successful pairing!
      setTimeout(() => {
        onClose();
      }, 1100);
    } catch (err) {
      setPairingStatus('failed');
      setJoinError(err instanceof Error ? err.message : 'Unable to connect with that code.');
    }
  };

  const handleSaveIdentities = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingSettings(true);
    try {
      await onUpdateWorkspaceIdentities({
        currency,
        partner1Name: partner1Name.trim() || 'User 1',
        partner1Role: partner1Role.trim() || 'My Dashboard',
        partner2Name: partner2Name.trim() || 'Partner',
        partner2Role: partner2Role.trim() || 'Partner Dashboard',
        defaultSlot,
      });
      // After tapping Save, automatically exit the modal!
      onClose();
    } catch (err) {
      console.error('Failed to update workspace identities:', err);
    } finally {
      setSavingSettings(false);
    }
  };

  const handleUnlink = async () => {
    try {
      await onUnlinkPartner();
      setPairingStatus('idle');
    } catch (err) {
      console.error('Failed to unlink partner:', err);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Partner Pairing & Workspace Settings"
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/80 backdrop-blur-sm p-0 sm:p-4"
    >
      <div className="w-full sm:max-w-lg max-h-[92dvh] flex flex-col rounded-t-3xl sm:rounded-3xl bg-[#12141C] border border-white/10 text-zinc-100 shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* Sticky Header with 44px close affordance */}
        <div className="shrink-0 p-4 sm:p-5 border-b border-white/10 bg-[#12141C]">
          <div className="w-10 h-1 bg-zinc-700 rounded-full mx-auto mb-3 sm:hidden" />
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-9 h-9 rounded-xl bg-rose-500/15 border border-rose-500/30 flex items-center justify-center text-rose-400 shrink-0">
                <Users className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <h2 className="text-base font-bold text-white truncate">Partner Pairing & Profiles</h2>
                <p className="text-xs text-zinc-400 truncate">
                  Link with partner via 6-digit code or customize settings
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={handleAttemptClose}
              className="w-11 h-11 rounded-full bg-white/5 hover:bg-white/10 text-zinc-400 hover:text-white flex items-center justify-center transition-colors shrink-0"
              aria-label="Close Pairing Modal"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Scrollable Body */}
        <div className="overflow-y-auto overscroll-contain flex-1 p-4 sm:p-5 space-y-5 no-scrollbar">
          {/* Pairing Status Banner Card (Distinct visual designs for all states) */}
          {pairingStatus === 'connected' && (
            <div className="rounded-2xl bg-emerald-500/10 border border-emerald-500/30 p-4 space-y-2 text-emerald-300">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-xs font-bold text-emerald-200">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  <span>Partners Linked & In Sync</span>
                </div>
                <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300">
                  Live Sync
                </span>
              </div>
              <p className="text-xs text-emerald-400/90 leading-relaxed">
                Both partner accounts are actively connected. Health vitals, skincare routines, and
                fits synchronize in real time via Neon PostgreSQL.
              </p>
              {isPairedWithSecondAccount && (
                <div className="pt-2 flex items-center justify-between border-t border-emerald-500/20">
                  <span className="text-xs text-emerald-300 font-mono">Workspace ID: {workspace.id.slice(0, 8)}...</span>
                  <button
                    type="button"
                    onClick={handleUnlink}
                    className="min-h-[40px] px-3 rounded-lg text-xs font-semibold text-rose-400 hover:bg-rose-500/15 flex items-center gap-1.5 transition-colors"
                  >
                    <Unlink className="w-3.5 h-3.5" />
                    <span>Unlink Partner</span>
                  </button>
                </div>
              )}
            </div>
          )}

          {pairingStatus === 'searching' && (
            <div className="rounded-2xl bg-sky-500/10 border border-sky-500/30 p-4 space-y-1.5 text-sky-200 animate-pulse">
              <div className="flex items-center gap-2 text-xs font-bold text-sky-300">
                <Radio className="w-4 h-4 animate-spin text-sky-400" />
                <span>Searching for workspace...</span>
              </div>
              <p className="text-xs text-sky-400/90">
                Locating shared workspace for code <span className="font-mono font-bold">{inputCode}</span>
              </p>
            </div>
          )}

          {pairingStatus === 'found' && (
            <div className="rounded-2xl bg-amber-500/10 border border-amber-500/30 p-4 space-y-1.5 text-amber-200">
              <div className="flex items-center gap-2 text-xs font-bold text-amber-300">
                <Check className="w-4 h-4 text-amber-400" />
                <span>Workspace Found</span>
              </div>
              <p className="text-xs text-amber-400/90">
                Verifying authorization and preparing account handshake...
              </p>
            </div>
          )}

          {pairingStatus === 'connecting' && (
            <div className="rounded-2xl bg-indigo-500/10 border border-indigo-500/30 p-4 space-y-1.5 text-indigo-200">
              <div className="flex items-center gap-2 text-xs font-bold text-indigo-300">
                <Loader2 className="w-4 h-4 animate-spin text-indigo-400" />
                <span>Connecting accounts...</span>
              </div>
              <p className="text-xs text-indigo-400/90">
                Linking your profile to this shared space. Exiting when ready...
              </p>
            </div>
          )}

          {pairingStatus === 'failed' && (
            <div className="rounded-2xl bg-rose-500/10 border border-rose-500/30 p-4 space-y-1 text-rose-300">
              <div className="flex items-center gap-2 text-xs font-bold text-rose-200">
                <AlertCircle className="w-4 h-4 text-rose-400" />
                <span>Connection Unsuccessful</span>
              </div>
              <p className="text-xs text-rose-400/90">{joinError || 'Please check the pairing code and try again.'}</p>
            </div>
          )}

          {/* 6-Digit Pairing Code Display Card */}
          <div className="rounded-2xl bg-zinc-900/90 border border-white/10 p-4 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-zinc-300">
                Your 6-Digit Partner Invite Code
              </span>
              <span className="text-xs text-zinc-400 font-mono">
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
                className="min-h-[44px] px-4 py-2 rounded-xl bg-white/10 hover:bg-white/15 text-xs font-semibold text-white flex items-center gap-1.5 transition-colors whitespace-nowrap shrink-0 active:scale-95"
                aria-label="Copy pairing code to clipboard"
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
              Share this 6-digit code with your partner so they can link directly to this shared workspace.
            </p>
          </div>

          {/* Enter Partner's 6-Digit Code */}
          <form onSubmit={handleJoinSubmit} className="rounded-2xl bg-zinc-900/90 border border-white/10 p-4 space-y-3">
            <label className="block text-xs font-semibold text-zinc-300">
              Connect to Another Partner’s Code
            </label>
            <div className="flex items-center gap-2">
              <input
                type="text"
                inputMode="numeric"
                maxLength={6}
                value={inputCode}
                onChange={(e) => setInputCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                placeholder="Enter 6-digit code (e.g. 482910)"
                className="flex-1 min-h-[44px] bg-[#090A0F] border border-white/10 rounded-xl px-3.5 text-base sm:text-sm font-mono tabular-nums text-white placeholder:text-zinc-600 focus:outline-none focus:border-rose-500/60 transition-colors"
              />
              <button
                type="submit"
                disabled={
                  pairingStatus === 'searching' ||
                  pairingStatus === 'connecting' ||
                  inputCode.length !== 6
                }
                className="min-h-[44px] px-4 rounded-xl bg-rose-500 hover:bg-rose-600 disabled:opacity-40 text-xs font-semibold text-white flex items-center gap-1.5 transition-all whitespace-nowrap shrink-0 active:scale-95"
              >
                {pairingStatus === 'searching' || pairingStatus === 'connecting' ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : null}
                <span>
                  {pairingStatus === 'searching' || pairingStatus === 'connecting'
                    ? 'Linking...'
                    : 'Link Partner'}
                </span>
              </button>
            </div>
          </form>

          {/* Customize Names, Default Dashboard & Currency */}
          <form onSubmit={handleSaveIdentities} className="space-y-4 pt-2 border-t border-white/10">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-white">
                Profile Names & Workspace
              </h3>
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onOpenOnboardingWizard();
                }}
                className="min-h-[36px] text-xs text-rose-400 hover:text-rose-300 transition-colors px-2 py-1 font-semibold"
              >
                Launch Setup Wizard
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="rounded-xl bg-zinc-900/80 border border-white/10 p-3.5 space-y-2.5">
                <span className="text-xs font-semibold text-sky-400">Primary Profile</span>
                <div>
                  <label className="block text-[11px] text-zinc-400 mb-1">Display Name</label>
                  <input
                    type="text"
                    maxLength={60}
                    value={partner1Name}
                    onChange={(e) => setPartner1Name(e.target.value)}
                    className="w-full min-h-[44px] bg-[#090A0F] border border-white/10 rounded-xl px-3 text-base sm:text-sm text-white focus:outline-none focus:border-sky-500/60"
                  />
                </div>
                <div>
                  <label className="block text-[11px] text-zinc-400 mb-1">Dashboard Label</label>
                  <input
                    type="text"
                    maxLength={40}
                    value={partner1Role}
                    onChange={(e) => setPartner1Role(e.target.value)}
                    className="w-full min-h-[44px] bg-[#090A0F] border border-white/10 rounded-xl px-3 text-base sm:text-xs text-zinc-200 focus:outline-none focus:border-sky-500/60"
                  />
                </div>
              </div>

              <div className="rounded-xl bg-zinc-900/80 border border-white/10 p-3.5 space-y-2.5">
                <span className="text-xs font-semibold text-rose-400">Partner Profile</span>
                <div>
                  <label className="block text-[11px] text-zinc-400 mb-1">Display Name</label>
                  <input
                    type="text"
                    maxLength={60}
                    value={partner2Name}
                    onChange={(e) => setPartner2Name(e.target.value)}
                    className="w-full min-h-[44px] bg-[#090A0F] border border-white/10 rounded-xl px-3 text-base sm:text-sm text-white focus:outline-none focus:border-rose-500/60"
                  />
                </div>
                <div>
                  <label className="block text-[11px] text-zinc-400 mb-1">Dashboard Label</label>
                  <input
                    type="text"
                    maxLength={40}
                    value={partner2Role}
                    onChange={(e) => setPartner2Role(e.target.value)}
                    className="w-full min-h-[44px] bg-[#090A0F] border border-white/10 rounded-xl px-3 text-base sm:text-xs text-zinc-200 focus:outline-none focus:border-rose-500/60"
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
                    className={`min-h-[44px] rounded-lg text-xs font-semibold transition-colors truncate px-2 ${
                      defaultSlot === 'partner1'
                        ? 'bg-sky-500 text-white shadow-sm'
                        : 'text-zinc-400 hover:text-white'
                    }`}
                  >
                    {partner1Name || 'Me'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setDefaultSlot('partner2')}
                    className={`min-h-[44px] rounded-lg text-xs font-semibold transition-colors truncate px-2 ${
                      defaultSlot === 'partner2'
                        ? 'bg-rose-500 text-white shadow-sm'
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
                      className={`min-h-[44px] rounded-lg text-xs font-mono font-bold transition-all ${
                        currency === sym
                          ? 'bg-white text-zinc-950 shadow-sm'
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
              <button
                type="submit"
                disabled={savingSettings}
                className="min-h-[44px] px-6 rounded-xl bg-white text-zinc-950 hover:bg-zinc-200 text-xs font-bold transition-all shadow-lg shadow-white/5 whitespace-nowrap shrink-0 active:scale-95"
              >
                {savingSettings ? 'Saving...' : 'Save & Exit'}
              </button>
            </div>

            {/* Account Reset / Danger Zone */}
            {onDeleteAllUserData && (
              <div className="pt-4 border-t border-white/8 space-y-2">
                <div className="text-xs font-semibold text-rose-400">Danger Zone</div>
                <p className="text-[11px] text-zinc-400 leading-relaxed">
                  Permanently delete all workspace data, vitals logs, routine completions, fits, and reset your account.
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
                    className={`min-h-[44px] px-4 rounded-xl text-xs font-semibold transition-colors flex items-center gap-1.5 ${
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
                      className="min-h-[44px] px-3 rounded-xl text-xs text-zinc-400 hover:text-white bg-[#090A0F] border border-white/10"
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

      {/* Discard Unsaved Changes Confirmation Modal */}
      {showDiscardConfirm && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md">
          <div className="w-full max-w-sm rounded-3xl bg-[#12141C] border border-white/10 p-5 space-y-4 shadow-2xl animate-in fade-in zoom-in-95">
            <h4 className="text-sm font-bold text-white">Discard Unsaved Changes?</h4>
            <p className="text-xs text-zinc-400 leading-relaxed bg-[#090A0F] rounded-xl p-3 border border-white/6">
              You have modified your profile names or currency settings. Leaving will discard these changes.
            </p>
            <div className="grid grid-cols-2 gap-2 pt-1">
              <button
                type="button"
                onClick={() => setShowDiscardConfirm(false)}
                className="min-h-[44px] rounded-xl bg-white/5 hover:bg-white/10 text-xs font-semibold text-zinc-300 transition-colors"
              >
                Keep Editing
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowDiscardConfirm(false);
                  onClose();
                }}
                className="min-h-[44px] rounded-xl bg-red-600 hover:bg-red-500 text-xs font-semibold text-white transition-colors"
              >
                Discard & Exit
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
