import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import {
  AlertCircle,
  AlertTriangle,
  Bell,
  Camera,
  Check,
  CheckCircle2,
  ChevronRight,
  Copy,
  Database,
  FileText,
  Loader2,
  LogOut,
  Moon,
  Radio,
  ShieldCheck,
  SlidersHorizontal,
  Sparkles,
  Trash2,
  Unlink,
  User,
  X,
} from 'lucide-react';
import { PartnerProfileView, ProfileSlot, UserDoc, WorkspaceDoc } from '../types';
import { UserAvatar } from './UserAvatar';
import { cropImageToSquare } from '../utils/imageCropper';

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
  onJoinByCode?: (code: string) => Promise<void>;
  onUnlinkPartner?: () => Promise<void>;
  onUpdateWorkspaceIdentities?: (updates: {
    currency: string;
    partner1Name: string;
    partner1Role: string;
    partner2Name: string;
    partner2Role: string;
    defaultSlot: ProfileSlot;
  }) => Promise<void>;
  onDeleteAllUserData?: () => Promise<void>;
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
  onJoinByCode,
  onUnlinkPartner,
  onUpdateWorkspaceIdentities,
  onDeleteAllUserData,
}) => {
  const isPairedWithSecondAccount = Boolean(
    workspace.partnerUid && workspace.partnerUid.trim().length > 0
  );

  const [copied, setCopied] = useState(false);
  const [inputCode, setInputCode] = useState('');
  const [pairingStatus, setPairingStatus] = useState<'idle' | 'searching' | 'connecting' | 'connected' | 'failed'>(
    isPairedWithSecondAccount ? 'connected' : 'idle'
  );
  const [joinError, setJoinError] = useState<string | null>(null);

  // Avatar Photo management with 1:1 circular crop
  const avatarStorageKey = `duosync_avatar_${userDoc.uid}`;
  const [avatarPhoto, setAvatarPhoto] = useState<string | null>(() => {
    return localStorage.getItem(avatarStorageKey) || null;
  });
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Workspace Settings Form
  const [currency, setCurrency] = useState(workspace.currency || '₹');
  const [updatingCurrency, setUpdatingCurrency] = useState(false);
  const [partner1Name, setPartner1Name] = useState(workspace.partner1Name);
  const [partner1Role, setPartner1Role] = useState(workspace.partner1Role);
  const [partner2Name, setPartner2Name] = useState(workspace.partner2Name);
  const [partner2Role, setPartner2Role] = useState(workspace.partner2Role);
  const [defaultSlot, setDefaultSlot] = useState<ProfileSlot>(userDoc.defaultSlot);
  const [savingSettings, setSavingSettings] = useState(false);
  const [settingsSuccess, setSettingsSuccess] = useState(false);

  // Preferences & Modals
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [policyModal, setPolicyModal] = useState<'privacy' | 'terms' | null>(null);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deletingData, setDeletingData] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setCurrency(workspace.currency || '₹');
      setPartner1Name(workspace.partner1Name);
      setPartner1Role(workspace.partner1Role);
      setPartner2Name(workspace.partner2Name);
      setPartner2Role(workspace.partner2Role);
      setDefaultSlot(userDoc.defaultSlot);
      setPairingStatus(isPairedWithSecondAccount ? 'connected' : 'idle');
      const savedPhoto = localStorage.getItem(avatarStorageKey);
      if (savedPhoto !== avatarPhoto) {
        setAvatarPhoto(savedPhoto);
      }
    }
  }, [isOpen, workspace, userDoc, isPairedWithSecondAccount, avatarStorageKey]);

  if (!isOpen) return null;

  const isPartner2 = userDoc.defaultSlot === 'partner2';
  const currentAccountName = isPartner2 ? partner2Name : partner1Name;
  const displayName =
    currentAccountName || activeProfile.name || authUser?.displayName || userDoc.displayName || 'DuoSync User';
  const email = authUser?.email || 'Authenticated User';

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const cropped = await cropImageToSquare(file, 400);
      setAvatarPhoto(cropped.dataUrl);
      localStorage.setItem(avatarStorageKey, cropped.dataUrl);
      window.dispatchEvent(new Event('duosync-avatar-updated'));
    } catch (err) {
      console.error('Failed to crop avatar photo:', err);
    } finally {
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleRemovePhoto = () => {
    setAvatarPhoto(null);
    localStorage.removeItem(avatarStorageKey);
    window.dispatchEvent(new Event('duosync-avatar-updated'));
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
    if (!onJoinByCode) return;
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
      await new Promise((resolve) => setTimeout(resolve, 300));
      setPairingStatus('connecting');
      await onJoinByCode(cleaned);
      setPairingStatus('connected');
      setInputCode('');
    } catch (err) {
      setPairingStatus('failed');
      setJoinError(err instanceof Error ? err.message : 'Unable to connect with that code.');
    }
  };

  const handleUnlink = async () => {
    if (!onUnlinkPartner) return;
    try {
      await onUnlinkPartner();
      setPairingStatus('idle');
    } catch (err) {
      console.error('Failed to unlink partner:', err);
    }
  };

  const handleSaveIdentities = async (e?: React.FormEvent) => {
    if (e && 'preventDefault' in e) e.preventDefault();
    if (!onUpdateWorkspaceIdentities) return;
    setSavingSettings(true);
    setSettingsSuccess(false);
    try {
      await onUpdateWorkspaceIdentities({
        currency,
        partner1Name: partner1Name.trim() || 'Partner 1',
        partner1Role: partner1Role.trim() || 'Partner 1’s Dashboard',
        partner2Name: partner2Name.trim() || 'Partner 2',
        partner2Role: partner2Role.trim() || 'Partner 2’s Dashboard',
        defaultSlot,
      });
      setSettingsSuccess(true);
      setTimeout(() => setSettingsSuccess(false), 2000);
    } catch (err) {
      console.error('Failed to update workspace identities:', err);
    } finally {
      setSavingSettings(false);
    }
  };

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

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Account Settings"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-md overflow-y-auto no-scrollbar"
    >
      <div className="relative w-full max-w-lg rounded-3xl bg-[#0A0A0F] border border-white/10 shadow-2xl p-5 sm:p-6 my-auto space-y-5 animate-in fade-in zoom-in-95 duration-200">
        {/* Header with 44px close affordance */}
        <div className="flex items-center justify-between gap-3 pb-3 border-b border-white/8">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 rounded-full bg-zinc-800 border border-white/15 flex items-center justify-center text-zinc-300 shrink-0">
              <User className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <h2 className="text-base sm:text-lg font-bold text-white tracking-tight truncate">
                Account & Settings
              </h2>
              <p className="text-xs text-zinc-400 truncate">
                Profile, partner pairing & workspace preferences
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close Account Modal"
            className="w-11 h-11 rounded-full bg-white/5 hover:bg-white/10 text-zinc-400 hover:text-white flex items-center justify-center transition-colors shrink-0 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* 1. Profile Summary Card (Avatar with NO GRADIENTS, photo upload/replace/remove) */}
        <div className="rounded-2xl bg-black border border-white/8 p-4 space-y-3">
          <div className="flex items-center gap-3.5">
            <div className="relative group shrink-0">
              <UserAvatar name={displayName} photoUrl={avatarPhoto} size="lg" />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="absolute inset-0 rounded-full bg-black/50 opacity-0 group-hover:opacity-100 flex items-center justify-center text-white transition-opacity cursor-pointer"
                title="Change Photo"
                aria-label="Upload Photo"
              >
                <Camera className="w-4 h-4" />
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handlePhotoUpload}
                className="hidden"
              />
            </div>

            <div className="min-w-0 flex-1 space-y-1.5">
              <div className="flex items-center gap-2">
                <span className="text-xs text-zinc-400 font-medium">Account Name</span>
                <span className="text-[10px] font-mono uppercase tracking-wider px-2 py-0.5 rounded-full bg-zinc-800 border border-white/15 text-zinc-300 shrink-0">
                  {isPartner2 ? 'Partner 2' : 'Partner 1'}
                </span>
                {settingsSuccess && (
                  <span className="text-[11px] font-mono text-emerald-400 flex items-center gap-1 font-semibold">
                    <Check className="w-3 h-3" /> Saved
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  maxLength={50}
                  value={isPartner2 ? partner2Name : partner1Name}
                  onChange={(e) => {
                    if (isPartner2) {
                      setPartner2Name(e.target.value);
                    } else {
                      setPartner1Name(e.target.value);
                    }
                  }}
                  placeholder="Enter your name"
                  className="h-10 min-h-[40px] px-3 bg-black border border-white/15 rounded-xl text-sm font-semibold text-white placeholder:text-zinc-600 focus:outline-none focus:border-rose-500/60 w-full max-w-[210px]"
                />
                <button
                  type="button"
                  onClick={() => handleSaveIdentities()}
                  disabled={savingSettings}
                  className="h-10 min-h-[40px] px-3.5 rounded-xl bg-white/10 hover:bg-white/15 border border-white/10 text-xs font-semibold text-white flex items-center justify-center gap-1 transition-colors active:scale-95 cursor-pointer disabled:opacity-40 shrink-0"
                >
                  {savingSettings ? '...' : 'Save'}
                </button>
              </div>
              <p className="text-xs text-zinc-400 truncate">{email}</p>
            </div>
          </div>

          {/* Photo Actions: Upload / Replace / Remove */}
          <div className="flex items-center gap-2 pt-1 border-t border-white/6 text-xs">
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="min-h-[36px] px-3 rounded-lg bg-zinc-900 hover:bg-zinc-800 border border-white/10 text-zinc-200 font-medium flex items-center gap-1.5 transition-colors cursor-pointer active:scale-95"
            >
              <Camera className="w-3.5 h-3.5 text-zinc-400" />
              <span>{avatarPhoto ? 'Replace Photo' : 'Upload Photo'}</span>
            </button>
            {avatarPhoto && (
              <button
                type="button"
                onClick={handleRemovePhoto}
                className="min-h-[36px] px-3 rounded-lg bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 text-red-400 font-medium flex items-center gap-1.5 transition-colors cursor-pointer active:scale-95"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Remove</span>
              </button>
            )}
          </div>
        </div>

        {/* 2. PARTNER PAIRING SECTION (Moved here into Account) */}
        <div className="rounded-2xl bg-black border border-white/8 p-4 space-y-3.5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-white tracking-tight flex items-center gap-1.5">
              <span>Partner Sync & Code</span>
            </span>
            <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded-full bg-zinc-800 border border-white/10 text-zinc-300">
              {isPairedWithSecondAccount ? 'Connected' : 'Single User'}
            </span>
          </div>

          {/* Pairing Status Banner */}
          {pairingStatus === 'connected' && (
            <div className="rounded-xl bg-emerald-500/10 border border-emerald-500/30 p-3 space-y-1.5 text-emerald-300">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-200">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  <span>Partners Linked & In Sync</span>
                </div>
                <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300">
                  Live
                </span>
              </div>
              <p className="text-[11px] text-emerald-400/90 leading-relaxed">
                Health vitals, skincare routines, and fits synchronize in real time across both devices.
              </p>
              {isPairedWithSecondAccount && onUnlinkPartner && (
                <div className="pt-1.5 flex items-center justify-end border-t border-emerald-500/20">
                  <button
                    type="button"
                    onClick={handleUnlink}
                    className="min-h-[36px] px-2.5 rounded-lg text-xs font-semibold text-rose-400 hover:bg-rose-500/15 flex items-center gap-1 transition-colors cursor-pointer active:scale-95"
                  >
                    <Unlink className="w-3.5 h-3.5" />
                    <span>Unlink Partner</span>
                  </button>
                </div>
              )}
            </div>
          )}

          {pairingStatus === 'searching' && (
            <div className="rounded-xl bg-sky-500/10 border border-sky-500/30 p-3 flex items-center gap-2 text-xs text-sky-200 animate-pulse">
              <Radio className="w-4 h-4 animate-spin text-sky-400" />
              <span>Searching for workspace code...</span>
            </div>
          )}

          {pairingStatus === 'connecting' && (
            <div className="rounded-xl bg-indigo-500/10 border border-indigo-500/30 p-3 flex items-center gap-2 text-xs text-indigo-200">
              <Loader2 className="w-4 h-4 animate-spin text-indigo-400" />
              <span>Linking partner account...</span>
            </div>
          )}

          {pairingStatus === 'failed' && (
            <div className="rounded-xl bg-rose-500/10 border border-rose-500/30 p-3 flex items-center gap-2 text-xs text-rose-300">
              <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
              <span>{joinError || 'Unable to connect with that code.'}</span>
            </div>
          )}

          {/* 6-Digit Pairing Code Display */}
          <div className="space-y-1.5">
            <span className="text-[11px] text-zinc-400 font-medium block">
              Your 6-Digit Invite Code (share with partner):
            </span>
            <div className="flex items-center justify-between gap-3 bg-zinc-900 border border-white/10 rounded-xl px-4 py-2.5">
              <span className="text-xl sm:text-2xl font-mono font-semibold tracking-[0.2em] text-white tabular-nums">
                {workspace.pairingCode || '—'}
              </span>
              <button
                type="button"
                onClick={handleCopyCode}
                className="min-h-[44px] px-3.5 rounded-xl bg-white/10 hover:bg-white/15 text-xs font-semibold text-white flex items-center gap-1.5 transition-colors whitespace-nowrap shrink-0 active:scale-95 cursor-pointer"
                aria-label="Copy pairing code"
              >
                {copied ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Copied</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    <span>Copy</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Connect to Another Partner's Code (Requirement 4 Fix) */}
          {onJoinByCode && (
            <form onSubmit={handleJoinSubmit} className="space-y-1.5 pt-1">
              <label className="block text-[11px] text-zinc-300 font-medium">
                Connect to Another Partner’s Code
              </label>
              <div className="flex flex-col min-[340px]:flex-row items-stretch min-[340px]:items-center gap-2 w-full">
                <input
                  type="text"
                  inputMode="numeric"
                  maxLength={6}
                  value={inputCode}
                  onChange={(e) => setInputCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  placeholder="Enter 6-digit code"
                  className="flex-1 min-w-0 h-12 min-h-[48px] bg-zinc-900 border border-white/10 rounded-xl px-3.5 text-base sm:text-sm font-mono tabular-nums text-white placeholder:text-zinc-600 focus:outline-none focus:border-rose-500/60 transition-colors"
                />
                <button
                  type="submit"
                  disabled={
                    pairingStatus === 'searching' ||
                    pairingStatus === 'connecting' ||
                    inputCode.length !== 6
                  }
                  className="h-12 min-h-[48px] w-full min-[340px]:w-[120px] rounded-xl bg-rose-500 hover:bg-rose-600 disabled:opacity-40 text-xs font-semibold text-white flex items-center justify-center gap-1.5 transition-all whitespace-nowrap shrink-0 active:scale-95 cursor-pointer shadow-md shadow-rose-500/20"
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
          )}
        </div>

        {/* 3. Customize Names & Launch Preferences */}
        {onUpdateWorkspaceIdentities && (
          <form onSubmit={handleSaveIdentities} className="rounded-2xl bg-black border border-white/8 p-4 space-y-3.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-white tracking-tight">
                Profile Names & Workspace
              </span>
              {settingsSuccess && (
                <span className="text-[11px] font-mono text-emerald-400 font-medium flex items-center gap-1">
                  <Check className="w-3 h-3" />
                  Saved
                </span>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="rounded-xl bg-zinc-900 border border-white/8 p-3 space-y-2">
                <span className="text-[11px] font-semibold text-zinc-300">Partner 1 Profile</span>
                <div>
                  <label className="block text-[10px] text-zinc-400 mb-1">Display Name</label>
                  <input
                    type="text"
                    maxLength={60}
                    value={partner1Name}
                    onChange={(e) => setPartner1Name(e.target.value)}
                    className="w-full h-11 min-h-[44px] bg-black border border-white/10 rounded-xl px-3 text-sm text-white focus:outline-none focus:border-rose-500/60"
                  />
                </div>
                <div>
                  <label className="block text-[10px] text-zinc-400 mb-1">Dashboard Subtitle</label>
                  <input
                    type="text"
                    maxLength={40}
                    value={partner1Role}
                    onChange={(e) => setPartner1Role(e.target.value)}
                    className="w-full h-11 min-h-[44px] bg-black border border-white/10 rounded-xl px-3 text-xs text-zinc-200 focus:outline-none focus:border-rose-500/60"
                  />
                </div>
              </div>

              <div className="rounded-xl bg-zinc-900 border border-white/8 p-3 space-y-2">
                <span className="text-[11px] font-semibold text-zinc-300">Partner 2 Profile</span>
                <div>
                  <label className="block text-[10px] text-zinc-400 mb-1">Display Name</label>
                  <input
                    type="text"
                    maxLength={60}
                    value={partner2Name}
                    onChange={(e) => setPartner2Name(e.target.value)}
                    className="w-full h-11 min-h-[44px] bg-black border border-white/10 rounded-xl px-3 text-sm text-white focus:outline-none focus:border-rose-500/60"
                  />
                </div>
                <div>
                  <label className="block text-[10px] text-zinc-400 mb-1">Dashboard Subtitle</label>
                  <input
                    type="text"
                    maxLength={40}
                    value={partner2Role}
                    onChange={(e) => setPartner2Role(e.target.value)}
                    className="w-full h-11 min-h-[44px] bg-black border border-white/10 rounded-xl px-3 text-xs text-zinc-200 focus:outline-none focus:border-rose-500/60"
                  />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
              <div>
                <label className="block text-xs text-zinc-400 mb-1.5">Default Dashboard</label>
                <div className="grid grid-cols-2 gap-1.5 p-1 bg-zinc-900 border border-white/10 rounded-xl">
                  <button
                    type="button"
                    onClick={() => setDefaultSlot('partner1')}
                    className={`min-h-[40px] rounded-lg text-xs font-semibold transition-colors truncate px-2 cursor-pointer ${
                      defaultSlot === 'partner1'
                        ? 'bg-zinc-700 text-white shadow-sm'
                        : 'text-zinc-400 hover:text-white'
                    }`}
                  >
                    {partner1Name || 'Partner 1'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setDefaultSlot('partner2')}
                    className={`min-h-[40px] rounded-lg text-xs font-semibold transition-colors truncate px-2 cursor-pointer ${
                      defaultSlot === 'partner2'
                        ? 'bg-zinc-700 text-white shadow-sm'
                        : 'text-zinc-400 hover:text-white'
                    }`}
                  >
                    {partner2Name || 'Partner 2'}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs text-zinc-400 mb-1.5">Workspace Currency</label>
                <div className="grid grid-cols-6 gap-1 p-1 bg-zinc-900 border border-white/10 rounded-xl">
                  {CURRENCY_LIST.map((curr) => (
                    <button
                      key={curr}
                      type="button"
                      disabled={updatingCurrency}
                      onClick={() => handleCurrencyChange(curr)}
                      className={`min-h-[40px] rounded-lg text-xs font-mono font-bold transition-all cursor-pointer ${
                        currency === curr
                          ? 'bg-white text-zinc-950 shadow-sm'
                          : 'text-zinc-400 hover:text-white'
                      }`}
                    >
                      {curr}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <button
              type="submit"
              disabled={savingSettings}
              className="w-full min-h-[48px] h-12 rounded-xl bg-white text-zinc-950 hover:bg-zinc-200 text-xs font-bold transition-all flex items-center justify-center active:scale-95 shadow-md shadow-white/5 cursor-pointer disabled:opacity-40"
            >
              {savingSettings ? 'Saving Settings...' : 'Save Workspace Settings'}
            </button>
          </form>
        )}

        {/* 4. Edit Onboarding Baseline Details Section */}
        <div className="rounded-2xl bg-black border border-white/8 p-4 space-y-3">
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
          <button
            type="button"
            onClick={() => {
              onClose();
              onOpenEditOnboarding();
            }}
            className="w-full min-h-[44px] rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-white/10 text-xs font-semibold text-zinc-200 hover:text-white flex items-center justify-center gap-2 transition-all active:scale-[0.99] cursor-pointer"
          >
            <Sparkles className="w-4 h-4 text-rose-400" />
            <span>Launch Setup Wizard</span>
            <ChevronRight className="w-4 h-4 ml-1 opacity-70" />
          </button>
        </div>

        {/* 5. Preferences & Settings */}
        <div className="rounded-2xl bg-black border border-white/8 p-4 space-y-3">
          <span className="text-xs font-semibold text-white tracking-tight block">
            App Preferences
          </span>

          {/* Theme Indicator */}
          <div className="flex items-center justify-between gap-3 pt-1">
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
              className={`w-11 h-6 rounded-full transition-colors p-0.5 shrink-0 cursor-pointer ${
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

        {/* 6. App Info & Cloud Sync */}
        <div className="rounded-2xl bg-black border border-white/8 p-4 space-y-2.5">
          <div className="flex items-center justify-between text-xs">
            <span className="text-zinc-400 flex items-center gap-1.5">
              <Database className="w-3.5 h-3.5 text-emerald-400" />
              <span>Cloud Storage</span>
            </span>
            <span className="font-mono text-emerald-400 font-medium">Neon PostgreSQL Connected</span>
          </div>

          <div className="flex items-center justify-between text-xs">
            <span className="text-zinc-400">App Version</span>
            <span className="font-mono text-zinc-300">v1.0.0 (DuoSync)</span>
          </div>

          <div className="pt-2 border-t border-white/6 flex items-center justify-between text-xs text-zinc-400">
            <button
              type="button"
              onClick={() => setPolicyModal('privacy')}
              className="hover:text-white transition-colors flex items-center gap-1 cursor-pointer"
            >
              <ShieldCheck className="w-3.5 h-3.5 text-zinc-400" />
              <span>Privacy Policy</span>
            </button>
            <span className="text-zinc-600">·</span>
            <button
              type="button"
              onClick={() => setPolicyModal('terms')}
              className="hover:text-white transition-colors flex items-center gap-1 cursor-pointer"
            >
              <FileText className="w-3.5 h-3.5 text-zinc-400" />
              <span>Terms of Service</span>
            </button>
          </div>
        </div>

        {/* 7. Danger Zone: Wipe Data & Log Out */}
        <div className="space-y-2 pt-1">
          {onDeleteAllUserData && (
            <div className="rounded-2xl bg-red-950/20 border border-red-500/20 p-3.5 space-y-2">
              <div className="text-xs font-semibold text-rose-400">Danger Zone</div>
              <p className="text-[11px] text-zinc-400 leading-relaxed">
                Permanently delete all workspace data, vitals logs, routine completions, and reset your account.
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
                  className={`min-h-[44px] px-4 rounded-xl text-xs font-semibold transition-colors flex items-center gap-1.5 cursor-pointer ${
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
                      ? 'Confirm: Wipe All My Data'
                      : 'Delete All My Data & Reset'}
                  </span>
                </button>
                {confirmDelete && !deletingData && (
                  <button
                    type="button"
                    onClick={() => setConfirmDelete(false)}
                    className="min-h-[44px] px-3 rounded-xl text-xs text-zinc-400 hover:text-white bg-black border border-white/10 cursor-pointer"
                  >
                    Cancel
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Log Out Button */}
          <button
            type="button"
            onClick={() => setShowLogoutConfirm(true)}
            className="w-full min-h-[48px] h-12 rounded-xl bg-red-500/10 hover:bg-red-500/20 border border-red-500/25 text-xs font-semibold text-red-400 hover:text-red-300 flex items-center justify-center gap-2 transition-all active:scale-[0.99] cursor-pointer"
          >
            <LogOut className="w-4 h-4" />
            <span>Log Out</span>
          </button>
        </div>
      </div>

      {/* Logout Confirmation Dialog (Rendered via portal so fixed positioning centers in viewport regardless of scroll) */}
      {showLogoutConfirm &&
        createPortal(
          <div className="fixed inset-0 z-70 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-in fade-in">
            <div className="w-full max-w-sm rounded-3xl bg-[#0A0A0F] border border-red-500/30 p-5 space-y-4 shadow-2xl animate-in fade-in zoom-in-95">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-red-500/15 border border-red-500/30 flex items-center justify-center text-red-400 shrink-0">
                  <AlertTriangle className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-white">Confirm Log Out</h4>
                  <p className="text-xs text-zinc-400 mt-0.5">
                    Are you sure you want to log out of DuoSync?
                  </p>
                </div>
              </div>
              <p className="text-xs text-zinc-400 leading-relaxed bg-black rounded-xl p-3 border border-white/6">
                You will need your login credentials to re-access this shared workspace on this device.
              </p>
              <div className="grid grid-cols-2 gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setShowLogoutConfirm(false)}
                  className="min-h-[44px] rounded-xl bg-white/5 hover:bg-white/10 text-xs font-semibold text-zinc-300 transition-colors cursor-pointer"
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
                  className="min-h-[44px] rounded-xl bg-red-600 hover:bg-red-500 text-xs font-semibold text-white shadow-lg shadow-red-600/30 transition-colors cursor-pointer"
                >
                  Yes, Log Out
                </button>
              </div>
            </div>
          </div>,
          document.body
        )}

      {/* Privacy / Terms Sub-Modal (Rendered via portal so fixed positioning centers in viewport) */}
      {policyModal &&
        createPortal(
          <div className="fixed inset-0 z-70 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-in fade-in">
            <div className="w-full max-w-md rounded-3xl bg-[#0A0A0F] border border-white/10 p-5 space-y-4 shadow-2xl animate-in fade-in zoom-in-95">
              <div className="flex items-center justify-between pb-2 border-b border-white/8">
                <h4 className="text-sm font-bold text-white capitalize">
                  {policyModal === 'privacy' ? 'Privacy Policy' : 'Terms of Service'}
                </h4>
                <button
                  type="button"
                  onClick={() => setPolicyModal(null)}
                  className="w-8 h-8 rounded-full bg-white/5 text-zinc-400 hover:text-white flex items-center justify-center cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
              <div className="text-xs text-zinc-400 leading-relaxed max-h-60 overflow-y-auto space-y-2 pr-1">
                <p>
                  DuoSync stores your shared health vitals, skincare routines, and wardrobe fits in a
                  private encrypted PostgreSQL database hosted on Neon Cloud.
                </p>
                <p>
                  Your data is only accessible to you and your paired partner using your workspace
                  pairing code and encrypted authentication tokens. We do not sell or monetize personal
                  health or care data.
                </p>
                <p>
                  By using DuoSync, you agree to keep your account credentials secure and respect your
                  partner’s shared logs.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setPolicyModal(null)}
                className="w-full min-h-[40px] rounded-xl bg-white/10 hover:bg-white/15 text-xs font-semibold text-white transition-colors cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>,
          document.body
        )}
    </div>
  );
};
