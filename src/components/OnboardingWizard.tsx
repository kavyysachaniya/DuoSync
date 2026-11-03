import React, { useState } from 'react';
import {
  Activity,
  ArrowLeft,
  ArrowRight,
  Check,
  Droplet,
  Droplets,
  Footprints,
  Link2,
  Moon,
  Plus,
  Scale,
  Sparkles,
  User,
  Users,
  Watch,
  Wind,
} from 'lucide-react';
import {
  DEFAULT_BODYCARE_CATEGORIES,
  DEFAULT_HAIRCARE_CATEGORIES,
  DEFAULT_SKINCARE_CATEGORIES,
  FITNESS_APP_CATALOG,
  FitnessAppId,
  formatSleepDuration,
} from '../types';

export interface OnboardingSubmission {
  mode: 'create_or_update' | 'join_partner_code';
  partnerCodeToJoin?: string;
  myName: string;
  myRole: string;
  partnerName: string;
  partnerRole: string;
  currency: string;
  fitnessApp: FitnessAppId;
  weightUnit: 'kg' | 'lbs';
  currentWeight: number;
  targetWeight: number;
  stepsGoal: number;
  sleepGoalMinutes: number;
  waterGoalMl: number;
  skincareCategories: string[];
  haircareCategories: string[];
  bodycareCategories: string[];
}

interface OnboardingWizardProps {
  initialName: string;
  initialPartnerName?: string;
  initialCurrency?: string;
  initialFitnessApp?: FitnessAppId;
  pairingCode?: string;
  onComplete: (data: OnboardingSubmission) => Promise<void>;
  onCancel?: () => void;
}

const CURRENCIES = ['₹', '$', '€', '£', '¥', 'A$'];

export const OnboardingWizard: React.FC<OnboardingWizardProps> = ({
  initialName,
  initialPartnerName = 'Partner',
  initialCurrency = '₹',
  initialFitnessApp = 'google_fit',
  pairingCode,
  onComplete,
  onCancel,
}) => {
  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Step 1: Identity, Partner Connection & Preferred Fitness App
  const [myName, setMyName] = useState(initialName || '');
  const [myRole, setMyRole] = useState('My Routine');
  const [currency, setCurrency] = useState(initialCurrency || '₹');
  const [fitnessApp, setFitnessApp] = useState<FitnessAppId>(initialFitnessApp || 'google_fit');
  const [setupMode, setSetupMode] = useState<'own_workspace' | 'join_code'>('own_workspace');
  const [partnerName, setPartnerName] = useState(
    initialPartnerName === 'My Girlfriend' ? 'Partner' : initialPartnerName
  );
  const [partnerCodeInput, setPartnerCodeInput] = useState('');

  // Step 2: Weight & Body Baseline
  const [weightUnit, setWeightUnit] = useState<'kg' | 'lbs'>('kg');
  const [currentWeight, setCurrentWeight] = useState('65.0');
  const [targetWeight, setTargetWeight] = useState('62.0');

  // Step 3: Daily Health Goals (Steps, Sleep, Water)
  const [stepsGoal, setStepsGoal] = useState('8500');
  const [sleepHours, setSleepHours] = useState('8');
  const [sleepMins, setSleepMins] = useState('0');
  const [waterGoalMl, setWaterGoalMl] = useState('2500');

  // Step 4: Routine Categories (Skincare, Haircare, Bodycare)
  const [skincareCats, setSkincareCats] = useState<string[]>([
    'Cleanser',
    'Toner',
    'Serum',
    'Moisturizer',
    'Sunscreen',
    'Lip Care',
  ]);
  const [haircareCats, setHaircareCats] = useState<string[]>([
    'Shampoo',
    'Conditioner',
    'Hair Mask',
    'Hair Serum',
    'Scalp Oil',
  ]);
  const [bodycareCats, setBodycareCats] = useState<string[]>([
    'Body Wash',
    'Body Lotion',
    'Body Scrub',
    'Deodorant',
  ]);

  const [customSkincareInput, setCustomSkincareInput] = useState('');
  const [customHaircareInput, setCustomHaircareInput] = useState('');
  const [customBodycareInput, setCustomBodycareInput] = useState('');

  const toggleCategory = (
    list: string[],
    setList: React.Dispatch<React.SetStateAction<string[]>>,
    item: string
  ) => {
    if (list.includes(item)) {
      if (list.length > 1) {
        setList(list.filter((c) => c !== item));
      }
    } else if (list.length < 30) {
      setList([...list, item]);
    }
  };

  const addCustomCategory = (
    val: string,
    setVal: React.Dispatch<React.SetStateAction<string>>,
    list: string[],
    setList: React.Dispatch<React.SetStateAction<string[]>>
  ) => {
    const cleaned = val.trim().slice(0, 50);
    if (!cleaned) return;
    if (!list.includes(cleaned) && list.length < 30) {
      setList([...list, cleaned]);
    }
    setVal('');
  };

  const handleNextStep = () => {
    setError(null);
    if (step === 1) {
      if (!myName.trim()) {
        setError('Please enter your name so we can personalize your Firebase profile.');
        return;
      }
      if (setupMode === 'join_code' && partnerCodeInput.replace(/\D/g, '').length !== 6) {
        setError('Please enter a valid 6-digit partner pairing code, or choose "Start My Workspace".');
        return;
      }
      setStep(2);
    } else if (step === 2) {
      const cw = parseFloat(currentWeight);
      const tw = parseFloat(targetWeight);
      if (Number.isNaN(cw) || cw <= 0 || cw > 500) {
        setError('Please enter a valid current weight.');
        return;
      }
      if (Number.isNaN(tw) || tw <= 0 || tw > 500) {
        setError('Please enter a valid target weight.');
        return;
      }
      setStep(3);
    } else if (step === 3) {
      const st = parseInt(stepsGoal, 10);
      const wt = parseInt(waterGoalMl, 10);
      if (Number.isNaN(st) || st < 100 || st > 100000) {
        setError('Please enter a daily steps goal between 100 and 100,000.');
        return;
      }
      if (Number.isNaN(wt) || wt < 250 || wt > 15000) {
        setError('Please enter a daily water intake goal between 250 ml and 15,000 ml.');
        return;
      }
      setStep(4);
    }
  };

  const handleFinish = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const cw = Math.round((parseFloat(currentWeight) || 65) * 10) / 10;
      const tw = Math.round((parseFloat(targetWeight) || 62) * 10) / 10;
      const st = Math.max(100, Math.min(100000, parseInt(stepsGoal, 10) || 8500));
      const sh = Math.max(1, Math.min(24, parseInt(sleepHours, 10) || 8));
      const sm = Math.max(0, Math.min(59, parseInt(sleepMins, 10) || 0));
      const wt = Math.max(250, Math.min(15000, parseInt(waterGoalMl, 10) || 2500));

      await onComplete({
        mode: setupMode === 'join_code' ? 'join_partner_code' : 'create_or_update',
        partnerCodeToJoin:
          setupMode === 'join_code' ? partnerCodeInput.replace(/\D/g, '').slice(0, 6) : undefined,
        myName: myName.trim(),
        myRole: myRole.trim() || `${myName.trim()}’s Dashboard`,
        partnerName: partnerName.trim() || 'Partner',
        partnerRole: `${partnerName.trim() || 'Partner'}’s Dashboard`,
        currency,
        fitnessApp,
        weightUnit,
        currentWeight: cw,
        targetWeight: tw,
        stepsGoal: st,
        sleepGoalMinutes: Math.min(1440, sh * 60 + sm),
        waterGoalMl: wt,
        skincareCategories:
          skincareCats.length > 0 ? skincareCats : DEFAULT_SKINCARE_CATEGORIES,
        haircareCategories:
          haircareCats.length > 0 ? haircareCats : DEFAULT_HAIRCARE_CATEGORIES,
        bodycareCategories:
          bodycareCats.length > 0 ? bodycareCats : DEFAULT_BODYCARE_CATEGORIES,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save your setup. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#090A0F] text-zinc-100 flex flex-col justify-between p-3 sm:p-8">
      <div className="max-w-xl w-full mx-auto my-auto space-y-4 sm:space-y-6 pb-6">
        {/* Top Progress Header */}
        <div className="flex items-center justify-between gap-4 pt-1">
          <div className="flex items-center gap-2">
            <span className="text-base sm:text-lg font-bold tracking-tight text-white font-display">
              DuoPulse Setup
            </span>
            <span className="text-xs text-zinc-500">·</span>
            <span className="text-xs text-zinc-400 font-mono tabular-nums">
              Step {step} of 4
            </span>
          </div>

          {onCancel && (
            <button
              type="button"
              onClick={onCancel}
              className="min-h-[36px] px-3 rounded-xl bg-white/5 text-xs text-zinc-300 hover:text-white transition-colors"
            >
              Back to App
            </button>
          )}
        </div>

        {/* 4-Step Progress Bar */}
        <div className="grid grid-cols-4 gap-1.5">
          {[1, 2, 3, 4].map((idx) => (
            <div
              key={idx}
              className={`h-1.5 rounded-full transition-colors ${
                idx <= step ? 'bg-white' : 'bg-zinc-800'
              }`}
            />
          ))}
        </div>

        {/* Main Mobile-First Card */}
        <div className="rounded-3xl bg-[#12141C] border border-white/10 p-5 sm:p-7 shadow-2xl space-y-5">
          {/* STEP 1: IDENTITY, PARTNER CONNECTION & FITNESS APP */}
          {step === 1 && (
            <div className="space-y-5">
              <div className="space-y-1">
                <div className="text-xs font-medium text-rose-400 flex items-center gap-1.5">
                  <User className="w-4 h-4" />
                  <span>Step 1 · Profile, Partner & Fitness App</span>
                </div>
                <h1 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
                  Personalize your account & fitness sync
                </h1>
                <p className="text-xs text-zinc-400 leading-relaxed">
                  Everything you enter is saved to your Firebase account and synced across devices.
                </p>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-medium text-zinc-300 mb-1.5">
                    Your Display Name (Saved to Firebase) *
                  </label>
                  <input
                    type="text"
                    maxLength={60}
                    value={myName}
                    onChange={(e) => setMyName(e.target.value)}
                    placeholder="Enter your name"
                    className="w-full min-h-[48px] bg-[#090A0F] border border-white/10 rounded-2xl px-4 text-base text-white placeholder:text-zinc-600 focus:outline-none focus:border-white/30"
                  />
                </div>

                {/* Preferred Fitness App to Sync */}
                <div>
                  <label className="block text-xs font-medium text-zinc-300 mb-1.5 flex items-center gap-1.5">
                    <Watch className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Which Fitness App do you want to sync?</span>
                  </label>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {FITNESS_APP_CATALOG.map((app) => {
                      const active = fitnessApp === app.id;
                      return (
                        <button
                          key={app.id}
                          type="button"
                          onClick={() => setFitnessApp(app.id)}
                          className={`min-h-[54px] p-2.5 rounded-2xl border text-left transition-all flex flex-col justify-between ${
                            active
                              ? 'bg-zinc-900 border-emerald-400 text-white'
                              : 'bg-[#090A0F] border-white/8 text-zinc-400 hover:border-white/20'
                          }`}
                        >
                          <div className="flex items-center justify-between gap-1">
                            <span className="text-xs font-semibold truncate">{app.shortLabel}</span>
                            {active && <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0" />}
                          </div>
                          <span className="text-[10px] text-zinc-500 truncate">{app.ecosystem}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-zinc-300 mb-1.5">
                    Preferred Price Currency
                  </label>
                  <div className="grid grid-cols-6 gap-1.5 p-1.5 bg-[#090A0F] border border-white/10 rounded-2xl">
                    {CURRENCIES.map((sym) => (
                      <button
                        key={sym}
                        type="button"
                        onClick={() => setCurrency(sym)}
                        className={`min-h-[40px] rounded-xl text-xs font-mono font-semibold transition-colors ${
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

                {/* Partner Connection Mode */}
                <div className="pt-1 space-y-2.5">
                  <label className="block text-xs font-medium text-zinc-300">
                    Partner Connection Mode
                  </label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    <button
                      type="button"
                      onClick={() => setSetupMode('own_workspace')}
                      className={`p-3.5 rounded-2xl border text-left transition-all space-y-1 ${
                        setupMode === 'own_workspace'
                          ? 'bg-zinc-900 border-white text-white'
                          : 'bg-[#090A0F] border-white/8 text-zinc-400 hover:border-white/20'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold text-white">
                          Start My Workspace
                        </span>
                        <Users className="w-4 h-4 text-rose-400" />
                      </div>
                      <p className="text-[11px] text-zinc-400 leading-relaxed">
                        Create your dashboard & get a 6-digit invite code for your partner.
                      </p>
                    </button>

                    <button
                      type="button"
                      onClick={() => setSetupMode('join_code')}
                      className={`p-3.5 rounded-2xl border text-left transition-all space-y-1 ${
                        setupMode === 'join_code'
                          ? 'bg-zinc-900 border-rose-500 text-white'
                          : 'bg-[#090A0F] border-white/8 text-zinc-400 hover:border-white/20'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold text-white">
                          Join Partner’s Code
                        </span>
                        <Link2 className="w-4 h-4 text-emerald-400" />
                      </div>
                      <p className="text-[11px] text-zinc-400 leading-relaxed">
                        Enter your partner’s 6-digit code to link your accounts together.
                      </p>
                    </button>
                  </div>

                  {setupMode === 'own_workspace' ? (
                    <div className="rounded-2xl bg-[#090A0F] border border-white/8 p-3.5 space-y-2.5">
                      <div>
                        <label className="block text-xs text-zinc-400 mb-1">
                          Partner’s Name (Optional — they can join anytime via your 6-digit code)
                        </label>
                        <input
                          type="text"
                          maxLength={60}
                          value={partnerName}
                          onChange={(e) => setPartnerName(e.target.value)}
                          placeholder="e.g. Partner's Name"
                          className="w-full min-h-[42px] bg-[#12141C] border border-white/10 rounded-xl px-3.5 text-sm text-white placeholder:text-zinc-600 focus:outline-none focus:border-white/30"
                        />
                      </div>
                      {pairingCode && (
                        <div className="flex items-center justify-between text-xs text-zinc-400 pt-0.5">
                          <span>Your 6-digit partner invite code:</span>
                          <span className="font-mono font-semibold text-white tracking-widest">
                            {pairingCode}
                          </span>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="rounded-2xl bg-[#090A0F] border border-rose-500/30 p-3.5 space-y-2">
                      <label className="block text-xs text-zinc-300">
                        Enter Partner’s 6-Digit Pairing Code *
                      </label>
                      <input
                        type="text"
                        inputMode="numeric"
                        maxLength={6}
                        value={partnerCodeInput}
                        onChange={(e) =>
                          setPartnerCodeInput(e.target.value.replace(/\D/g, '').slice(0, 6))
                        }
                        placeholder="e.g. 482910"
                        className="w-full min-h-[44px] bg-[#12141C] border border-white/10 rounded-xl px-4 text-lg font-mono tracking-[0.25em] text-white placeholder:text-zinc-600 focus:outline-none focus:border-rose-500"
                      />
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* STEP 2: CURRENT WEIGHT & TARGET WEIGHT */}
          {step === 2 && (
            <div className="space-y-5">
              <div className="space-y-1">
                <div className="text-xs font-medium text-rose-400 flex items-center gap-1.5">
                  <Scale className="w-4 h-4" />
                  <span>Step 2 · Body Weight Baseline</span>
                </div>
                <h1 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
                  What is your current & target weight?
                </h1>
                <p className="text-xs text-zinc-400">
                  Calibrates your daily Weight circular progress ring and 7-day trend curve.
                </p>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-medium text-zinc-300 mb-1.5">
                    Preferred Weight Unit
                  </label>
                  <div className="grid grid-cols-2 gap-2 p-1.5 bg-[#090A0F] border border-white/10 rounded-2xl">
                    {(['kg', 'lbs'] as const).map((unit) => (
                      <button
                        key={unit}
                        type="button"
                        onClick={() => setWeightUnit(unit)}
                        className={`min-h-[42px] rounded-xl text-xs sm:text-sm font-mono font-semibold transition-colors ${
                          weightUnit === unit
                            ? 'bg-rose-500 text-white'
                            : 'text-zinc-400 hover:text-white'
                        }`}
                      >
                        {unit === 'kg' ? 'Kilograms (kg)' : 'Pounds (lbs)'}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  <div className="rounded-2xl bg-[#090A0F] border border-white/10 p-4 space-y-2">
                    <label className="block text-xs text-zinc-400">
                      Current Weight ({weightUnit}) *
                    </label>
                    <input
                      type="number"
                      step="0.1"
                      min="1"
                      max="500"
                      value={currentWeight}
                      onChange={(e) => setCurrentWeight(e.target.value)}
                      className="w-full min-h-[48px] bg-[#12141C] border border-white/10 rounded-xl px-4 text-xl font-mono tabular-nums font-bold text-white focus:outline-none focus:border-rose-500"
                    />
                    <span className="block text-[11px] text-zinc-500">
                      Saved as today’s baseline log
                    </span>
                  </div>

                  <div className="rounded-2xl bg-[#090A0F] border border-white/10 p-4 space-y-2">
                    <label className="block text-xs text-zinc-400">
                      Target Goal Weight ({weightUnit}) *
                    </label>
                    <input
                      type="number"
                      step="0.1"
                      min="1"
                      max="500"
                      value={targetWeight}
                      onChange={(e) => setTargetWeight(e.target.value)}
                      className="w-full min-h-[48px] bg-[#12141C] border border-white/10 rounded-xl px-4 text-xl font-mono tabular-nums font-bold text-white focus:outline-none focus:border-rose-500"
                    />
                    <span className="block text-[11px] text-zinc-500">
                      Your personal target milestone
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* STEP 3: DAILY STEPS, SLEEP & WATER GOALS */}
          {step === 3 && (
            <div className="space-y-5">
              <div className="space-y-1">
                <div className="text-xs font-medium text-emerald-400 flex items-center gap-1.5">
                  <Activity className="w-4 h-4" />
                  <span>Step 3 · Daily Vitals Rings</span>
                </div>
                <h1 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
                  Set your daily steps, sleep & water goals
                </h1>
                <p className="text-xs text-zinc-400">
                  Each category gets a dedicated circular progress ring on your Health dashboard.
                </p>
              </div>

              <div className="space-y-4">
                {/* Steps Target */}
                <div className="rounded-2xl bg-[#090A0F] border border-white/10 p-3.5 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-medium text-emerald-400 flex items-center gap-1.5">
                      <Footprints className="w-4 h-4" />
                      <span>Daily Steps Goal</span>
                    </span>
                    <span className="text-xs font-mono tabular-nums text-zinc-400">
                      {parseInt(stepsGoal || '0', 10).toLocaleString()} steps
                    </span>
                  </div>
                  <input
                    type="number"
                    inputMode="numeric"
                    min="100"
                    max="100000"
                    value={stepsGoal}
                    onChange={(e) => setStepsGoal(e.target.value)}
                    className="w-full min-h-[44px] bg-[#12141C] border border-white/10 rounded-xl px-3.5 text-base font-mono tabular-nums text-white"
                  />
                  <div className="grid grid-cols-4 gap-1.5">
                    {[6000, 8000, 10000, 12000].map((preset) => (
                      <button
                        key={preset}
                        type="button"
                        onClick={() => setStepsGoal(String(preset))}
                        className={`min-h-[34px] rounded-lg text-xs font-mono tabular-nums transition-colors ${
                          stepsGoal === String(preset)
                            ? 'bg-emerald-500 text-zinc-950 font-semibold'
                            : 'bg-zinc-900 text-zinc-400 hover:text-white'
                        }`}
                      >
                        {preset.toLocaleString()}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Sleep Target */}
                <div className="rounded-2xl bg-[#090A0F] border border-white/10 p-3.5 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-medium text-indigo-400 flex items-center gap-1.5">
                      <Moon className="w-4 h-4" />
                      <span>Daily Total Sleep Goal</span>
                    </span>
                    <span className="text-xs font-mono tabular-nums text-zinc-400">
                      {formatSleepDuration(
                        (parseInt(sleepHours || '0', 10) || 0) * 60 +
                          (parseInt(sleepMins || '0', 10) || 0)
                      )}
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-2.5">
                    <div className="relative">
                      <input
                        type="number"
                        min="1"
                        max="24"
                        value={sleepHours}
                        onChange={(e) => setSleepHours(e.target.value)}
                        className="w-full min-h-[44px] bg-[#12141C] border border-white/10 rounded-xl pl-3.5 pr-11 text-base font-mono tabular-nums text-white"
                      />
                      <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-xs text-zinc-500 font-mono">
                        hrs
                      </span>
                    </div>
                    <div className="relative">
                      <input
                        type="number"
                        min="0"
                        max="59"
                        value={sleepMins}
                        onChange={(e) => setSleepMins(e.target.value)}
                        className="w-full min-h-[44px] bg-[#12141C] border border-white/10 rounded-xl pl-3.5 pr-12 text-base font-mono tabular-nums text-white"
                      />
                      <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-xs text-zinc-500 font-mono">
                        mins
                      </span>
                    </div>
                  </div>
                </div>

                {/* Water Target */}
                <div className="rounded-2xl bg-[#090A0F] border border-white/10 p-3.5 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-medium text-sky-400 flex items-center gap-1.5">
                      <Droplets className="w-4 h-4" />
                      <span>Daily Water Intake Goal (ml)</span>
                    </span>
                    <span className="text-xs font-mono tabular-nums text-zinc-400">
                      {((parseInt(waterGoalMl || '0', 10) || 0) / 1000).toFixed(2)} L
                    </span>
                  </div>
                  <input
                    type="number"
                    inputMode="numeric"
                    min="250"
                    max="15000"
                    step="50"
                    value={waterGoalMl}
                    onChange={(e) => setWaterGoalMl(e.target.value)}
                    className="w-full min-h-[44px] bg-[#12141C] border border-white/10 rounded-xl px-3.5 text-base font-mono tabular-nums text-white"
                  />
                  <div className="grid grid-cols-4 gap-1.5">
                    {[2000, 2500, 3000, 3500].map((preset) => (
                      <button
                        key={preset}
                        type="button"
                        onClick={() => setWaterGoalMl(String(preset))}
                        className={`min-h-[34px] rounded-lg text-xs font-mono tabular-nums transition-colors ${
                          waterGoalMl === String(preset)
                            ? 'bg-sky-400 text-zinc-950 font-semibold'
                            : 'bg-zinc-900 text-zinc-400 hover:text-white'
                        }`}
                      >
                        {preset}ml
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* STEP 4: SKINCARE, HAIRCARE & BODYCARE ROUTINE QUESTIONNAIRE */}
          {step === 4 && (
            <form onSubmit={handleFinish} className="space-y-5">
              <div className="space-y-1">
                <div className="text-xs font-medium text-amber-400 flex items-center gap-1.5">
                  <Sparkles className="w-4 h-4" />
                  <span>Step 4 · Personal Care Routine Shelf</span>
                </div>
                <h1 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
                  Which essentials do you use in your routine?
                </h1>
                <p className="text-xs text-zinc-400">
                  Customize your Skincare, Haircare, and Bodycare categories. You can add bulk quantities (2+) and new categories anytime.
                </p>
              </div>

              <div className="space-y-4 max-h-[48vh] overflow-y-auto pr-1">
                {/* Skincare Categories */}
                <div className="rounded-2xl bg-[#090A0F] border border-white/10 p-3.5 space-y-2.5">
                  <span className="text-xs font-semibold text-rose-400 flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>1. Skincare Categories ({skincareCats.length})</span>
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {Array.from(new Set([...DEFAULT_SKINCARE_CATEGORIES, ...skincareCats])).map(
                      (cat) => {
                        const active = skincareCats.includes(cat);
                        return (
                          <button
                            key={cat}
                            type="button"
                            onClick={() => toggleCategory(skincareCats, setSkincareCats, cat)}
                            className={`min-h-[34px] px-3 py-1 rounded-xl text-xs font-medium transition-colors flex items-center gap-1.5 ${
                              active
                                ? 'bg-rose-500 text-white font-semibold'
                                : 'bg-zinc-900 text-zinc-400 hover:text-white border border-white/6'
                            }`}
                          >
                            {active && <Check className="w-3 h-3" />}
                            <span>{cat}</span>
                          </button>
                        );
                      }
                    )}
                  </div>
                  <div className="flex items-center gap-2 pt-1">
                    <input
                      type="text"
                      maxLength={50}
                      value={customSkincareInput}
                      onChange={(e) => setCustomSkincareInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          addCustomCategory(
                            customSkincareInput,
                            setCustomSkincareInput,
                            skincareCats,
                            setSkincareCats
                          );
                        }
                      }}
                      placeholder="Add custom skincare category..."
                      className="flex-1 min-h-[38px] bg-[#12141C] border border-white/10 rounded-xl px-3 text-xs text-white placeholder:text-zinc-600"
                    />
                    <button
                      type="button"
                      onClick={() =>
                        addCustomCategory(
                          customSkincareInput,
                          setCustomSkincareInput,
                          skincareCats,
                          setSkincareCats
                        )
                      }
                      className="min-h-[38px] px-3 rounded-xl bg-white/10 hover:bg-white/15 text-xs font-medium text-white flex items-center gap-1"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Add</span>
                    </button>
                  </div>
                </div>

                {/* Haircare Categories */}
                <div className="rounded-2xl bg-[#090A0F] border border-white/10 p-3.5 space-y-2.5">
                  <span className="text-xs font-semibold text-amber-400 flex items-center gap-1.5">
                    <Wind className="w-3.5 h-3.5" />
                    <span>2. Haircare Categories ({haircareCats.length})</span>
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {Array.from(new Set([...DEFAULT_HAIRCARE_CATEGORIES, ...haircareCats])).map(
                      (cat) => {
                        const active = haircareCats.includes(cat);
                        return (
                          <button
                            key={cat}
                            type="button"
                            onClick={() => toggleCategory(haircareCats, setHaircareCats, cat)}
                            className={`min-h-[34px] px-3 py-1 rounded-xl text-xs font-medium transition-colors flex items-center gap-1.5 ${
                              active
                                ? 'bg-amber-500 text-zinc-950 font-semibold'
                                : 'bg-zinc-900 text-zinc-400 hover:text-white border border-white/6'
                            }`}
                          >
                            {active && <Check className="w-3 h-3" />}
                            <span>{cat}</span>
                          </button>
                        );
                      }
                    )}
                  </div>
                  <div className="flex items-center gap-2 pt-1">
                    <input
                      type="text"
                      maxLength={50}
                      value={customHaircareInput}
                      onChange={(e) => setCustomHaircareInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          addCustomCategory(
                            customHaircareInput,
                            setCustomHaircareInput,
                            haircareCats,
                            setHaircareCats
                          );
                        }
                      }}
                      placeholder="Add custom haircare category..."
                      className="flex-1 min-h-[38px] bg-[#12141C] border border-white/10 rounded-xl px-3 text-xs text-white placeholder:text-zinc-600"
                    />
                    <button
                      type="button"
                      onClick={() =>
                        addCustomCategory(
                          customHaircareInput,
                          setCustomHaircareInput,
                          haircareCats,
                          setHaircareCats
                        )
                      }
                      className="min-h-[38px] px-3 rounded-xl bg-white/10 hover:bg-white/15 text-xs font-medium text-white flex items-center gap-1"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Add</span>
                    </button>
                  </div>
                </div>

                {/* Bodycare Categories */}
                <div className="rounded-2xl bg-[#090A0F] border border-white/10 p-3.5 space-y-2.5">
                  <span className="text-xs font-semibold text-sky-400 flex items-center gap-1.5">
                    <Droplet className="w-3.5 h-3.5" />
                    <span>3. Bodycare Categories ({bodycareCats.length})</span>
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {Array.from(new Set([...DEFAULT_BODYCARE_CATEGORIES, ...bodycareCats])).map(
                      (cat) => {
                        const active = bodycareCats.includes(cat);
                        return (
                          <button
                            key={cat}
                            type="button"
                            onClick={() => toggleCategory(bodycareCats, setBodycareCats, cat)}
                            className={`min-h-[34px] px-3 py-1 rounded-xl text-xs font-medium transition-colors flex items-center gap-1.5 ${
                              active
                                ? 'bg-sky-400 text-zinc-950 font-semibold'
                                : 'bg-zinc-900 text-zinc-400 hover:text-white border border-white/6'
                            }`}
                          >
                            {active && <Check className="w-3 h-3" />}
                            <span>{cat}</span>
                          </button>
                        );
                      }
                    )}
                  </div>
                  <div className="flex items-center gap-2 pt-1">
                    <input
                      type="text"
                      maxLength={50}
                      value={customBodycareInput}
                      onChange={(e) => setCustomBodycareInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          addCustomCategory(
                            customBodycareInput,
                            setCustomBodycareInput,
                            bodycareCats,
                            setBodycareCats
                          );
                        }
                      }}
                      placeholder="Add custom bodycare category..."
                      className="flex-1 min-h-[38px] bg-[#12141C] border border-white/10 rounded-xl px-3 text-xs text-white placeholder:text-zinc-600"
                    />
                    <button
                      type="button"
                      onClick={() =>
                        addCustomCategory(
                          customBodycareInput,
                          setCustomBodycareInput,
                          bodycareCats,
                          setBodycareCats
                        )
                      }
                      className="min-h-[38px] px-3 rounded-xl bg-white/10 hover:bg-white/15 text-xs font-medium text-white flex items-center gap-1"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Add</span>
                    </button>
                  </div>
                </div>
              </div>

              {error && <p className="text-xs text-rose-400">{error}</p>}

              <div className="flex items-center justify-between gap-3 pt-2 border-t border-white/10">
                <button
                  type="button"
                  onClick={() => setStep(3)}
                  className="min-h-[46px] px-4 rounded-2xl bg-white/5 hover:bg-white/10 text-xs font-medium text-zinc-300 flex items-center gap-2 transition-colors"
                >
                  <ArrowLeft className="w-4 h-4" />
                  <span>Back</span>
                </button>

                <button
                  type="submit"
                  disabled={submitting}
                  className="flex-1 sm:flex-initial min-h-[48px] px-6 rounded-2xl bg-white text-zinc-950 hover:bg-zinc-200 text-xs sm:text-sm font-semibold flex items-center justify-center gap-2 transition-colors"
                >
                  <Check className="w-4 h-4" />
                  <span>
                    {submitting ? 'Saving to Cloud...' : 'Finish & Open Dashboard'}
                  </span>
                </button>
              </div>
            </form>
          )}

          {/* Navigation Footer for Steps 1-3 */}
          {step < 4 && (
            <>
              {error && <p className="text-xs text-rose-400">{error}</p>}
              <div className="flex items-center justify-between gap-3 pt-2 border-t border-white/10">
                {step > 1 ? (
                  <button
                    type="button"
                    onClick={() => setStep((prev) => (prev - 1) as 1 | 2 | 3 | 4)}
                    className="min-h-[46px] px-4 rounded-2xl bg-white/5 hover:bg-white/10 text-xs font-medium text-zinc-300 flex items-center gap-2 transition-colors"
                  >
                    <ArrowLeft className="w-4 h-4" />
                    <span>Back</span>
                  </button>
                ) : (
                  <div />
                )}

                <button
                  type="button"
                  onClick={handleNextStep}
                  className="flex-1 sm:flex-initial min-h-[48px] px-6 rounded-2xl bg-white text-zinc-950 hover:bg-zinc-200 text-xs sm:text-sm font-semibold flex items-center justify-center gap-2 transition-colors"
                >
                  <span>Continue</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
