import React, { useEffect, useState } from 'react';
import {
  Activity,
  Calendar,
  Check,
  Droplets,
  Footprints,
  Moon,
  RefreshCw,
  Scale,
  SlidersHorizontal,
  Sparkles,
  TrendingDown,
  TrendingUp,
  Watch,
  X,
} from 'lucide-react';
import {
  FITNESS_APP_CATALOG,
  FitnessAppId,
  formatSleepDuration,
  getFitnessAppMeta,
  getLastNDates,
  HealthLogDoc,
  PartnerProfileView,
} from '../types';
import { CircularProgressRing } from './CircularProgressRing';

interface HealthDashboardProps {
  profile: PartnerProfileView;
  partnerProfile: PartnerProfileView;
  selectedDate: string;
  todayDate: string;
  onSelectDate: (date: string) => void;
  logsByDate: Record<string, HealthLogDoc>;
  partnerTodayLog?: HealthLogDoc;
  onSaveHealthLog: (
    date: string,
    updates: Partial<Pick<HealthLogDoc, 'weight' | 'steps' | 'sleepMinutes' | 'waterMl' | 'note'>>
  ) => Promise<void>;
  onUpdateProfileGoals: (goals: {
    name: string;
    role: string;
    weightUnit: 'kg' | 'lbs';
    targetWeight: number;
    startWeight: number;
    stepsGoal: number;
    sleepGoalMinutes: number;
    waterGoalMl: number;
    fitnessApp: FitnessAppId;
  }) => Promise<void>;
  onSwitchToPartner: () => void;
  onOpenFitnessSync?: () => void;
}

function calculateWeightProgress(
  currentWeight: number,
  startWeight: number,
  targetWeight: number
): number {
  if (!currentWeight || currentWeight <= 0) return 0;
  if (!targetWeight || targetWeight <= 0) return 100;
  if (Math.abs(currentWeight - targetWeight) < 0.05) return 100;

  const totalDelta = Math.abs(startWeight - targetWeight);
  if (totalDelta < 0.1) {
    const ratio = 1 - Math.abs(currentWeight - targetWeight) / targetWeight;
    return Math.max(10, Math.min(100, Math.round(ratio * 100)));
  }

  // Weight loss goal
  if (targetWeight < startWeight) {
    if (currentWeight <= targetWeight) return 100;
    if (currentWeight >= startWeight) {
      const ratio = targetWeight / currentWeight;
      return Math.max(12, Math.min(95, Math.round(ratio * 85)));
    }
    const progressed = startWeight - currentWeight;
    return Math.max(15, Math.min(100, Math.round((progressed / totalDelta) * 100)));
  }

  // Weight gain goal
  if (currentWeight >= targetWeight) return 100;
  if (currentWeight <= startWeight) {
    const ratio = currentWeight / targetWeight;
    return Math.max(12, Math.min(95, Math.round(ratio * 85)));
  }
  const progressed = currentWeight - startWeight;
  return Math.max(15, Math.min(100, Math.round((progressed / totalDelta) * 100)));
}

export const HealthDashboard: React.FC<HealthDashboardProps> = ({
  profile,
  partnerProfile,
  selectedDate,
  todayDate,
  onSelectDate,
  logsByDate,
  partnerTodayLog,
  onSaveHealthLog,
  onUpdateProfileGoals,
  onSwitchToPartner,
  onOpenFitnessSync,
}) => {
  const currentLog = logsByDate[selectedDate];
  const todayLog = logsByDate[todayDate];
  const activeFitnessAppMeta = getFitnessAppMeta(profile.fitnessApp);

  // Local controlled inputs synced with selectedDate's log
  const [weightInput, setWeightInput] = useState<string>('');
  const [stepsInput, setStepsInput] = useState<string>('');
  const [sleepHoursInput, setSleepHoursInput] = useState<string>('');
  const [sleepMinsInput, setSleepMinsInput] = useState<string>('');
  const [waterInput, setWaterInput] = useState<string>('');
  const [noteInput, setNoteInput] = useState<string>('');

  const [savingField, setSavingField] = useState<string | null>(null);
  const [savedToast, setSavedToast] = useState<string | null>(null);

  // Goals customization drawer state
  const [isGoalsOpen, setIsGoalsOpen] = useState(false);
  const [goalName, setGoalName] = useState(profile.name);
  const [goalRole, setGoalRole] = useState(profile.role);
  const [goalWeightUnit, setGoalWeightUnit] = useState<'kg' | 'lbs'>(profile.weightUnit);
  const [goalTargetWeight, setGoalTargetWeight] = useState(String(profile.targetWeight));
  const [goalStartWeight, setGoalStartWeight] = useState(String(profile.startWeight));
  const [goalSteps, setGoalSteps] = useState(String(profile.stepsGoal));
  const [goalSleepHours, setGoalSleepHours] = useState(
    String(Math.floor(profile.sleepGoalMinutes / 60))
  );
  const [goalSleepMins, setGoalSleepMins] = useState(
    String(profile.sleepGoalMinutes % 60)
  );
  const [goalWaterMl, setGoalWaterMl] = useState(String(profile.waterGoalMl));
  const [goalFitnessApp, setGoalFitnessApp] = useState<FitnessAppId>(
    profile.fitnessApp || 'google_fit'
  );

  useEffect(() => {
    setWeightInput(currentLog?.weight ? String(currentLog.weight) : '');
    setStepsInput(currentLog?.steps ? String(currentLog.steps) : '');
    const mins = currentLog?.sleepMinutes ?? 0;
    setSleepHoursInput(mins > 0 ? String(Math.floor(mins / 60)) : '');
    setSleepMinsInput(mins > 0 ? String(mins % 60) : '');
    setWaterInput(currentLog?.waterMl ? String(currentLog.waterMl) : '');
    setNoteInput(currentLog?.note ?? '');
  }, [
    selectedDate,
    profile.slot,
    currentLog?.weight,
    currentLog?.steps,
    currentLog?.sleepMinutes,
    currentLog?.waterMl,
    currentLog?.note,
  ]);

  useEffect(() => {
    setGoalName(profile.name);
    setGoalRole(profile.role);
    setGoalWeightUnit(profile.weightUnit);
    setGoalTargetWeight(String(profile.targetWeight));
    setGoalStartWeight(String(profile.startWeight));
    setGoalSteps(String(profile.stepsGoal));
    setGoalSleepHours(String(Math.floor(profile.sleepGoalMinutes / 60)));
    setGoalSleepMins(String(profile.sleepGoalMinutes % 60));
    setGoalWaterMl(String(profile.waterGoalMl));
    setGoalFitnessApp(profile.fitnessApp || 'google_fit');
  }, [profile]);

  const showSavedFeedback = (label: string) => {
    setSavedToast(label);
    setTimeout(() => {
      setSavedToast((prev) => (prev === label ? null : prev));
    }, 1800);
  };

  // Date strip: last 10 days ending Today
  const dateStrip = getLastNDates(10, todayDate);
  // 7-day trend window ending on selectedDate
  const sevenDayDates = getLastNDates(7, selectedDate);

  // Selected day values & percentages
  const loggedWeight = currentLog?.weight ?? 0;
  const loggedSteps = currentLog?.steps ?? 0;
  const loggedSleepMinutes = currentLog?.sleepMinutes ?? 0;
  const loggedWaterMl = currentLog?.waterMl ?? 0;

  const weightPct = calculateWeightProgress(
    loggedWeight,
    profile.startWeight,
    profile.targetWeight
  );
  const stepsPct =
    profile.stepsGoal > 0 ? Math.min(100, Math.round((loggedSteps / profile.stepsGoal) * 100)) : 0;
  const sleepPct =
    profile.sleepGoalMinutes > 0
      ? Math.min(100, Math.round((loggedSleepMinutes / profile.sleepGoalMinutes) * 100))
      : 0;
  const waterPct =
    profile.waterGoalMl > 0
      ? Math.min(100, Math.round((loggedWaterMl / profile.waterGoalMl) * 100))
      : 0;

  // Today's ring percentages (always available even when browsing past dates)
  const todayWeightPct = calculateWeightProgress(
    todayLog?.weight ?? 0,
    profile.startWeight,
    profile.targetWeight
  );
  const todayStepsPct =
    profile.stepsGoal > 0
      ? Math.min(100, Math.round(((todayLog?.steps ?? 0) / profile.stepsGoal) * 100))
      : 0;
  const todaySleepPct =
    profile.sleepGoalMinutes > 0
      ? Math.min(100, Math.round(((todayLog?.sleepMinutes ?? 0) / profile.sleepGoalMinutes) * 100))
      : 0;
  const todayWaterPct =
    profile.waterGoalMl > 0
      ? Math.min(100, Math.round(((todayLog?.waterMl ?? 0) / profile.waterGoalMl) * 100))
      : 0;

  // Handlers
  const handleSaveWeight = async (customVal?: number) => {
    const val = customVal !== undefined ? customVal : parseFloat(weightInput);
    if (Number.isNaN(val) || val < 0 || val > 500) return;
    const rounded = Math.round(val * 10) / 10;
    setWeightInput(String(rounded));
    setSavingField('weight');
    try {
      await onSaveHealthLog(selectedDate, { weight: rounded });
      showSavedFeedback('Weight saved to Cloud');
    } finally {
      setSavingField(null);
    }
  };

  const handleSaveSteps = async (e: React.FormEvent) => {
    e.preventDefault();
    const val = parseInt(stepsInput.replace(/,/g, ''), 10);
    const cleanSteps = Number.isNaN(val) ? 0 : Math.max(0, Math.min(200000, val));
    setStepsInput(String(cleanSteps));
    setSavingField('steps');
    try {
      await onSaveHealthLog(selectedDate, { steps: cleanSteps });
      showSavedFeedback('Steps saved to Cloud');
    } finally {
      setSavingField(null);
    }
  };

  const handleSaveSleep = async (overrideTotalMinutes?: number) => {
    let totalMins = overrideTotalMinutes;
    if (totalMins === undefined) {
      const hrs = parseInt(sleepHoursInput || '0', 10);
      const mins = parseInt(sleepMinsInput || '0', 10);
      totalMins =
        (Number.isNaN(hrs) ? 0 : Math.max(0, Math.min(24, hrs))) * 60 +
        (Number.isNaN(mins) ? 0 : Math.max(0, Math.min(59, mins)));
    }
    const clamped = Math.max(0, Math.min(1440, totalMins));
    setSleepHoursInput(String(Math.floor(clamped / 60)));
    setSleepMinsInput(String(clamped % 60));
    setSavingField('sleep');
    try {
      await onSaveHealthLog(selectedDate, { sleepMinutes: clamped });
      showSavedFeedback('Sleep saved to Cloud');
    } finally {
      setSavingField(null);
    }
  };

  const handleSaveWater = async (overrideWaterMl?: number) => {
    const raw = overrideWaterMl !== undefined ? overrideWaterMl : parseInt(waterInput || '0', 10);
    const cleanMl = Number.isNaN(raw) ? 0 : Math.max(0, Math.min(20000, raw));
    setWaterInput(String(cleanMl));
    setSavingField('water');
    try {
      await onSaveHealthLog(selectedDate, { waterMl: cleanMl });
      showSavedFeedback('Water saved to Cloud');
    } finally {
      setSavingField(null);
    }
  };

  const handleSaveNote = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingField('note');
    try {
      await onSaveHealthLog(selectedDate, { note: noteInput.slice(0, 280) });
      showSavedFeedback('Daily note saved');
    } finally {
      setSavingField(null);
    }
  };

  const handleSaveGoalsSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingField('goals');
    try {
      const targetW = Math.max(0, Math.min(500, parseFloat(goalTargetWeight) || 55));
      const startW = Math.max(0, Math.min(500, parseFloat(goalStartWeight) || targetW));
      const stepsG = Math.max(100, Math.min(100000, parseInt(goalSteps, 10) || 8000));
      const sleepH = Math.max(1, Math.min(24, parseInt(goalSleepHours, 10) || 8));
      const sleepM = Math.max(0, Math.min(59, parseInt(goalSleepMins, 10) || 0));
      const waterG = Math.max(250, Math.min(15000, parseInt(goalWaterMl, 10) || 2500));

      await onUpdateProfileGoals({
        name: goalName.trim() || profile.name,
        role: goalRole.trim() || profile.role,
        weightUnit: goalWeightUnit,
        targetWeight: Math.round(targetW * 10) / 10,
        startWeight: Math.round(startW * 10) / 10,
        stepsGoal: stepsG,
        sleepGoalMinutes: Math.min(1440, sleepH * 60 + sleepM),
        waterGoalMl: waterG,
        fitnessApp: goalFitnessApp,
      });
      setIsGoalsOpen(false);
      showSavedFeedback('Targets saved to Cloud');
    } finally {
      setSavingField(null);
    }
  };

  // Compute 7-day weight delta
  const loggedWeightsIn7d = sevenDayDates
    .map((d) => logsByDate[d]?.weight ?? 0)
    .filter((w) => w > 0);
  const weightDelta7d =
    loggedWeightsIn7d.length >= 2
      ? Math.round((loggedWeightsIn7d[loggedWeightsIn7d.length - 1] - loggedWeightsIn7d[0]) * 10) /
        10
      : null;

  return (
    <div className="space-y-4 sm:space-y-6 pb-24 sm:pb-12">
      {/* Top Mobile-First Profile Banner & Fitness App Sync Bar */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3.5 rounded-3xl bg-[#12141C] border border-white/8 p-4 sm:p-5">
        <div className="space-y-1">
          <div className="flex items-center flex-wrap gap-1.5 text-xs text-zinc-400">
            <span className="font-medium text-rose-400">{profile.role}</span>
            <span aria-hidden="true">·</span>
            <span>
              {selectedDate === todayDate ? 'Today’s Live Vitals' : `Log Date: ${selectedDate}`}
            </span>
            <span aria-hidden="true">·</span>
            <span className="text-emerald-400 font-medium">
              {activeFitnessAppMeta.shortLabel}
            </span>
            {savedToast && (
              <>
                <span aria-hidden="true">·</span>
                <span className="text-emerald-300 font-semibold flex items-center gap-1">
                  <Check className="w-3.5 h-3.5" />
                  {savedToast}
                </span>
              </>
            )}
          </div>
          <h1 className="text-xl sm:text-3xl font-bold tracking-tight text-white">
            {profile.name}’s Daily Health
          </h1>
          <p className="text-xs text-zinc-400">
            All health vitals auto-save to Firebase Cloud in real time
          </p>
        </div>

        {/* Mobile-First Action Row */}
        <div className="grid grid-cols-2 sm:flex sm:flex-wrap items-center gap-2">
          {/* Customize Targets Button */}
          <button
            type="button"
            onClick={() => setIsGoalsOpen(true)}
            className="min-h-[44px] px-3.5 py-2 rounded-2xl bg-white/8 hover:bg-white/12 border border-white/10 text-xs font-medium text-white flex items-center justify-center gap-2 transition-colors whitespace-nowrap"
          >
            <SlidersHorizontal className="w-3.5 h-3.5 text-rose-400 shrink-0" />
            <span className="truncate">Targets & Profile</span>
          </button>

          {/* Quick Partner Glance / Switch Button (Full width on mobile below the 2 buttons) */}
          <button
            type="button"
            onClick={onSwitchToPartner}
            className="col-span-2 sm:col-span-1 min-h-[44px] px-3.5 py-2 rounded-2xl bg-zinc-900 hover:bg-zinc-800/90 border border-white/10 text-left flex items-center justify-between sm:justify-start gap-3 transition-colors"
          >
            <div className="flex items-center gap-2.5">
              <div className="w-7 h-7 rounded-xl bg-white/5 flex items-center justify-center text-xs font-bold text-zinc-200 shrink-0">
                {partnerProfile.name.slice(0, 1).toUpperCase()}
              </div>
              <div>
                <div className="text-xs font-medium text-white">
                  Switch to {partnerProfile.name}
                </div>
                <div className="text-[11px] font-mono tabular-nums text-zinc-400">
                  Today:{' '}
                  {partnerTodayLog?.steps
                    ? `${partnerTodayLog.steps.toLocaleString()} steps`
                    : 'No steps yet'}{' '}
                  ·{' '}
                  {partnerTodayLog?.waterMl
                    ? `${(partnerTodayLog.waterMl / 1000).toFixed(1)}L`
                    : '0L'}
                </div>
              </div>
            </div>
          </button>
        </div>
      </div>

      {/* Horizontal Date Selector Scroller + Today's Live Circular Rings Strip */}
      <div className="rounded-3xl bg-[#12141C] border border-white/8 p-4 sm:p-5 space-y-4">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 text-xs font-medium text-zinc-300">
            <Calendar className="w-4 h-4 text-zinc-400" />
            <span>Select Log Date</span>
          </div>
          {selectedDate !== todayDate && (
            <button
              type="button"
              onClick={() => onSelectDate(todayDate)}
              className="min-h-[34px] px-3 py-1 rounded-xl bg-rose-500/15 border border-rose-500/30 text-xs font-medium text-rose-300 hover:bg-rose-500/25 transition-colors whitespace-nowrap"
            >
              Jump to Today
            </button>
          )}
        </div>

        <div className="flex items-center gap-1.5 sm:gap-2 overflow-x-auto no-scrollbar pb-1 -mx-1 px-1">
          {dateStrip.map((dateStr) => {
            const d = new Date(`${dateStr}T12:00:00`);
            const dayName = d.toLocaleDateString('en-US', { weekday: 'short' });
            const dayNum = d.getDate();
            const isSelected = dateStr === selectedDate;
            const isToday = dateStr === todayDate;
            const log = logsByDate[dateStr];
            const hasData =
              Boolean(log) &&
              (log.weight > 0 || log.steps > 0 || log.sleepMinutes > 0 || log.waterMl > 0);

            return (
              <button
                key={dateStr}
                type="button"
                onClick={() => onSelectDate(dateStr)}
                className={`min-w-[52px] min-h-[62px] rounded-2xl px-2 py-2 flex flex-col items-center justify-center transition-all shrink-0 border ${
                  isSelected
                    ? 'bg-white text-zinc-950 border-white shadow-lg shadow-white/5 font-semibold'
                    : 'bg-zinc-900/70 text-zinc-400 border-white/6 hover:border-white/15 hover:text-zinc-200'
                }`}
              >
                <span className="text-[10px] uppercase tracking-wider opacity-75">
                  {isToday ? 'Today' : dayName}
                </span>
                <span className="text-base font-mono tabular-nums font-bold mt-0.5">{dayNum}</span>
                <span
                  className={`mt-0.5 text-[9px] font-mono ${
                    isSelected
                      ? 'text-zinc-800'
                      : hasData
                      ? 'text-emerald-400'
                      : 'text-transparent'
                  }`}
                >
                  {hasData ? '●' : '·'}
                </span>
              </button>
            );
          })}
        </div>

        {/* Today's Live 4-Ring Overview Bar */}
        <div className="pt-3 border-t border-white/8 flex flex-col sm:flex-row sm:items-center justify-between gap-3.5">
          <div className="space-y-0.5">
            <div className="text-xs font-semibold text-white flex items-center gap-1.5">
              <Activity className="w-3.5 h-3.5 text-rose-400" />
              <span>
                {selectedDate === todayDate
                  ? 'Today’s Circular Progress Rings'
                  : `Today’s Live Rings (${todayDate})`}
              </span>
            </div>
            <p className="text-[11px] text-zinc-400">
              Tap any ring card below or sync with {activeFitnessAppMeta.shortLabel}
            </p>
          </div>

          <div className="grid grid-cols-4 gap-2 sm:gap-5">
            <CircularProgressRing
              percentage={todayWeightPct}
              size={60}
              strokeWidth={6}
              color="#F43F5E"
              label="Weight"
              sublabel={
                todayLog?.weight ? `${todayLog.weight}${profile.weightUnit}` : '—'
              }
            >
              <Scale className="w-3.5 h-3.5 text-rose-400" />
            </CircularProgressRing>

            <CircularProgressRing
              percentage={todayStepsPct}
              size={60}
              strokeWidth={6}
              color="#10B981"
              label="Steps"
              sublabel={`${todayStepsPct}%`}
            >
              <Footprints className="w-3.5 h-3.5 text-emerald-400" />
            </CircularProgressRing>

            <CircularProgressRing
              percentage={todaySleepPct}
              size={60}
              strokeWidth={6}
              color="#818CF8"
              label="Sleep"
              sublabel={`${todaySleepPct}%`}
            >
              <Moon className="w-3.5 h-3.5 text-indigo-400" />
            </CircularProgressRing>

            <CircularProgressRing
              percentage={todayWaterPct}
              size={60}
              strokeWidth={6}
              color="#38BDF8"
              label="Water"
              sublabel={`${todayWaterPct}%`}
            >
              <Droplets className="w-3.5 h-3.5 text-sky-400" />
            </CircularProgressRing>
          </div>
        </div>
      </div>

      {/* Main 4 Circular Progress Vitals Cards (Single Column on Mobile, 2x2 on Desktop) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-5">
        {/* 1. DAILY WEIGHT TRACKER CARD */}
        <section className="rounded-3xl bg-[#12141C] border border-white/8 p-4 sm:p-6 flex flex-col justify-between space-y-4">
          <div className="flex items-start justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2 text-xs text-rose-400 font-medium">
                <Scale className="w-4 h-4" />
                <span>Daily Weight Tracker</span>
              </div>
              <h2 className="text-lg sm:text-xl font-bold text-white">Body Weight</h2>
              <p className="text-xs text-zinc-400 font-mono tabular-nums">
                Start: {profile.startWeight} {profile.weightUnit} · Goal: {profile.targetWeight}{' '}
                {profile.weightUnit}
                {weightDelta7d !== null && (
                  <>
                    {' '}
                    · 7d:{' '}
                    <span className={weightDelta7d <= 0 ? 'text-emerald-400' : 'text-rose-400'}>
                      {weightDelta7d > 0 ? `+${weightDelta7d}` : weightDelta7d} {profile.weightUnit}
                    </span>
                  </>
                )}
              </p>
            </div>

            {weightDelta7d !== null && (
              <div className="text-xs font-mono tabular-nums text-zinc-400 flex items-center gap-1">
                {weightDelta7d <= 0 ? (
                  <TrendingDown className="w-4 h-4 text-emerald-400" />
                ) : (
                  <TrendingUp className="w-4 h-4 text-rose-400" />
                )}
              </div>
            )}
          </div>

          {/* Center Circular Progress Indicator + Metrics */}
          <div className="flex flex-col sm:flex-row items-center gap-4 sm:gap-6 py-1">
            <CircularProgressRing
              percentage={weightPct}
              size={124}
              strokeWidth={10}
              color="#F43F5E"
            >
              <span className="text-2xl font-bold font-mono tabular-nums text-white">
                {loggedWeight > 0 ? loggedWeight.toFixed(1) : '—'}
              </span>
              <span className="text-[11px] font-mono text-zinc-400">
                {profile.weightUnit}
              </span>
            </CircularProgressRing>

            <div className="flex-1 w-full space-y-2.5">
              <div className="flex items-center justify-between text-xs text-zinc-400">
                <span>Log Weight ({selectedDate})</span>
                <span className="font-mono tabular-nums text-rose-400">{weightPct}% to goal</span>
              </div>

              <div className="flex items-center gap-1.5 sm:gap-2">
                <button
                  type="button"
                  onClick={() => {
                    const base = loggedWeight || profile.startWeight || profile.targetWeight || 55;
                    handleSaveWeight(Math.max(1, Math.round((base - 0.1) * 10) / 10));
                  }}
                  className="min-w-[44px] min-h-[44px] rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-white/10 text-xs sm:text-sm font-mono font-semibold text-zinc-200 transition-colors"
                  title="Decrease by 0.1"
                >
                  -0.1
                </button>
                <div className="relative flex-1">
                  <input
                    type="number"
                    step="0.1"
                    min="0"
                    max="500"
                    value={weightInput}
                    onChange={(e) => setWeightInput(e.target.value)}
                    placeholder={`e.g. ${profile.targetWeight}`}
                    className="w-full min-h-[44px] bg-[#090A0F] border border-white/10 rounded-xl pl-3 pr-9 text-sm font-mono tabular-nums text-white placeholder:text-zinc-600 focus:outline-none focus:border-rose-500/60"
                  />
                  <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs font-mono text-zinc-500">
                    {profile.weightUnit}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    const base = loggedWeight || profile.startWeight || profile.targetWeight || 55;
                    handleSaveWeight(Math.min(500, Math.round((base + 0.1) * 10) / 10));
                  }}
                  className="min-w-[44px] min-h-[44px] rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-white/10 text-xs sm:text-sm font-mono font-semibold text-zinc-200 transition-colors"
                  title="Increase by 0.1"
                >
                  +0.1
                </button>
                <button
                  type="button"
                  onClick={() => handleSaveWeight()}
                  disabled={savingField === 'weight'}
                  className="min-h-[44px] px-4 rounded-xl bg-rose-500 hover:bg-rose-600 text-xs font-semibold text-white transition-colors whitespace-nowrap shrink-0"
                >
                  Save
                </button>
              </div>
            </div>
          </div>

          {/* 7-Day Weight Trend Sparkline */}
          <div className="pt-3 border-t border-white/6 space-y-2">
            <div className="flex items-center justify-between text-[11px] text-zinc-400">
              <span>7-Day Weight Trend</span>
              <span className="font-mono tabular-nums">Target: {profile.targetWeight} {profile.weightUnit}</span>
            </div>
            <div className="grid grid-cols-7 gap-1.5 items-end h-16 pt-2">
              {sevenDayDates.map((dStr) => {
                const w = logsByDate[dStr]?.weight ?? 0;
                const dayLabel = new Date(`${dStr}T12:00:00`).toLocaleDateString('en-US', {
                  weekday: 'narrow',
                });
                const isSelected = dStr === selectedDate;
                const barPct = w > 0 ? calculateWeightProgress(w, profile.startWeight, profile.targetWeight) : 8;
                return (
                  <button
                    key={dStr}
                    type="button"
                    onClick={() => onSelectDate(dStr)}
                    className="flex flex-col items-center gap-1 group h-full justify-end"
                  >
                    <span className="text-[9px] font-mono tabular-nums text-zinc-400">
                      {w > 0 ? w.toFixed(1) : '—'}
                    </span>
                    <div className="w-full bg-zinc-900 rounded-md h-8 flex items-end overflow-hidden p-0.5">
                      <div
                        className={`w-full rounded-sm transition-all ${
                          isSelected
                            ? 'bg-rose-500'
                            : w > 0
                            ? 'bg-rose-500/45 group-hover:bg-rose-500/70'
                            : 'bg-zinc-800'
                        }`}
                        style={{ height: `${Math.max(15, barPct)}%` }}
                      />
                    </div>
                    <span
                      className={`text-[10px] font-mono ${
                        isSelected ? 'text-white font-bold' : 'text-zinc-500'
                      }`}
                    >
                      {dayLabel}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        </section>

        {/* 2. DAILY STEPS TRACKER CARD (End-of-Day Real Number Input + Fitness Sync) */}
        <section className="rounded-3xl bg-[#12141C] border border-white/8 p-4 sm:p-6 flex flex-col justify-between space-y-4">
          <div className="flex items-start justify-between gap-3">
            <div className="space-y-1">
              <div className="flex items-center gap-2 text-xs text-emerald-400 font-medium">
                <Footprints className="w-4 h-4" />
                <span>End-of-Day Steps · {activeFitnessAppMeta.shortLabel}</span>
              </div>
              <h2 className="text-lg sm:text-xl font-bold text-white">Daily Step Count</h2>
              <p className="text-xs text-zinc-400 font-mono tabular-nums">
                Goal: {profile.stepsGoal.toLocaleString()} · Left:{' '}
                {Math.max(0, profile.stepsGoal - loggedSteps).toLocaleString()}
              </p>
            </div>

            <button
              type="button"
              onClick={onOpenFitnessSync}
              className="min-h-[36px] px-3 rounded-xl bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-500/30 text-[11px] font-semibold text-emerald-300 flex items-center gap-1.5 shrink-0"
            >
              <Watch className="w-3.5 h-3.5" />
              <span>Sync App</span>
            </button>
          </div>

          <div className="flex flex-col sm:flex-row items-center gap-4 sm:gap-6 py-1">
            <CircularProgressRing
              percentage={stepsPct}
              size={124}
              strokeWidth={10}
              color="#10B981"
            >
              <span className="text-xl font-bold font-mono tabular-nums text-white">
                {loggedSteps > 0 ? loggedSteps.toLocaleString() : '0'}
              </span>
              <span className="text-[11px] font-mono text-emerald-400">{stepsPct}%</span>
            </CircularProgressRing>

            <form onSubmit={handleSaveSteps} className="flex-1 w-full space-y-2.5">
              <div className="flex items-center justify-between text-xs text-zinc-400">
                <span>End-of-Day Exact Step Input</span>
                <span className="font-mono tabular-nums text-emerald-400">
                  {loggedSteps.toLocaleString()} / {profile.stepsGoal.toLocaleString()}
                </span>
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="number"
                  inputMode="numeric"
                  min="0"
                  max="200000"
                  value={stepsInput}
                  onChange={(e) => setStepsInput(e.target.value)}
                  placeholder="Enter total steps (e.g. 9420)"
                  className="flex-1 min-h-[44px] bg-[#090A0F] border border-white/10 rounded-xl px-3.5 text-sm font-mono tabular-nums text-white placeholder:text-zinc-600 focus:outline-none focus:border-emerald-500/60"
                />
                <button
                  type="submit"
                  disabled={savingField === 'steps'}
                  className="min-h-[44px] px-4 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-xs font-semibold text-zinc-950 transition-colors whitespace-nowrap shrink-0"
                >
                  Log Steps
                </button>
              </div>
              <p className="text-[11px] text-zinc-400">
                Enter your end-of-day step number or tap <strong className="text-zinc-200">Sync App</strong> for {activeFitnessAppMeta.shortLabel}.
              </p>
            </form>
          </div>

          {/* 7-Day Steps Trend */}
          <div className="pt-3 border-t border-white/6 space-y-2">
            <div className="flex items-center justify-between text-[11px] text-zinc-400">
              <span>7-Day Step History</span>
              <span className="font-mono tabular-nums">
                Goal: {profile.stepsGoal.toLocaleString()}
              </span>
            </div>
            <div className="grid grid-cols-7 gap-1.5 items-end h-16 pt-2">
              {sevenDayDates.map((dStr) => {
                const st = logsByDate[dStr]?.steps ?? 0;
                const pct =
                  profile.stepsGoal > 0 ? Math.min(100, Math.round((st / profile.stepsGoal) * 100)) : 0;
                const dayLabel = new Date(`${dStr}T12:00:00`).toLocaleDateString('en-US', {
                  weekday: 'narrow',
                });
                const isSelected = dStr === selectedDate;
                return (
                  <button
                    key={dStr}
                    type="button"
                    onClick={() => onSelectDate(dStr)}
                    className="flex flex-col items-center gap-1 group h-full justify-end"
                  >
                    <span className="text-[9px] font-mono tabular-nums text-zinc-400">
                      {st > 0 ? `${(st / 1000).toFixed(1)}k` : '—'}
                    </span>
                    <div className="w-full bg-zinc-900 rounded-md h-8 flex items-end overflow-hidden p-0.5">
                      <div
                        className={`w-full rounded-sm transition-all ${
                          isSelected
                            ? 'bg-emerald-500'
                            : st > 0
                            ? 'bg-emerald-500/45 group-hover:bg-emerald-500/70'
                            : 'bg-zinc-800'
                        }`}
                        style={{ height: `${Math.max(12, pct)}%` }}
                      />
                    </div>
                    <span
                      className={`text-[10px] font-mono ${
                        isSelected ? 'text-white font-bold' : 'text-zinc-500'
                      }`}
                    >
                      {dayLabel}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        </section>

        {/* 3. DAILY TOTAL SLEEP TRACKER CARD */}
        <section className="rounded-3xl bg-[#12141C] border border-white/8 p-4 sm:p-6 flex flex-col justify-between space-y-4">
          <div className="flex items-start justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2 text-xs text-indigo-400 font-medium">
                <Moon className="w-4 h-4" />
                <span>Daily Total Sleep Tracker</span>
              </div>
              <h2 className="text-lg sm:text-xl font-bold text-white">Sleep Duration</h2>
              <p className="text-xs text-zinc-400 font-mono tabular-nums">
                Daily Goal: {formatSleepDuration(profile.sleepGoalMinutes)} · Logged:{' '}
                {formatSleepDuration(loggedSleepMinutes)}
              </p>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-center gap-4 sm:gap-6 py-1">
            <CircularProgressRing
              percentage={sleepPct}
              size={124}
              strokeWidth={10}
              color="#818CF8"
            >
              <span className="text-xl font-bold font-mono tabular-nums text-white">
                {formatSleepDuration(loggedSleepMinutes)}
              </span>
              <span className="text-[11px] font-mono text-indigo-400">{sleepPct}%</span>
            </CircularProgressRing>

            <div className="flex-1 w-full space-y-2.5">
              <div className="flex items-center justify-between text-xs text-zinc-400">
                <span>Hours & Minutes Slept</span>
                <span className="font-mono tabular-nums text-indigo-400">
                  Target {formatSleepDuration(profile.sleepGoalMinutes)}
                </span>
              </div>

              <div className="flex items-center gap-2">
                <div className="relative flex-1">
                  <input
                    type="number"
                    min="0"
                    max="24"
                    value={sleepHoursInput}
                    onChange={(e) => setSleepHoursInput(e.target.value)}
                    placeholder="8"
                    className="w-full min-h-[44px] bg-[#090A0F] border border-white/10 rounded-xl pl-3.5 pr-9 text-sm font-mono tabular-nums text-white placeholder:text-zinc-600 focus:outline-none focus:border-indigo-500/60"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-mono text-zinc-500">
                    hr
                  </span>
                </div>
                <div className="relative flex-1">
                  <input
                    type="number"
                    min="0"
                    max="59"
                    value={sleepMinsInput}
                    onChange={(e) => setSleepMinsInput(e.target.value)}
                    placeholder="00"
                    className="w-full min-h-[44px] bg-[#090A0F] border border-white/10 rounded-xl pl-3.5 pr-11 text-sm font-mono tabular-nums text-white placeholder:text-zinc-600 focus:outline-none focus:border-indigo-500/60"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-mono text-zinc-500">
                    min
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => handleSaveSleep()}
                  disabled={savingField === 'sleep'}
                  className="min-h-[44px] px-4 rounded-xl bg-indigo-500 hover:bg-indigo-600 text-xs font-semibold text-white transition-colors whitespace-nowrap shrink-0"
                >
                  Save
                </button>
              </div>

              {/* Quick Duration Presets */}
              <div className="grid grid-cols-5 gap-1.5">
                {[390, 420, 450, 480, 510].map((presetMins) => (
                  <button
                    key={presetMins}
                    type="button"
                    onClick={() => handleSaveSleep(presetMins)}
                    className="min-h-[34px] rounded-lg bg-zinc-900 hover:bg-zinc-800 border border-white/8 text-[11px] font-mono tabular-nums text-zinc-300 transition-colors"
                  >
                    {formatSleepDuration(presetMins)}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* 7-Day Sleep Trend */}
          <div className="pt-3 border-t border-white/6 space-y-2">
            <div className="flex items-center justify-between text-[11px] text-zinc-400">
              <span>7-Day Sleep History</span>
              <span className="font-mono tabular-nums">
                Goal: {formatSleepDuration(profile.sleepGoalMinutes)}
              </span>
            </div>
            <div className="grid grid-cols-7 gap-1.5 items-end h-16 pt-2">
              {sevenDayDates.map((dStr) => {
                const sl = logsByDate[dStr]?.sleepMinutes ?? 0;
                const pct =
                  profile.sleepGoalMinutes > 0
                    ? Math.min(100, Math.round((sl / profile.sleepGoalMinutes) * 100))
                    : 0;
                const dayLabel = new Date(`${dStr}T12:00:00`).toLocaleDateString('en-US', {
                  weekday: 'narrow',
                });
                const isSelected = dStr === selectedDate;
                return (
                  <button
                    key={dStr}
                    type="button"
                    onClick={() => onSelectDate(dStr)}
                    className="flex flex-col items-center gap-1 group h-full justify-end"
                  >
                    <span className="text-[9px] font-mono tabular-nums text-zinc-400">
                      {sl > 0 ? `${(sl / 60).toFixed(1)}h` : '—'}
                    </span>
                    <div className="w-full bg-zinc-900 rounded-md h-8 flex items-end overflow-hidden p-0.5">
                      <div
                        className={`w-full rounded-sm transition-all ${
                          isSelected
                            ? 'bg-indigo-400'
                            : sl > 0
                            ? 'bg-indigo-400/45 group-hover:bg-indigo-400/70'
                            : 'bg-zinc-800'
                        }`}
                        style={{ height: `${Math.max(12, pct)}%` }}
                      />
                    </div>
                    <span
                      className={`text-[10px] font-mono ${
                        isSelected ? 'text-white font-bold' : 'text-zinc-500'
                      }`}
                    >
                      {dayLabel}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        </section>

        {/* 4. DAILY WATER INTAKE TRACKER CARD */}
        <section className="rounded-3xl bg-[#12141C] border border-white/8 p-4 sm:p-6 flex flex-col justify-between space-y-4">
          <div className="flex items-start justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2 text-xs text-sky-400 font-medium">
                <Droplets className="w-4 h-4" />
                <span>Daily Water Intake Tracker</span>
              </div>
              <h2 className="text-lg sm:text-xl font-bold text-white">Hydration</h2>
              <p className="text-xs text-zinc-400 font-mono tabular-nums">
                Daily Goal: {profile.waterGoalMl.toLocaleString()} ml (
                {(profile.waterGoalMl / 1000).toFixed(2)} L)
              </p>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-center gap-4 sm:gap-6 py-1">
            <CircularProgressRing
              percentage={waterPct}
              size={124}
              strokeWidth={10}
              color="#38BDF8"
            >
              <span className="text-xl font-bold font-mono tabular-nums text-white">
                {(loggedWaterMl / 1000).toFixed(2)}L
              </span>
              <span className="text-[11px] font-mono text-sky-400">
                {loggedWaterMl} ml
              </span>
            </CircularProgressRing>

            <div className="flex-1 w-full space-y-2.5">
              <div className="flex items-center justify-between text-xs text-zinc-400">
                <span>Quick Add or Direct Input</span>
                <span className="font-mono tabular-nums text-sky-400">{waterPct}%</span>
              </div>

              <div className="flex items-center gap-2">
                <div className="relative flex-1">
                  <input
                    type="number"
                    inputMode="numeric"
                    min="0"
                    max="20000"
                    value={waterInput}
                    onChange={(e) => setWaterInput(e.target.value)}
                    placeholder={`e.g. ${profile.waterGoalMl}`}
                    className="w-full min-h-[44px] bg-[#090A0F] border border-white/10 rounded-xl pl-3.5 pr-10 text-sm font-mono tabular-nums text-white placeholder:text-zinc-600 focus:outline-none focus:border-sky-500/60"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-mono text-zinc-500">
                    ml
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => handleSaveWater()}
                  disabled={savingField === 'water'}
                  className="min-h-[44px] px-4 rounded-xl bg-sky-400 hover:bg-sky-500 text-xs font-semibold text-zinc-950 transition-colors whitespace-nowrap shrink-0"
                >
                  Save
                </button>
              </div>

              {/* One-tap Hydration Buttons */}
              <div className="grid grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => handleSaveWater(Math.max(0, loggedWaterMl - 250))}
                  className="min-h-[40px] rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-white/8 text-xs font-mono font-medium text-zinc-300 transition-colors"
                >
                  -250 ml
                </button>
                <button
                  type="button"
                  onClick={() => handleSaveWater(loggedWaterMl + 250)}
                  className="min-h-[40px] rounded-xl bg-sky-500/15 hover:bg-sky-500/25 border border-sky-500/30 text-xs font-mono font-medium text-sky-300 transition-colors"
                >
                  +250 ml
                </button>
                <button
                  type="button"
                  onClick={() => handleSaveWater(loggedWaterMl + 500)}
                  className="min-h-[40px] rounded-xl bg-sky-500/15 hover:bg-sky-500/25 border border-sky-500/30 text-xs font-mono font-medium text-sky-300 transition-colors"
                >
                  +500 ml
                </button>
              </div>
            </div>
          </div>

          {/* 7-Day Hydration Trend */}
          <div className="pt-3 border-t border-white/6 space-y-2">
            <div className="flex items-center justify-between text-[11px] text-zinc-400">
              <span>7-Day Hydration History</span>
              <span className="font-mono tabular-nums">
                Goal: {(profile.waterGoalMl / 1000).toFixed(1)}L
              </span>
            </div>
            <div className="grid grid-cols-7 gap-1.5 items-end h-16 pt-2">
              {sevenDayDates.map((dStr) => {
                const wt = logsByDate[dStr]?.waterMl ?? 0;
                const pct =
                  profile.waterGoalMl > 0
                    ? Math.min(100, Math.round((wt / profile.waterGoalMl) * 100))
                    : 0;
                const dayLabel = new Date(`${dStr}T12:00:00`).toLocaleDateString('en-US', {
                  weekday: 'narrow',
                });
                const isSelected = dStr === selectedDate;
                return (
                  <button
                    key={dStr}
                    type="button"
                    onClick={() => onSelectDate(dStr)}
                    className="flex flex-col items-center gap-1 group h-full justify-end"
                  >
                    <span className="text-[9px] font-mono tabular-nums text-zinc-400">
                      {wt > 0 ? `${(wt / 1000).toFixed(1)}L` : '—'}
                    </span>
                    <div className="w-full bg-zinc-900 rounded-md h-8 flex items-end overflow-hidden p-0.5">
                      <div
                        className={`w-full rounded-sm transition-all ${
                          isSelected
                            ? 'bg-sky-400'
                            : wt > 0
                            ? 'bg-sky-400/45 group-hover:bg-sky-400/70'
                            : 'bg-zinc-800'
                        }`}
                        style={{ height: `${Math.max(12, pct)}%` }}
                      />
                    </div>
                    <span
                      className={`text-[10px] font-mono ${
                        isSelected ? 'text-white font-bold' : 'text-zinc-500'
                      }`}
                    >
                      {dayLabel}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        </section>
      </div>

      {/* Daily Wellness Note Bar */}
      <form
        onSubmit={handleSaveNote}
        className="rounded-3xl bg-[#12141C] border border-white/8 p-4 sm:p-5 flex flex-col sm:flex-row items-stretch sm:items-center gap-3"
      >
        <div className="flex items-center gap-2 text-xs font-medium text-zinc-300 shrink-0">
          <Sparkles className="w-4 h-4 text-amber-400" />
          <span>Daily Log Note ({selectedDate}):</span>
        </div>
        <input
          type="text"
          maxLength={280}
          value={noteInput}
          onChange={(e) => setNoteInput(e.target.value)}
          placeholder="Add a note for today (e.g. Evening walk together, post-workout weigh-in)..."
          className="flex-1 min-h-[44px] bg-[#090A0F] border border-white/10 rounded-xl px-3.5 text-sm text-white placeholder:text-zinc-600 focus:outline-none focus:border-amber-400/60"
        />
        <button
          type="submit"
          disabled={savingField === 'note'}
          className="min-h-[44px] px-5 rounded-xl bg-white/10 hover:bg-white/15 text-xs font-semibold text-white transition-colors whitespace-nowrap shrink-0"
        >
          {savingField === 'note' ? 'Saving...' : 'Save Note'}
        </button>
      </form>

      {/* Customize Daily Targets & Fitness App Modal / Sheet */}
      {isGoalsOpen && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/75 backdrop-blur-sm p-0 sm:p-4">
          <div className="w-full sm:max-w-md max-h-[90vh] overflow-y-auto rounded-t-3xl sm:rounded-3xl bg-[#12141C] border border-white/10 p-5 sm:p-6 text-zinc-100 shadow-2xl">
            <div className="w-10 h-1.5 bg-zinc-700 rounded-full mx-auto mb-4 sm:hidden" />

            <div className="flex items-center justify-between pb-4 border-b border-white/10">
              <div>
                <h3 className="text-base font-semibold text-white">
                  Customize {profile.name}’s Targets & App
                </h3>
                <p className="text-xs text-zinc-400">
                  Saved to Firebase Cloud for all connected devices
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsGoalsOpen(false)}
                className="min-w-[44px] min-h-[44px] rounded-xl flex items-center justify-center text-zinc-400 hover:text-white hover:bg-white/5"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveGoalsSubmit} className="space-y-4 pt-4">
              <div>
                <label className="block text-xs text-zinc-400 mb-1.5">
                  Connected Fitness App
                </label>
                <div className="grid grid-cols-3 gap-1.5">
                  {FITNESS_APP_CATALOG.map((app) => (
                    <button
                      key={app.id}
                      type="button"
                      onClick={() => setGoalFitnessApp(app.id)}
                      className={`min-h-[38px] px-2 rounded-xl text-[11px] font-semibold border transition-colors ${
                        goalFitnessApp === app.id
                          ? 'bg-emerald-500 text-zinc-950 border-emerald-400'
                          : 'bg-[#090A0F] text-zinc-400 border-white/8 hover:text-white'
                      }`}
                    >
                      {app.shortLabel}
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-zinc-400 mb-1">Profile Name</label>
                  <input
                    type="text"
                    maxLength={60}
                    value={goalName}
                    onChange={(e) => setGoalName(e.target.value)}
                    className="w-full min-h-[42px] bg-[#090A0F] border border-white/10 rounded-xl px-3 text-sm text-white"
                  />
                </div>
                <div>
                  <label className="block text-xs text-zinc-400 mb-1">Weight Unit</label>
                  <div className="grid grid-cols-2 gap-1 p-1 bg-[#090A0F] border border-white/10 rounded-xl">
                    {(['kg', 'lbs'] as const).map((u) => (
                      <button
                        key={u}
                        type="button"
                        onClick={() => setGoalWeightUnit(u)}
                        className={`min-h-[34px] rounded-lg text-xs font-mono font-semibold ${
                          goalWeightUnit === u
                            ? 'bg-rose-500 text-white'
                            : 'text-zinc-400 hover:text-white'
                        }`}
                      >
                        {u}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-zinc-400 mb-1">
                    Starting Weight ({goalWeightUnit})
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    min="0"
                    max="500"
                    value={goalStartWeight}
                    onChange={(e) => setGoalStartWeight(e.target.value)}
                    className="w-full min-h-[42px] bg-[#090A0F] border border-white/10 rounded-xl px-3 text-sm font-mono tabular-nums text-white"
                  />
                </div>
                <div>
                  <label className="block text-xs text-zinc-400 mb-1">
                    Target Weight ({goalWeightUnit})
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    min="0"
                    max="500"
                    value={goalTargetWeight}
                    onChange={(e) => setGoalTargetWeight(e.target.value)}
                    className="w-full min-h-[42px] bg-[#090A0F] border border-white/10 rounded-xl px-3 text-sm font-mono tabular-nums text-white"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs text-zinc-400 mb-1">Daily Steps Target</label>
                <input
                  type="number"
                  min="100"
                  max="100000"
                  value={goalSteps}
                  onChange={(e) => setGoalSteps(e.target.value)}
                  className="w-full min-h-[42px] bg-[#090A0F] border border-white/10 rounded-xl px-3 text-sm font-mono tabular-nums text-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-zinc-400 mb-1">Sleep Target (Hours)</label>
                  <input
                    type="number"
                    min="1"
                    max="24"
                    value={goalSleepHours}
                    onChange={(e) => setGoalSleepHours(e.target.value)}
                    className="w-full min-h-[42px] bg-[#090A0F] border border-white/10 rounded-xl px-3 text-sm font-mono tabular-nums text-white"
                  />
                </div>
                <div>
                  <label className="block text-xs text-zinc-400 mb-1">Sleep Target (Minutes)</label>
                  <input
                    type="number"
                    min="0"
                    max="59"
                    value={goalSleepMins}
                    onChange={(e) => setGoalSleepMins(e.target.value)}
                    className="w-full min-h-[42px] bg-[#090A0F] border border-white/10 rounded-xl px-3 text-sm font-mono tabular-nums text-white"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs text-zinc-400 mb-1">
                  Daily Water Target (ml)
                </label>
                <input
                  type="number"
                  min="250"
                  max="15000"
                  step="50"
                  value={goalWaterMl}
                  onChange={(e) => setGoalWaterMl(e.target.value)}
                  className="w-full min-h-[42px] bg-[#090A0F] border border-white/10 rounded-xl px-3 text-sm font-mono tabular-nums text-white"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsGoalsOpen(false)}
                  className="min-h-[44px] px-4 rounded-xl bg-white/5 hover:bg-white/10 text-xs font-medium text-zinc-300"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingField === 'goals'}
                  className="min-h-[44px] px-5 rounded-xl bg-white text-zinc-950 hover:bg-zinc-200 text-xs font-semibold"
                >
                  {savingField === 'goals' ? 'Saving...' : 'Save Targets'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
