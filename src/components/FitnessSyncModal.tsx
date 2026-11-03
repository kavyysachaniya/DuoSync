import React, { useEffect, useState } from 'react';
import { GoogleAuthProvider, signInWithPopup } from 'firebase/auth';
import {
  Activity,
  Check,
  ClipboardPaste,
  Droplets,
  Footprints,
  Moon,
  RefreshCw,
  Scale,
  Smartphone,
  Sparkles,
  Watch,
  X,
} from 'lucide-react';
import { auth } from '../firebase';
import {
  FITNESS_APP_CATALOG,
  FitnessAppId,
  formatSleepDuration,
  getFitnessAppMeta,
  HealthLogDoc,
  PartnerProfileView,
} from '../types';

interface FitnessSyncModalProps {
  isOpen: boolean;
  onClose: () => void;
  profile: PartnerProfileView;
  selectedDate: string;
  currentLog?: HealthLogDoc;
  onSelectFitnessApp: (appId: FitnessAppId) => Promise<void>;
  onApplySyncedMetrics: (
    date: string,
    metrics: Partial<Pick<HealthLogDoc, 'weight' | 'steps' | 'sleepMinutes' | 'waterMl' | 'note'>>
  ) => Promise<void>;
}

interface GoogleFitAggregateBucket {
  dataset?: Array<{
    dataSourceId?: string;
    point?: Array<{
      startTimeNanos?: string;
      endTimeNanos?: string;
      value?: Array<{
        intVal?: number;
        fpVal?: number;
      }>;
    }>;
  }>;
}

export const FitnessSyncModal: React.FC<FitnessSyncModalProps> = ({
  isOpen,
  onClose,
  profile,
  selectedDate,
  currentLog,
  onSelectFitnessApp,
  onApplySyncedMetrics,
}) => {
  const [selectedApp, setSelectedApp] = useState<FitnessAppId>(profile.fitnessApp || 'google_fit');
  const [savingAppChoice, setSavingAppChoice] = useState(false);

  // Google Fit live sync state
  const [syncingGoogleFit, setSyncingGoogleFit] = useState(false);
  const [syncMessage, setSyncMessage] = useState<string | null>(null);
  const [syncError, setSyncError] = useState<string | null>(null);

  // Quick Batch / Paste Sync fields (works for Apple Health, Samsung Health, Fitbit, Garmin, or manual review)
  const [quickSteps, setQuickSteps] = useState('');
  const [quickWeight, setQuickWeight] = useState('');
  const [quickSleepHours, setQuickSleepHours] = useState('');
  const [quickSleepMins, setQuickSleepMins] = useState('');
  const [quickWaterMl, setQuickWaterMl] = useState('');
  const [smartPasteText, setSmartPasteText] = useState('');
  const [applyingBatch, setApplyingBatch] = useState(false);

  useEffect(() => {
    setSelectedApp(profile.fitnessApp || 'google_fit');
    setQuickSteps(currentLog?.steps ? String(currentLog.steps) : '');
    setQuickWeight(currentLog?.weight ? String(currentLog.weight) : '');
    const mins = currentLog?.sleepMinutes ?? 0;
    setQuickSleepHours(mins > 0 ? String(Math.floor(mins / 60)) : '');
    setQuickSleepMins(mins > 0 ? String(mins % 60) : '');
    setQuickWaterMl(currentLog?.waterMl ? String(currentLog.waterMl) : '');
    setSyncMessage(null);
    setSyncError(null);
  }, [profile.fitnessApp, profile.slot, selectedDate, currentLog, isOpen]);

  if (!isOpen) return null;

  const activeAppMeta = getFitnessAppMeta(selectedApp);

  const handleChooseApp = async (appId: FitnessAppId) => {
    setSelectedApp(appId);
    setSavingAppChoice(true);
    setSyncError(null);
    try {
      await onSelectFitnessApp(appId);
    } catch (err) {
      setSyncError(err instanceof Error ? err.message : 'Failed to save fitness app preference.');
    } finally {
      setSavingAppChoice(false);
    }
  };

  // Direct Google Fit REST API Sync via Google OAuth Scopes
  const handleGoogleFitCloudSync = async () => {
    setSyncingGoogleFit(true);
    setSyncError(null);
    setSyncMessage(null);

    try {
      const fitProvider = new GoogleAuthProvider();
      fitProvider.addScope('https://www.googleapis.com/auth/fitness.activity.read');
      fitProvider.addScope('https://www.googleapis.com/auth/fitness.body.read');
      fitProvider.addScope('https://www.googleapis.com/auth/fitness.sleep.read');
      fitProvider.addScope('https://www.googleapis.com/auth/fitness.nutrition.read');
      fitProvider.setCustomParameters({ prompt: 'consent' });

      const result = await signInWithPopup(auth, fitProvider);
      const credential = GoogleAuthProvider.credentialFromResult(result);
      const accessToken = credential?.accessToken;

      if (!accessToken) {
        throw new Error(
          'Could not retrieve Google Fit access token. Please allow fitness permissions in the popup.'
        );
      }

      // Compute start and end of selectedDate in local timezone
      const [yyyy, mm, dd] = selectedDate.split('-').map(Number);
      const startOfDay = new Date(yyyy, mm - 1, dd, 0, 0, 0, 0).getTime();
      const endOfDay = new Date(yyyy, mm - 1, dd, 23, 59, 59, 999).getTime();

      const response = await fetch(
        'https://www.googleapis.com/fitness/v1/users/me/dataset:aggregate',
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            aggregateBy: [
              { dataTypeName: 'com.google.step_count.delta' },
              { dataTypeName: 'com.google.weight' },
              { dataTypeName: 'com.google.hydration' },
              { dataTypeName: 'com.google.sleep.segment' },
            ],
            bucketByTime: { durationMillis: endOfDay - startOfDay },
            startTimeMillis: startOfDay,
            endTimeMillis: endOfDay,
          }),
        }
      );

      if (!response.ok) {
        const errJson = await response.json().catch(() => ({}));
        const apiMessage =
          errJson?.error?.message ||
          `Google Fitness API returned status ${response.status}. You can also enter or paste your metrics below.`;
        throw new Error(apiMessage);
      }

      const data = (await response.json()) as { bucket?: GoogleFitAggregateBucket[] };
      let fetchedSteps = 0;
      let fetchedWeightKg = 0;
      let fetchedWaterLiters = 0;
      let fetchedSleepMinutes = 0;

      for (const bucket of data.bucket || []) {
        for (const ds of bucket.dataset || []) {
          const sourceId = ds.dataSourceId || '';
          for (const pt of ds.point || []) {
            const firstVal = pt.value?.[0];
            if (sourceId.includes('step_count')) {
              fetchedSteps += firstVal?.intVal ?? Math.round(firstVal?.fpVal ?? 0);
            } else if (sourceId.includes('weight')) {
              const wVal = firstVal?.fpVal ?? firstVal?.intVal ?? 0;
              if (wVal > 0) fetchedWeightKg = wVal;
            } else if (sourceId.includes('hydration')) {
              fetchedWaterLiters += firstVal?.fpVal ?? firstVal?.intVal ?? 0;
            } else if (sourceId.includes('sleep')) {
              if (pt.startTimeNanos && pt.endTimeNanos) {
                const startMs = Number(pt.startTimeNanos) / 1e6;
                const endMs = Number(pt.endTimeNanos) / 1e6;
                if (endMs > startMs) {
                  fetchedSleepMinutes += Math.round((endMs - startMs) / 60000);
                }
              }
            }
          }
        }
      }

      const updates: Partial<
        Pick<HealthLogDoc, 'weight' | 'steps' | 'sleepMinutes' | 'waterMl' | 'note'>
      > = {};

      if (fetchedSteps > 0) {
        updates.steps = fetchedSteps;
        setQuickSteps(String(fetchedSteps));
      }
      if (fetchedWeightKg > 0) {
        const convertedWeight =
          profile.weightUnit === 'lbs'
            ? Math.round(fetchedWeightKg * 2.20462 * 10) / 10
            : Math.round(fetchedWeightKg * 10) / 10;
        updates.weight = convertedWeight;
        setQuickWeight(String(convertedWeight));
      }
      if (fetchedWaterLiters > 0) {
        const ml = Math.round(fetchedWaterLiters * 1000);
        updates.waterMl = ml;
        setQuickWaterMl(String(ml));
      }
      if (fetchedSleepMinutes > 0) {
        updates.sleepMinutes = Math.min(1440, fetchedSleepMinutes);
        setQuickSleepHours(String(Math.floor(updates.sleepMinutes / 60)));
        setQuickSleepMins(String(updates.sleepMinutes % 60));
      }

      if (Object.keys(updates).length === 0) {
        setSyncMessage(
          `Connected to Google Fit for ${selectedDate}. No recorded data points were found in Google Fit for this date yet — you can also enter or paste them below.`
        );
      } else {
        updates.note = `Synced with Google Fit (${selectedDate})`;
        await onApplySyncedMetrics(selectedDate, updates);
        setSyncMessage(
          `Google Fit synced and saved to Firebase for ${selectedDate}!`
        );
      }
    } catch (err) {
      setSyncError(
        err instanceof Error
          ? err.message
          : 'Google Fit sync encountered an error. You can use Quick Sync below.'
      );
    } finally {
      setSyncingGoogleFit(false);
    }
  };

  // Parse pasted summary text from Apple Health / Samsung Health / Fitbit / Garmin
  const handleParseSmartPaste = (text: string) => {
    setSmartPasteText(text);
    if (!text.trim()) return;

    // Extract steps (e.g. "9,420 steps" or "steps: 8500")
    const stepsMatch =
      text.match(/(\d[\d,]{2,6})\s*steps/i) || text.match(/steps\s*[:=-]?\s*(\d[\d,]{2,6})/i);
    if (stepsMatch?.[1]) {
      const cleanSteps = parseInt(stepsMatch[1].replace(/,/g, ''), 10);
      if (!Number.isNaN(cleanSteps) && cleanSteps > 0) {
        setQuickSteps(String(cleanSteps));
      }
    }

    // Extract weight (e.g. "62.4 kg" or "138.5 lbs")
    const weightMatch = text.match(/(\d{2,3}(?:\.\d)?)\s*(?:kg|lbs|lb)/i);
    if (weightMatch?.[1]) {
      setQuickWeight(weightMatch[1]);
    }

    // Extract sleep (e.g. "7h 45m" or "7 hr 30 min")
    const sleepMatch = text.match(/(\d{1,2})\s*(?:h|hr|hrs|hours)\s*(\d{1,2})?\s*(?:m|min|mins)?/i);
    if (sleepMatch?.[1]) {
      setQuickSleepHours(sleepMatch[1]);
      if (sleepMatch[2]) setQuickSleepMins(sleepMatch[2]);
    }

    // Extract water (e.g. "2500 ml" or "2.4 L")
    const waterMlMatch = text.match(/(\d{3,5})\s*ml/i);
    const waterLMatch = text.match(/(\d(?:\.\d{1,2})?)\s*(?:l|liters|litres)\b/i);
    if (waterMlMatch?.[1]) {
      setQuickWaterMl(waterMlMatch[1]);
    } else if (waterLMatch?.[1]) {
      setQuickWaterMl(String(Math.round(parseFloat(waterLMatch[1]) * 1000)));
    }
  };

  const handleSaveBatchSync = async (e: React.FormEvent) => {
    e.preventDefault();
    setApplyingBatch(true);
    setSyncError(null);
    setSyncMessage(null);
    try {
      const updates: Partial<
        Pick<HealthLogDoc, 'weight' | 'steps' | 'sleepMinutes' | 'waterMl' | 'note'>
      > = {};

      if (quickWeight.trim() !== '') {
        const w = parseFloat(quickWeight);
        if (!Number.isNaN(w) && w >= 0 && w <= 500) {
          updates.weight = Math.round(w * 10) / 10;
        }
      }
      if (quickSteps.trim() !== '') {
        const s = parseInt(quickSteps.replace(/,/g, ''), 10);
        if (!Number.isNaN(s) && s >= 0 && s <= 200000) {
          updates.steps = s;
        }
      }
      if (quickSleepHours.trim() !== '' || quickSleepMins.trim() !== '') {
        const h = parseInt(quickSleepHours || '0', 10) || 0;
        const m = parseInt(quickSleepMins || '0', 10) || 0;
        updates.sleepMinutes = Math.max(0, Math.min(1440, h * 60 + m));
      }
      if (quickWaterMl.trim() !== '') {
        const wt = parseInt(quickWaterMl, 10);
        if (!Number.isNaN(wt) && wt >= 0 && wt <= 20000) {
          updates.waterMl = wt;
        }
      }

      updates.note = `Synced from ${activeAppMeta.name} (${selectedDate})`;

      await onApplySyncedMetrics(selectedDate, updates);
      setSyncMessage(`All ${activeAppMeta.name} metrics saved to Firebase for ${selectedDate}!`);
      setTimeout(() => {
        onClose();
      }, 900);
    } catch (err) {
      setSyncError(err instanceof Error ? err.message : 'Failed to save synced metrics.');
    } finally {
      setApplyingBatch(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/80 backdrop-blur-sm p-0 sm:p-4">
      <div className="w-full sm:max-w-lg max-h-[92vh] overflow-y-auto rounded-t-3xl sm:rounded-3xl bg-[#12141C] border border-white/10 p-5 sm:p-6 text-zinc-100 shadow-2xl space-y-5">
        {/* Mobile Bottom Sheet Handle */}
        <div className="w-10 h-1.5 bg-zinc-700 rounded-full mx-auto sm:hidden" />

        {/* Header */}
        <div className="flex items-center justify-between border-b border-white/10 pb-4">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
              <Watch className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white">
                Fitness App Sync · {profile.name}
              </h2>
              <p className="text-xs text-zinc-400">
                Choose your preferred fitness tracker & sync {selectedDate}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="min-w-[44px] min-h-[44px] rounded-xl flex items-center justify-center text-zinc-400 hover:text-white hover:bg-white/5"
            aria-label="Close Fitness Sync Modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* 1. Choose Preferred Fitness App (Saved to Firebase) */}
        <div className="space-y-2.5">
          <div className="flex items-center justify-between">
            <label className="text-xs font-semibold text-zinc-300 flex items-center gap-1.5">
              <Smartphone className="w-3.5 h-3.5 text-emerald-400" />
              <span>1. Select Connected Fitness App</span>
            </label>
            {savingAppChoice && (
              <span className="text-[11px] text-emerald-400 font-mono">Saving to Cloud...</span>
            )}
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {FITNESS_APP_CATALOG.map((app) => {
              const isSelected = selectedApp === app.id;
              return (
                <button
                  key={app.id}
                  type="button"
                  onClick={() => handleChooseApp(app.id)}
                  className={`min-h-[60px] p-3 rounded-2xl border text-left transition-all flex flex-col justify-between ${
                    isSelected
                      ? 'bg-zinc-900 border-white text-white shadow-md'
                      : 'bg-[#090A0F] border-white/8 text-zinc-400 hover:border-white/20 hover:text-zinc-200'
                  }`}
                >
                  <div className="flex items-center justify-between gap-1">
                    <span className="text-xs font-bold truncate">{app.shortLabel}</span>
                    {isSelected && <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0" />}
                  </div>
                  <span className="text-[10px] text-zinc-500 truncate">{app.ecosystem}</span>
                </button>
              );
            })}
          </div>
          <p className="text-xs text-zinc-400 leading-relaxed">{activeAppMeta.description}</p>
        </div>

        {/* 2. Direct Google Fit Cloud Sync (When Google Fit is chosen) */}
        {selectedApp === 'google_fit' && (
          <div className="rounded-2xl bg-emerald-500/10 border border-emerald-500/25 p-4 space-y-3">
            <div className="flex items-start justify-between gap-3">
              <div className="space-y-1">
                <div className="text-xs font-semibold text-emerald-300 flex items-center gap-1.5">
                  <Activity className="w-3.5 h-3.5" />
                  <span>Google Fit Cloud Auto-Sync</span>
                </div>
                <p className="text-xs text-zinc-300 leading-relaxed">
                  Connect your Google account with Fitness permissions to pull Steps, Weight, Sleep, and Hydration for <span className="font-mono text-white">{selectedDate}</span>.
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={handleGoogleFitCloudSync}
              disabled={syncingGoogleFit}
              className="w-full min-h-[46px] rounded-xl bg-emerald-500 hover:bg-emerald-600 text-zinc-950 font-semibold text-xs sm:text-sm flex items-center justify-center gap-2 transition-colors shadow-lg shadow-emerald-500/10"
            >
              <RefreshCw className={`w-4 h-4 ${syncingGoogleFit ? 'animate-spin' : ''}`} />
              <span>
                {syncingGoogleFit
                  ? 'Syncing from Google Fit API...'
                  : `Sync Now from Google Fit (${selectedDate})`}
              </span>
            </button>
          </div>
        )}

        {/* 3. Universal Smart Paste & One-Tap Batch Sync for Any Fitness App */}
        <form onSubmit={handleSaveBatchSync} className="space-y-4 pt-1 border-t border-white/10">
          <div className="space-y-2">
            <label className="text-xs font-semibold text-zinc-300 flex items-center gap-1.5">
              <ClipboardPaste className="w-3.5 h-3.5 text-sky-400" />
              <span>
                Quick Import from {activeAppMeta.name} ({selectedDate})
              </span>
            </label>
            <textarea
              rows={2}
              value={smartPasteText}
              onChange={(e) => handleParseSmartPaste(e.target.value)}
              placeholder={`Optional: Paste summary from ${activeAppMeta.name} (e.g. "9,450 steps, 62.4 kg, 7h 45m sleep, 2500 ml") to auto-fill below...`}
              className="w-full bg-[#090A0F] border border-white/10 rounded-xl p-3 text-xs text-white placeholder:text-zinc-600 focus:outline-none focus:border-sky-400"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            {/* Weight */}
            <div className="rounded-2xl bg-[#090A0F] border border-white/8 p-3 space-y-1.5">
              <label className="text-[11px] font-medium text-rose-400 flex items-center gap-1">
                <Scale className="w-3.5 h-3.5" />
                <span>Weight ({profile.weightUnit})</span>
              </label>
              <input
                type="number"
                step="0.1"
                min="0"
                max="500"
                value={quickWeight}
                onChange={(e) => setQuickWeight(e.target.value)}
                placeholder={`e.g. ${profile.targetWeight}`}
                className="w-full min-h-[42px] bg-[#12141C] border border-white/10 rounded-xl px-3 text-sm font-mono tabular-nums text-white"
              />
            </div>

            {/* Steps */}
            <div className="rounded-2xl bg-[#090A0F] border border-white/8 p-3 space-y-1.5">
              <label className="text-[11px] font-medium text-emerald-400 flex items-center gap-1">
                <Footprints className="w-3.5 h-3.5" />
                <span>EOD Steps</span>
              </label>
              <input
                type="number"
                inputMode="numeric"
                min="0"
                max="200000"
                value={quickSteps}
                onChange={(e) => setQuickSteps(e.target.value)}
                placeholder="e.g. 9420"
                className="w-full min-h-[42px] bg-[#12141C] border border-white/10 rounded-xl px-3 text-sm font-mono tabular-nums text-white"
              />
            </div>

            {/* Sleep */}
            <div className="rounded-2xl bg-[#090A0F] border border-white/8 p-3 space-y-1.5">
              <label className="text-[11px] font-medium text-indigo-400 flex items-center gap-1">
                <Moon className="w-3.5 h-3.5" />
                <span>
                  Sleep (
                  {formatSleepDuration(
                    (parseInt(quickSleepHours || '0', 10) || 0) * 60 +
                      (parseInt(quickSleepMins || '0', 10) || 0)
                  )}
                  )
                </span>
              </label>
              <div className="grid grid-cols-2 gap-1.5">
                <input
                  type="number"
                  min="0"
                  max="24"
                  value={quickSleepHours}
                  onChange={(e) => setQuickSleepHours(e.target.value)}
                  placeholder="Hrs"
                  className="w-full min-h-[42px] bg-[#12141C] border border-white/10 rounded-xl px-2.5 text-sm font-mono tabular-nums text-white"
                />
                <input
                  type="number"
                  min="0"
                  max="59"
                  value={quickSleepMins}
                  onChange={(e) => setQuickSleepMins(e.target.value)}
                  placeholder="Min"
                  className="w-full min-h-[42px] bg-[#12141C] border border-white/10 rounded-xl px-2.5 text-sm font-mono tabular-nums text-white"
                />
              </div>
            </div>

            {/* Water */}
            <div className="rounded-2xl bg-[#090A0F] border border-white/8 p-3 space-y-1.5">
              <label className="text-[11px] font-medium text-sky-400 flex items-center gap-1">
                <Droplets className="w-3.5 h-3.5" />
                <span>Water (ml)</span>
              </label>
              <input
                type="number"
                inputMode="numeric"
                min="0"
                max="20000"
                value={quickWaterMl}
                onChange={(e) => setQuickWaterMl(e.target.value)}
                placeholder="e.g. 2500"
                className="w-full min-h-[42px] bg-[#12141C] border border-white/10 rounded-xl px-3 text-sm font-mono tabular-nums text-white"
              />
            </div>
          </div>

          {syncMessage && (
            <div className="rounded-xl bg-emerald-500/15 border border-emerald-500/30 p-3 text-xs text-emerald-300 flex items-center gap-2">
              <Sparkles className="w-4 h-4 shrink-0" />
              <span>{syncMessage}</span>
            </div>
          )}

          {syncError && (
            <div className="rounded-xl bg-rose-500/15 border border-rose-500/30 p-3 text-xs text-rose-300">
              {syncError}
            </div>
          )}

          <div className="flex items-center justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="min-h-[44px] px-4 rounded-xl bg-white/5 hover:bg-white/10 text-xs font-medium text-zinc-300"
            >
              Close
            </button>
            <button
              type="submit"
              disabled={applyingBatch}
              className="min-h-[44px] px-5 rounded-xl bg-white text-zinc-950 hover:bg-zinc-200 text-xs font-semibold flex items-center gap-1.5"
            >
              <Check className="w-4 h-4" />
              <span>{applyingBatch ? 'Saving...' : `Save ${activeAppMeta.shortLabel} Metrics`}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
