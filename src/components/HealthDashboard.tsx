import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Activity,
  Calendar,
  Check,
  Droplets,
  Footprints,
  Moon,
  Scale,
  SlidersHorizontal,
  Sparkles,
  TrendingDown,
  TrendingUp,
  X,
} from 'lucide-react';
import {
  FitnessAppId,
  formatLocalDate,
  formatSleepDuration,
  getLastNDates,
  HealthLogDoc,
  PartnerProfileView,
} from '../types';
import { CircularProgressRing } from './CircularProgressRing';
import { DuoDatePicker } from './ui/DuoDatePicker';

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
}) => {
  const currentLog = logsByDate[selectedDate];

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
  }, [profile]);

  const showSavedFeedback = (label: string) => {
    setSavedToast(label);
    setTimeout(() => {
      setSavedToast((prev) => (prev === label ? null : prev));
    }, 1800);
  };

  // 5-day strip centered on today: [today-2, today-1, TODAY, today+1, today+2]
  const dateStrip = useMemo(() => {
    const base = new Date(`${todayDate}T12:00:00`);
    return [-2, -1, 0, 1, 2].map((offset) => {
      const d = new Date(base);
      d.setDate(base.getDate() + offset);
      return formatLocalDate(d);
    });
  }, [todayDate]);

  // Selected date formatted: e.g. "Nov 20" (format: MMM d)
  const selectedDateDisplay = useMemo(() => {
    if (!selectedDate) return '';
    const d = new Date(`${selectedDate}T12:00:00`);
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  }, [selectedDate]);

  const selectedPillRef = useRef<HTMLButtonElement | null>(null);

  // Auto-scroll / snap into center when screen opens or selected day changes
  useEffect(() => {
    if (selectedPillRef.current) {
      selectedPillRef.current.scrollIntoView({
        behavior: 'smooth',
        inline: 'center',
        block: 'nearest',
      });
    }
  }, [selectedDate]);

  // Smooth scroll helper for tapping rings
  const scrollToCard = (cardId: string) => {
    const el = document.getElementById(cardId);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

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

  // Handlers
  const handleSaveWeight = async (customVal?: number) => {
    const val = customVal !== undefined ? customVal : parseFloat(weightInput);
    if (Number.isNaN(val) || val < 0 || val > 500) return;
    const rounded = Math.round(val * 10) / 10;
    setWeightInput(String(rounded));
    setSavingField('weight');
    try {
      await onSaveHealthLog(selectedDate, { weight: rounded });
      showSavedFeedback('Weight saved');
    } finally {
      setSavingField(null);
    }
  };

  const handleSaveSteps = async (e?: React.FormEvent | number, overrideSteps?: number) => {
    if (e && typeof e === 'object' && 'preventDefault' in e) {
      e.preventDefault();
    }
    const targetVal = typeof e === 'number' ? e : overrideSteps;
    const cleanSteps =
      targetVal !== undefined
        ? Math.max(0, Math.min(200000, targetVal))
        : (() => {
            const val = parseInt(stepsInput.replace(/,/g, ''), 10);
            return Number.isNaN(val) ? 0 : Math.max(0, Math.min(200000, val));
          })();
    setStepsInput(String(cleanSteps));
    setSavingField('steps');
    try {
      await onSaveHealthLog(selectedDate, { steps: cleanSteps });
      showSavedFeedback('Steps saved');
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
      showSavedFeedback('Sleep saved');
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
      showSavedFeedback('Water saved');
    } finally {
      setSavingField(null);
    }
  };

  const handleSaveNote = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingField('note');
    try {
      await onSaveHealthLog(selectedDate, { note: noteInput.slice(0, 280) });
      showSavedFeedback('Note saved');
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
        fitnessApp: 'manual',
      });
      setIsGoalsOpen(false);
      showSavedFeedback('Targets saved');
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
    <div className="health-dashboard-root space-y-4" data-scroll-snap>
      {/* ══════════════════════════════════════════════════════════════════════
          SCREEN 1: TOP CARD + SECOND CARD (DATE STRIP + 2x2 RINGS)
          Fills 100dvh minus header, top card, and floating bottom nav with NO peeking!
          ══════════════════════════════════════════════════════════════════════ */}
      <div
        className="snap-start flex flex-col gap-2.5 sm:gap-3 scroll-mt-[68px] sm:scroll-mt-[76px] h-[calc(100dvh-9.75rem-env(safe-area-inset-bottom,0px))] sm:h-[calc(100dvh-7.5rem)]"
      >
        {/* 1. TOP CARD ("Kavy's Dashboard") */}
        <div className="shrink-0 rounded-3xl bg-[#12141C] border border-white/8 p-3 sm:p-3.5 space-y-1.5">
          <div className="flex items-center justify-between gap-2">
            <div className="space-y-0.5 min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <h1 className="text-lg sm:text-2xl font-bold tracking-tight text-white leading-tight truncate">
                  {profile.name}’s Daily Health
                </h1>
                {savedToast && (
                  <span className="text-[11px] font-mono text-emerald-400 font-semibold flex items-center gap-1 bg-emerald-500/10 px-2 py-0.5 rounded-full shrink-0">
                    <Check className="w-3 h-3" />
                    {savedToast}
                  </span>
                )}
              </div>
              <p className="text-[11px] sm:text-xs text-zinc-400 truncate">
                Track and sync your daily vitals in real time
              </p>
            </div>
          </div>

          {/* Single Row: Left 60%, Right 40% with 12px gap */}
          <div className="flex items-center gap-3 w-full pt-0.5">
            {/* Left: Switch to Partner (60% / flex: 6) */}
            <button
              type="button"
              onClick={onSwitchToPartner}
              style={{ flex: 6 }}
              className="h-12 min-h-[48px] px-3 rounded-2xl bg-zinc-900 hover:bg-zinc-800/90 border border-white/10 text-left flex items-center gap-2.5 transition-colors overflow-hidden active:scale-95 cursor-pointer"
            >
              <div className="w-7 h-7 rounded-xl bg-white/5 flex items-center justify-center text-xs font-bold text-zinc-200 shrink-0">
                {partnerProfile.name.slice(0, 1).toUpperCase()}
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-xs font-medium text-white truncate">
                  Switch to {partnerProfile.name}
                </div>
                <div className="text-[10px] font-mono tabular-nums text-zinc-400 truncate">
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
            </button>

            {/* Right: Targets (40% / flex: 4) */}
            <button
              type="button"
              onClick={() => setIsGoalsOpen(true)}
              style={{ flex: 4 }}
              className="h-12 min-h-[48px] px-3 rounded-2xl bg-white/8 hover:bg-white/12 border border-white/10 text-xs font-semibold text-white flex items-center justify-center gap-2 transition-colors overflow-hidden active:scale-95 cursor-pointer"
            >
              <SlidersHorizontal className="w-4 h-4 text-rose-400 shrink-0" />
              <span className="truncate">Targets</span>
            </button>
          </div>
        </div>

        {/* 2. SECOND CARD (date strip + 2x2 progress rings) */}
        <div className="flex-1 min-h-0 rounded-3xl bg-[#12141C] border border-white/8 p-3 sm:p-4 flex flex-col justify-between overflow-hidden">
          {/* Compact Date Header */}
          <div className="shrink-0 flex items-center justify-between gap-2 pb-2">
            <div className="flex items-center gap-2 min-w-0 flex-1">
              <Calendar className="w-4 h-4 text-rose-400 shrink-0" />
              <span className="text-sm sm:text-base font-semibold text-white whitespace-nowrap min-w-0">
                {selectedDateDisplay}
              </span>
              {selectedDate === todayDate && (
                <span className="text-[10px] font-semibold tracking-wider uppercase px-2 py-0.5 rounded-full bg-rose-500/15 border border-rose-500/30 text-rose-300 shrink-0">
                  Today
                </span>
              )}
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <DuoDatePicker
                value={selectedDate}
                onChange={(val) => {
                  if (val) onSelectDate(val);
                }}
                align="right"
                iconOnly
              />
              {selectedDate !== todayDate && (
                <button
                  type="button"
                  onClick={() => onSelectDate(todayDate)}
                  className="min-h-[34px] px-2.5 sm:px-3 py-1 rounded-xl bg-rose-500/15 border border-rose-500/30 text-xs font-medium text-rose-300 hover:bg-rose-500/25 transition-colors whitespace-nowrap active:scale-95"
                >
                  Today
                </button>
              )}
            </div>
          </div>

          {/* Compact 5-Day Strip */}
          <div className="shrink-0 flex items-center justify-start sm:justify-center gap-1.5 sm:gap-2 overflow-x-auto no-scrollbar scroll-smooth snap-x pb-2 -mx-1 px-1">
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
                  ref={isSelected ? selectedPillRef : null}
                  type="button"
                  onClick={() => onSelectDate(dateStr)}
                  className={`snap-center flex-1 min-w-[52px] max-w-[76px] min-h-[58px] sm:min-h-[62px] rounded-2xl px-1.5 py-1.5 flex flex-col items-center justify-center transition-all shrink-0 border active:scale-95 cursor-pointer ${
                    isSelected
                      ? 'bg-white text-zinc-950 border-white shadow-lg shadow-white/10 font-bold'
                      : isToday
                      ? 'bg-rose-500/10 text-rose-200 border-rose-500/30 hover:border-rose-500/50 hover:bg-rose-500/20'
                      : 'bg-zinc-900/70 text-zinc-400 border-white/6 hover:border-white/15 hover:text-zinc-200'
                  }`}
                >
                  <span
                    className={`text-[9px] uppercase tracking-wider font-semibold ${
                      isSelected ? 'opacity-80' : isToday ? 'text-rose-300' : 'opacity-70'
                    }`}
                  >
                    {isToday ? 'Today' : dayName}
                  </span>
                  <span className="text-sm sm:text-base font-mono tabular-nums font-bold leading-tight mt-0.5">
                    {dayNum}
                  </span>
                  <span
                    className={`mt-0.5 text-[8px] font-mono leading-none ${
                      isSelected
                        ? 'text-zinc-950'
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

          {/* Helper Text Row */}
          <div className="shrink-0 flex items-center justify-between text-xs text-zinc-400 py-1.5 px-0.5 border-t border-white/6">
            <div className="flex items-center gap-1.5 font-medium text-zinc-300">
              <Activity className="w-3.5 h-3.5 text-rose-400 shrink-0" />
              <span>Tap a ring to jump to its card</span>
            </div>
            <span className="text-[10px] font-mono text-zinc-500 uppercase tracking-wider">
              {selectedDate === todayDate ? 'Today’s Live' : selectedDateDisplay}
            </span>
          </div>

          {/* 2×2 Grid of Large Circular Progress Rings */}
          <div className="flex-1 min-h-0 grid grid-cols-2 grid-rows-2 gap-2 sm:gap-3 pt-1">
            {/* 1. Weight Ring */}
            <button
              type="button"
              onClick={() => scrollToCard('card-weight')}
              className="w-full h-full min-h-0 rounded-2xl bg-zinc-900/50 hover:bg-zinc-900/90 border border-white/6 hover:border-white/15 p-1.5 sm:p-2.5 flex flex-col items-center justify-center transition-all active:scale-95 group text-center cursor-pointer overflow-hidden"
            >
              <CircularProgressRing
                percentage={weightPct}
                size={82}
                strokeWidth={7}
                color="#F43F5E"
                className="pointer-events-none"
              >
                <Scale className="w-3.5 h-3.5 text-rose-400 mb-0.5" />
                <span className="text-sm font-bold font-mono text-white leading-tight">
                  {loggedWeight > 0 ? loggedWeight.toFixed(1) : '—'}
                </span>
                <span className="text-[10px] font-mono text-zinc-400 leading-tight">
                  {profile.weightUnit}
                </span>
              </CircularProgressRing>
              <div className="mt-1 flex items-center gap-1">
                <span className="text-xs font-semibold text-zinc-200">Weight</span>
                <span className="text-[10px] font-mono font-bold text-rose-400">· {weightPct}%</span>
              </div>
            </button>

            {/* 2. Steps Ring */}
            <button
              type="button"
              onClick={() => scrollToCard('card-steps')}
              className="w-full h-full min-h-0 rounded-2xl bg-zinc-900/50 hover:bg-zinc-900/90 border border-white/6 hover:border-white/15 p-1.5 sm:p-2.5 flex flex-col items-center justify-center transition-all active:scale-95 group text-center cursor-pointer overflow-hidden"
            >
              <CircularProgressRing
                percentage={stepsPct}
                size={82}
                strokeWidth={7}
                color="#10B981"
                className="pointer-events-none"
              >
                <Footprints className="w-3.5 h-3.5 text-emerald-400 mb-0.5" />
                <span className="text-sm font-bold font-mono text-white leading-tight">
                  {loggedSteps > 0
                    ? loggedSteps >= 1000
                      ? `${(loggedSteps / 1000).toFixed(1)}k`
                      : loggedSteps
                    : '0'}
                </span>
                <span className="text-[10px] font-mono text-emerald-400 leading-tight">
                  {stepsPct}%
                </span>
              </CircularProgressRing>
              <div className="mt-1 flex items-center gap-1">
                <span className="text-xs font-semibold text-zinc-200">Steps</span>
                <span className="text-[10px] font-mono font-bold text-emerald-400">· {stepsPct}%</span>
              </div>
            </button>

            {/* 3. Sleep Ring */}
            <button
              type="button"
              onClick={() => scrollToCard('card-sleep')}
              className="w-full h-full min-h-0 rounded-2xl bg-zinc-900/50 hover:bg-zinc-900/90 border border-white/6 hover:border-white/15 p-1.5 sm:p-2.5 flex flex-col items-center justify-center transition-all active:scale-95 group text-center cursor-pointer overflow-hidden"
            >
              <CircularProgressRing
                percentage={sleepPct}
                size={82}
                strokeWidth={7}
                color="#818CF8"
                className="pointer-events-none"
              >
                <Moon className="w-3.5 h-3.5 text-indigo-400 mb-0.5" />
                <span className="text-sm font-bold font-mono text-white leading-tight">
                  {formatSleepDuration(loggedSleepMinutes)}
                </span>
                <span className="text-[10px] font-mono text-indigo-400 leading-tight">
                  {sleepPct}%
                </span>
              </CircularProgressRing>
              <div className="mt-1 flex items-center gap-1">
                <span className="text-xs font-semibold text-zinc-200">Sleep</span>
                <span className="text-[10px] font-mono font-bold text-indigo-400">· {sleepPct}%</span>
              </div>
            </button>

            {/* 4. Water Ring */}
            <button
              type="button"
              onClick={() => scrollToCard('card-water')}
              className="w-full h-full min-h-0 rounded-2xl bg-zinc-900/50 hover:bg-zinc-900/90 border border-white/6 hover:border-white/15 p-1.5 sm:p-2.5 flex flex-col items-center justify-center transition-all active:scale-95 group text-center cursor-pointer overflow-hidden"
            >
              <CircularProgressRing
                percentage={waterPct}
                size={82}
                strokeWidth={7}
                color="#38BDF8"
                className="pointer-events-none"
              >
                <Droplets className="w-3.5 h-3.5 text-sky-400 mb-0.5" />
                <span className="text-sm font-bold font-mono text-white leading-tight">
                  {(loggedWaterMl / 1000).toFixed(1)}L
                </span>
                <span className="text-[10px] font-mono text-sky-400 leading-tight">
                  {waterPct}%
                </span>
              </CircularProgressRing>
              <div className="mt-1 flex items-center gap-1">
                <span className="text-xs font-semibold text-zinc-200">Water</span>
                <span className="text-[10px] font-mono font-bold text-sky-400">· {waterPct}%</span>
              </div>
            </button>
          </div>
        </div>
      </div>

      {/* ══════════════════════════════════════════════════════════════════════
          SCREEN 2: WEIGHT + STEPS (ONE SCREEN PAIR)
          Each card takes exactly 50% of screen height with internal scroll if needed
          ══════════════════════════════════════════════════════════════════════ */}
      <div
        className="snap-start flex flex-col gap-2.5 sm:gap-3 scroll-mt-[68px] sm:scroll-mt-[76px] h-[calc(100dvh-9.75rem-env(safe-area-inset-bottom,0px))] sm:h-[calc(100dvh-7.5rem)]"
      >
        {/* Card: Body Weight (50% of available viewport) */}
        <section
          id="card-weight"
          className="flex-1 min-h-0 scroll-mt-[68px] sm:scroll-mt-[76px] rounded-3xl bg-[#12141C] border border-white/8 p-4 flex flex-col justify-between overflow-y-auto no-scrollbar"
        >
          {/* Header Row: Clean metric title & goal info */}
          <div className="shrink-0 flex items-center justify-between gap-2 pb-1.5">
            <div className="flex items-center gap-1.5 text-xs text-rose-400 font-semibold min-w-0 truncate">
              <Scale className="w-3.5 h-3.5 shrink-0" />
              <span className="truncate">Body Weight</span>
            </div>
            <div className="text-[11px] font-mono tabular-nums text-zinc-400 flex items-center gap-1.5 shrink-0">
              <span>Goal: {profile.targetWeight} {profile.weightUnit}</span>
              <span className="text-zinc-600">·</span>
              <span className="text-rose-400 font-semibold">{weightPct}% to goal</span>
              {weightDelta7d !== null && (
                <span
                  className={`flex items-center gap-0.5 font-bold ${
                    weightDelta7d <= 0 ? 'text-emerald-400' : 'text-rose-400'
                  }`}
                >
                  {weightDelta7d <= 0 ? (
                    <TrendingDown className="w-3 h-3" />
                  ) : (
                    <TrendingUp className="w-3 h-3" />
                  )}
                  {weightDelta7d > 0 ? `+${weightDelta7d}` : weightDelta7d}
                </span>
              )}
            </div>
          </div>

          {/* Two-Column Main Row: Left 50% Circle, Right 50% Other */}
          <div className="flex items-center gap-3 w-full my-auto py-1">
            {/* LEFT 50%: Circular Progress Ring centered */}
            <div className="w-1/2 shrink-0 flex items-center justify-center">
              <CircularProgressRing
                percentage={weightPct}
                size={116}
                strokeWidth={9.5}
                color="#F43F5E"
              >
                <span className="text-xl font-bold font-mono tabular-nums text-white leading-none">
                  {loggedWeight > 0 ? loggedWeight.toFixed(1) : '—'}
                </span>
                <span className="text-[10px] font-mono text-zinc-400 leading-none mt-1">
                  {profile.weightUnit}
                </span>
                <span className="text-[10px] font-mono text-rose-400 leading-none mt-0.5 font-bold">
                  {weightPct}%
                </span>
              </CircularProgressRing>
            </div>

            {/* RIGHT 50%: Vertical Stack (Input + 3 Equal Action Buttons) */}
            <div className="w-1/2 flex-1 min-w-0 flex flex-col gap-2">
              {/* Full-width 48px high weight input with unit inside (kg) */}
              <div className="relative w-full">
                <input
                  type="number"
                  step="0.1"
                  min="0"
                  max="500"
                  value={weightInput}
                  onChange={(e) => setWeightInput(e.target.value)}
                  placeholder={String(profile.targetWeight)}
                  className="w-full h-12 min-h-[48px] bg-[#090A0F] border border-white/10 rounded-xl pl-3 pr-9 text-base sm:text-sm font-mono tabular-nums text-white placeholder:text-zinc-600 focus:outline-none focus:border-rose-500/60"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-mono text-zinc-400 pointer-events-none">
                  {profile.weightUnit}
                </span>
              </div>

              {/* Row of 3 equal buttons (-0.1, +0.1, Save) at 44-48px height */}
              <div className="grid grid-cols-3 gap-1.5 w-full">
                <button
                  type="button"
                  onClick={() => {
                    const base = loggedWeight || profile.startWeight || profile.targetWeight || 55;
                    handleSaveWeight(Math.max(1, Math.round((base - 0.1) * 10) / 10));
                  }}
                  className="h-11 sm:h-12 min-h-[44px] rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-white/10 text-xs font-mono font-bold text-zinc-200 flex items-center justify-center transition-colors active:scale-95 cursor-pointer"
                  title="Decrease 0.1"
                >
                  -0.1
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const base = loggedWeight || profile.startWeight || profile.targetWeight || 55;
                    handleSaveWeight(Math.min(500, Math.round((base + 0.1) * 10) / 10));
                  }}
                  className="h-11 sm:h-12 min-h-[44px] rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-white/10 text-xs font-mono font-bold text-zinc-200 flex items-center justify-center transition-colors active:scale-95 cursor-pointer"
                  title="Increase 0.1"
                >
                  +0.1
                </button>
                <button
                  type="button"
                  onClick={() => handleSaveWeight()}
                  disabled={savingField === 'weight'}
                  className="h-11 sm:h-12 min-h-[44px] rounded-xl bg-rose-500 hover:bg-rose-600 text-xs font-bold text-white flex items-center justify-center transition-all whitespace-nowrap active:scale-95 shadow-md shadow-rose-500/20 cursor-pointer disabled:opacity-40"
                >
                  {savingField === 'weight' ? '...' : 'Save'}
                </button>
              </div>
            </div>
          </div>

          {/* 7-Day Weight Sparkline */}
          <div className="shrink-0 pt-1.5 border-t border-white/6 space-y-1">
            <div className="flex items-center justify-between text-[10px] text-zinc-400">
              <span>7-Day Trend</span>
              <span className="font-mono">Target: {profile.targetWeight} {profile.weightUnit}</span>
            </div>
            <div className="grid grid-cols-7 gap-1 items-end h-9">
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
                    className="flex flex-col items-center gap-0.5 group h-full justify-end cursor-pointer"
                  >
                    <div className="w-full bg-zinc-900 rounded-sm h-5 flex items-end overflow-hidden p-0.5">
                      <div
                        className={`w-full rounded-[1px] transition-all ${
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
                      className={`text-[9px] font-mono leading-none ${
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

        {/* Card: Daily Steps (50% of available viewport) */}
        <section
          id="card-steps"
          className="flex-1 min-h-0 scroll-mt-[68px] sm:scroll-mt-[76px] rounded-3xl bg-[#12141C] border border-white/8 p-4 flex flex-col justify-between overflow-y-auto no-scrollbar"
        >
          {/* Header Row: Clean metric title & goal info */}
          <div className="shrink-0 flex items-center justify-between gap-2 pb-1.5">
            <div className="flex items-center gap-1.5 text-xs text-emerald-400 font-semibold min-w-0 truncate">
              <Footprints className="w-3.5 h-3.5 shrink-0" />
              <span className="truncate">Daily Steps</span>
            </div>
            <div className="text-[11px] font-mono tabular-nums text-zinc-400 flex items-center gap-1.5 shrink-0">
              <span>Goal: {profile.stepsGoal.toLocaleString()}</span>
              <span className="text-zinc-600">·</span>
              <span className="text-emerald-400 font-semibold">{stepsPct}% to goal</span>
            </div>
          </div>

          {/* Two-Column Main Row: Left 50% Circle, Right 50% Other */}
          <div className="flex items-center gap-3 w-full my-auto py-1">
            {/* LEFT 50%: Circular Progress Ring centered */}
            <div className="w-1/2 shrink-0 flex items-center justify-center">
              <CircularProgressRing
                percentage={stepsPct}
                size={116}
                strokeWidth={9.5}
                color="#10B981"
              >
                <span className="text-xl font-bold font-mono tabular-nums text-white leading-none">
                  {loggedSteps > 0
                    ? loggedSteps >= 1000
                      ? `${(loggedSteps / 1000).toFixed(1)}k`
                      : loggedSteps
                    : '0'}
                </span>
                <span className="text-[10px] font-mono text-zinc-400 leading-none mt-1">
                  steps
                </span>
                <span className="text-[10px] font-mono text-emerald-400 leading-none mt-0.5 font-bold">
                  {stepsPct}%
                </span>
              </CircularProgressRing>
            </div>

            {/* RIGHT 50%: Vertical Stack (Input + 3 Equal Action Buttons) */}
            <div className="w-1/2 flex-1 min-w-0 flex flex-col gap-2">
              {/* Full-width 48px high steps input with unit inside */}
              <div className="relative w-full">
                <input
                  type="number"
                  inputMode="numeric"
                  min="0"
                  max="200000"
                  value={stepsInput}
                  onChange={(e) => setStepsInput(e.target.value)}
                  placeholder={String(profile.stepsGoal)}
                  className="w-full h-12 min-h-[48px] bg-[#090A0F] border border-white/10 rounded-xl pl-3 pr-11 text-base sm:text-sm font-mono tabular-nums text-white placeholder:text-zinc-600 focus:outline-none focus:border-emerald-500/60"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-mono text-zinc-400 pointer-events-none">
                  steps
                </span>
              </div>

              {/* Row of 3 equal buttons (-500, +500, Save) at 44-48px height */}
              <div className="grid grid-cols-3 gap-1.5 w-full">
                <button
                  type="button"
                  onClick={() => handleSaveSteps(Math.max(0, loggedSteps - 500))}
                  className="h-11 sm:h-12 min-h-[44px] rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-white/10 text-xs font-mono font-bold text-zinc-200 flex items-center justify-center transition-colors active:scale-95 cursor-pointer"
                  title="Decrease 500 steps"
                >
                  -500
                </button>
                <button
                  type="button"
                  onClick={() => handleSaveSteps(loggedSteps + 500)}
                  className="h-11 sm:h-12 min-h-[44px] rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-white/10 text-xs font-mono font-bold text-zinc-200 flex items-center justify-center transition-colors active:scale-95 cursor-pointer"
                  title="Increase 500 steps"
                >
                  +500
                </button>
                <button
                  type="button"
                  onClick={() => handleSaveSteps()}
                  disabled={savingField === 'steps'}
                  className="h-11 sm:h-12 min-h-[44px] rounded-xl bg-emerald-500 hover:bg-emerald-600 text-xs font-bold text-zinc-950 flex items-center justify-center transition-all whitespace-nowrap active:scale-95 shadow-md shadow-emerald-500/20 cursor-pointer disabled:opacity-40"
                >
                  {savingField === 'steps' ? '...' : 'Save'}
                </button>
              </div>
            </div>
          </div>

          {/* 7-Day Steps Sparkline */}
          <div className="shrink-0 pt-1.5 border-t border-white/6 space-y-1">
            <div className="flex items-center justify-between text-[10px] text-zinc-400">
              <span>7-Day History</span>
              <span className="font-mono">Goal: {profile.stepsGoal.toLocaleString()}</span>
            </div>
            <div className="grid grid-cols-7 gap-1 items-end h-9">
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
                    className="flex flex-col items-center gap-0.5 group h-full justify-end cursor-pointer"
                  >
                    <div className="w-full bg-zinc-900 rounded-sm h-5 flex items-end overflow-hidden p-0.5">
                      <div
                        className={`w-full rounded-[1px] transition-all ${
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
                      className={`text-[9px] font-mono leading-none ${
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

      {/* ══════════════════════════════════════════════════════════════════════
          SCREEN 3: SLEEP + WATER (ONE SCREEN PAIR)
          Each card takes exactly 50% of screen height with internal scroll if needed
          ══════════════════════════════════════════════════════════════════════ */}
      <div
        className="snap-start flex flex-col gap-2.5 sm:gap-3 scroll-mt-[68px] sm:scroll-mt-[76px] h-[calc(100dvh-9.75rem-env(safe-area-inset-bottom,0px))] sm:h-[calc(100dvh-7.5rem)]"
      >
        {/* Card: Sleep Duration (50% of available viewport) */}
        <section
          id="card-sleep"
          className="flex-1 min-h-0 scroll-mt-[68px] sm:scroll-mt-[76px] rounded-3xl bg-[#12141C] border border-white/8 p-4 flex flex-col justify-between overflow-y-auto no-scrollbar"
        >
          {/* Header Row: Clean metric title & goal info */}
          <div className="shrink-0 flex items-center justify-between gap-2 pb-1.5">
            <div className="flex items-center gap-1.5 text-xs text-indigo-400 font-semibold min-w-0 truncate">
              <Moon className="w-3.5 h-3.5 shrink-0" />
              <span className="truncate">Sleep Duration</span>
            </div>
            <div className="text-[11px] font-mono tabular-nums text-zinc-400 flex items-center gap-1.5 shrink-0">
              <span>Goal: {formatSleepDuration(profile.sleepGoalMinutes)}</span>
              <span className="text-zinc-600">·</span>
              <span className="text-indigo-400 font-semibold">{sleepPct}% to goal</span>
            </div>
          </div>

          {/* Two-Column Main Row: Left 50% Circle, Right 50% Other */}
          <div className="flex items-center gap-3 w-full my-auto py-1">
            {/* LEFT 50%: Circular Progress Ring centered */}
            <div className="w-1/2 shrink-0 flex items-center justify-center">
              <CircularProgressRing
                percentage={sleepPct}
                size={116}
                strokeWidth={9.5}
                color="#818CF8"
              >
                <span className="text-base sm:text-lg font-bold font-mono tabular-nums text-white leading-none">
                  {formatSleepDuration(loggedSleepMinutes)}
                </span>
                <span className="text-[10px] font-mono text-zinc-400 leading-none mt-1">
                  sleep
                </span>
                <span className="text-[10px] font-mono text-indigo-400 leading-none mt-0.5 font-bold">
                  {sleepPct}%
                </span>
              </CircularProgressRing>
            </div>

            {/* RIGHT 50%: Vertical Stack (Inputs + 3 Equal Action Buttons) */}
            <div className="w-1/2 flex-1 min-w-0 flex flex-col gap-2">
              {/* Side-by-side 48px inputs for Hours and Minutes */}
              <div className="grid grid-cols-2 gap-1.5 w-full">
                <div className="relative">
                  <input
                    type="number"
                    min="0"
                    max="24"
                    value={sleepHoursInput}
                    onChange={(e) => setSleepHoursInput(e.target.value)}
                    placeholder="8"
                    className="w-full h-12 min-h-[48px] bg-[#090A0F] border border-white/10 rounded-xl pl-2.5 pr-6 text-base sm:text-sm font-mono tabular-nums text-white placeholder:text-zinc-600 focus:outline-none focus:border-indigo-500/60"
                  />
                  <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs font-mono text-zinc-400 pointer-events-none">
                    hr
                  </span>
                </div>
                <div className="relative">
                  <input
                    type="number"
                    min="0"
                    max="59"
                    value={sleepMinsInput}
                    onChange={(e) => setSleepMinsInput(e.target.value)}
                    placeholder="00"
                    className="w-full h-12 min-h-[48px] bg-[#090A0F] border border-white/10 rounded-xl pl-2.5 pr-7 text-base sm:text-sm font-mono tabular-nums text-white placeholder:text-zinc-600 focus:outline-none focus:border-indigo-500/60"
                  />
                  <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs font-mono text-zinc-400 pointer-events-none">
                    min
                  </span>
                </div>
              </div>

              {/* Row of 3 equal buttons (-30m, +30m, Save) at 44-48px height */}
              <div className="grid grid-cols-3 gap-1.5 w-full">
                <button
                  type="button"
                  onClick={() => handleSaveSleep(Math.max(0, loggedSleepMinutes - 30))}
                  className="h-11 sm:h-12 min-h-[44px] rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-white/10 text-xs font-mono font-bold text-zinc-200 flex items-center justify-center transition-colors active:scale-95 cursor-pointer"
                  title="Decrease 30 minutes"
                >
                  -30m
                </button>
                <button
                  type="button"
                  onClick={() => handleSaveSleep(loggedSleepMinutes + 30)}
                  className="h-11 sm:h-12 min-h-[44px] rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-white/10 text-xs font-mono font-bold text-zinc-200 flex items-center justify-center transition-colors active:scale-95 cursor-pointer"
                  title="Increase 30 minutes"
                >
                  +30m
                </button>
                <button
                  type="button"
                  onClick={() => handleSaveSleep()}
                  disabled={savingField === 'sleep'}
                  className="h-11 sm:h-12 min-h-[44px] rounded-xl bg-indigo-500 hover:bg-indigo-600 text-xs font-bold text-white flex items-center justify-center transition-all whitespace-nowrap active:scale-95 shadow-md shadow-indigo-500/20 cursor-pointer disabled:opacity-40"
                >
                  {savingField === 'sleep' ? '...' : 'Save'}
                </button>
              </div>
            </div>
          </div>

          {/* 7-Day Sleep Sparkline */}
          <div className="shrink-0 pt-1.5 border-t border-white/6 space-y-1">
            <div className="flex items-center justify-between text-[10px] text-zinc-400">
              <span>7-Day History</span>
              <span className="font-mono">Goal: {formatSleepDuration(profile.sleepGoalMinutes)}</span>
            </div>
            <div className="grid grid-cols-7 gap-1 items-end h-9">
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
                    className="flex flex-col items-center gap-0.5 group h-full justify-end cursor-pointer"
                  >
                    <div className="w-full bg-zinc-900 rounded-sm h-5 flex items-end overflow-hidden p-0.5">
                      <div
                        className={`w-full rounded-[1px] transition-all ${
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
                      className={`text-[9px] font-mono leading-none ${
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

        {/* Card: Hydration (50% of available viewport) */}
        <section
          id="card-water"
          className="flex-1 min-h-0 scroll-mt-[68px] sm:scroll-mt-[76px] rounded-3xl bg-[#12141C] border border-white/8 p-4 flex flex-col justify-between overflow-y-auto no-scrollbar"
        >
          {/* Header Row: Clean metric title & goal info */}
          <div className="shrink-0 flex items-center justify-between gap-2 pb-1.5">
            <div className="flex items-center gap-1.5 text-xs text-sky-400 font-semibold min-w-0 truncate">
              <Droplets className="w-3.5 h-3.5 shrink-0" />
              <span className="truncate">Hydration</span>
            </div>
            <div className="text-[11px] font-mono tabular-nums text-zinc-400 flex items-center gap-1.5 shrink-0">
              <span>Goal: {(profile.waterGoalMl / 1000).toFixed(1)}L</span>
              <span className="text-zinc-600">·</span>
              <span className="text-sky-400 font-semibold">{waterPct}% to goal</span>
            </div>
          </div>

          {/* Two-Column Main Row: Left 50% Circle, Right 50% Other */}
          <div className="flex items-center gap-3 w-full my-auto py-1">
            {/* LEFT 50%: Circular Progress Ring centered */}
            <div className="w-1/2 shrink-0 flex items-center justify-center">
              <CircularProgressRing
                percentage={waterPct}
                size={116}
                strokeWidth={9.5}
                color="#38BDF8"
              >
                <span className="text-xl font-bold font-mono tabular-nums text-white leading-none">
                  {(loggedWaterMl / 1000).toFixed(1)}L
                </span>
                <span className="text-[10px] font-mono text-zinc-400 leading-none mt-1">
                  water
                </span>
                <span className="text-[10px] font-mono text-sky-400 leading-none mt-0.5 font-bold">
                  {waterPct}%
                </span>
              </CircularProgressRing>
            </div>

            {/* RIGHT 50%: Vertical Stack (Input + 3 Equal Action Buttons) */}
            <div className="w-1/2 flex-1 min-w-0 flex flex-col gap-2">
              {/* Full-width 48px high water input with unit inside (ml) */}
              <div className="relative w-full">
                <input
                  type="number"
                  inputMode="numeric"
                  min="0"
                  max="20000"
                  value={waterInput}
                  onChange={(e) => setWaterInput(e.target.value)}
                  placeholder={String(profile.waterGoalMl)}
                  className="w-full h-12 min-h-[48px] bg-[#090A0F] border border-white/10 rounded-xl pl-3 pr-8 text-base sm:text-sm font-mono tabular-nums text-white placeholder:text-zinc-600 focus:outline-none focus:border-sky-500/60"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-mono text-zinc-400 pointer-events-none">
                  ml
                </span>
              </div>

              {/* Row of 3 equal buttons (-250, +250, Save) at 44-48px height */}
              <div className="grid grid-cols-3 gap-1.5 w-full">
                <button
                  type="button"
                  onClick={() => handleSaveWater(Math.max(0, loggedWaterMl - 250))}
                  className="h-11 sm:h-12 min-h-[44px] rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-white/10 text-xs font-mono font-bold text-zinc-200 flex items-center justify-center transition-colors active:scale-95 cursor-pointer"
                  title="Decrease 250 ml"
                >
                  -250
                </button>
                <button
                  type="button"
                  onClick={() => handleSaveWater(loggedWaterMl + 250)}
                  className="h-11 sm:h-12 min-h-[44px] rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-white/10 text-xs font-mono font-bold text-zinc-200 flex items-center justify-center transition-colors active:scale-95 cursor-pointer"
                  title="Increase 250 ml"
                >
                  +250
                </button>
                <button
                  type="button"
                  onClick={() => handleSaveWater()}
                  disabled={savingField === 'water'}
                  className="h-11 sm:h-12 min-h-[44px] rounded-xl bg-sky-400 hover:bg-sky-500 text-xs font-bold text-zinc-950 flex items-center justify-center transition-all whitespace-nowrap active:scale-95 shadow-md shadow-sky-400/20 cursor-pointer disabled:opacity-40"
                >
                  {savingField === 'water' ? '...' : 'Save'}
                </button>
              </div>
            </div>
          </div>

          {/* 7-Day Water Sparkline */}
          <div className="shrink-0 pt-1.5 border-t border-white/6 space-y-1">
            <div className="flex items-center justify-between text-[10px] text-zinc-400">
              <span>7-Day History</span>
              <span className="font-mono">Goal: {(profile.waterGoalMl / 1000).toFixed(1)}L</span>
            </div>
            <div className="grid grid-cols-7 gap-1 items-end h-9">
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
                    className="flex flex-col items-center gap-0.5 group h-full justify-end cursor-pointer"
                  >
                    <div className="w-full bg-zinc-900 rounded-sm h-5 flex items-end overflow-hidden p-0.5">
                      <div
                        className={`w-full rounded-[1px] transition-all ${
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
                      className={`text-[9px] font-mono leading-none ${
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

      {/* ══════════════════════════════════════════════════════════════════════
          DAILY WELLNESS NOTE
          ══════════════════════════════════════════════════════════════════════ */}
      <div className="snap-start scroll-mt-[68px] sm:scroll-mt-[76px] pt-1 pb-16 sm:pb-8">
        <form
          onSubmit={handleSaveNote}
          className="rounded-3xl bg-[#12141C] border border-white/8 p-3.5 sm:p-4 flex flex-col sm:flex-row items-stretch sm:items-center gap-3"
        >
          <div className="flex items-center gap-2 text-xs font-medium text-zinc-300 shrink-0">
            <Sparkles className="w-4 h-4 text-amber-400" />
            <span>Daily Log Note ({selectedDateDisplay}):</span>
          </div>
          <input
            type="text"
            maxLength={280}
            value={noteInput}
            onChange={(e) => setNoteInput(e.target.value)}
            placeholder="Add a note for today (e.g. Evening walk together, post-workout weigh-in)..."
            className="flex-1 min-h-[44px] bg-[#090A0F] border border-white/10 rounded-xl px-3.5 text-base sm:text-sm text-white placeholder:text-zinc-600 focus:outline-none focus:border-amber-400/60"
          />
          <button
            type="submit"
            disabled={savingField === 'note'}
            className="min-h-[44px] px-5 rounded-xl bg-white/10 hover:bg-white/15 text-xs font-semibold text-white transition-colors whitespace-nowrap shrink-0 active:scale-95"
          >
            {savingField === 'note' ? 'Saving...' : 'Save Note'}
          </button>
        </form>
      </div>

      {/* ══════════════════════════════════════════════════════════════════════
          CUSTOMIZE DAILY TARGETS MODAL / DRAWER
          ══════════════════════════════════════════════════════════════════════ */}
      {isGoalsOpen && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/75 backdrop-blur-sm p-0 sm:p-4">
          <div className="w-full sm:max-w-md max-h-[90dvh] flex flex-col rounded-t-3xl sm:rounded-3xl bg-[#12141C] border border-white/10 text-zinc-100 shadow-2xl overflow-hidden">
            {/* Modal Header */}
            <div className="shrink-0 p-4 sm:p-5 pb-3 border-b border-white/10 bg-[#12141C]">
              <div className="w-10 h-1 bg-zinc-700 rounded-full mx-auto mb-3 sm:hidden" />
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-base font-semibold text-white">
                    Customize {profile.name}’s Targets
                  </h3>
                  <p className="text-xs text-zinc-400">
                    Saved automatically across your devices
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setIsGoalsOpen(false)}
                  aria-label="Close Targets Drawer"
                  className="min-w-[44px] min-h-[44px] rounded-xl flex items-center justify-center text-zinc-400 hover:text-white hover:bg-white/5 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Modal Body & Form */}
            <form onSubmit={handleSaveGoalsSubmit} className="flex-1 flex flex-col min-h-0 overflow-hidden">
              <div className="overflow-y-auto overscroll-contain flex-1 p-4 sm:p-5 space-y-4 no-scrollbar">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs text-zinc-400 mb-1">Profile Name</label>
                    <input
                      type="text"
                      maxLength={60}
                      value={goalName}
                      onChange={(e) => setGoalName(e.target.value)}
                      className="w-full min-h-[44px] bg-[#090A0F] border border-white/10 rounded-xl px-3 text-base sm:text-sm text-white focus:outline-none focus:border-rose-500/60"
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
                          className={`min-h-[40px] rounded-lg text-xs font-mono font-semibold transition-colors ${
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
                      className="w-full min-h-[44px] bg-[#090A0F] border border-white/10 rounded-xl px-3 text-base sm:text-sm font-mono tabular-nums text-white focus:outline-none focus:border-rose-500/60"
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
                      className="w-full min-h-[44px] bg-[#090A0F] border border-white/10 rounded-xl px-3 text-base sm:text-sm font-mono tabular-nums text-white focus:outline-none focus:border-rose-500/60"
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
                    className="w-full min-h-[44px] bg-[#090A0F] border border-white/10 rounded-xl px-3 text-base sm:text-sm font-mono tabular-nums text-white focus:outline-none focus:border-emerald-500/60"
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
                      className="w-full min-h-[44px] bg-[#090A0F] border border-white/10 rounded-xl px-3 text-base sm:text-sm font-mono tabular-nums text-white focus:outline-none focus:border-indigo-500/60"
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
                      className="w-full min-h-[44px] bg-[#090A0F] border border-white/10 rounded-xl px-3 text-base sm:text-sm font-mono tabular-nums text-white focus:outline-none focus:border-indigo-500/60"
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
                    className="w-full min-h-[44px] bg-[#090A0F] border border-white/10 rounded-xl px-3 text-base sm:text-sm font-mono tabular-nums text-white focus:outline-none focus:border-sky-500/60"
                  />
                </div>
              </div>

              {/* Sticky Footer: 50/50 balanced 48px buttons */}
              <div className="shrink-0 p-4 border-t border-white/10 bg-[#12141C] grid grid-cols-2 gap-3 w-full">
                <button
                  type="button"
                  onClick={() => setIsGoalsOpen(false)}
                  className="w-full min-h-[48px] h-12 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-semibold text-zinc-300 transition-colors flex items-center justify-center active:scale-95 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingField === 'goals'}
                  className="w-full min-h-[48px] h-12 rounded-xl bg-white text-zinc-950 hover:bg-zinc-200 text-xs font-bold transition-all flex items-center justify-center active:scale-95 shadow-md shadow-white/5 cursor-pointer disabled:opacity-40"
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
