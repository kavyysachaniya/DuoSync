import { Timestamp } from 'firebase/firestore';

export type ProfileSlot = 'partner1' | 'partner2';
export type ProductOwnerSlot = 'partner1' | 'partner2' | 'shared';
export type CareSegment = 'skincare' | 'haircare' | 'bodycare';
export type ProductStatus = 'in_use' | 'unopened' | 'finished';
export type RoutineTime = 'am' | 'pm' | 'both' | 'weekly';
export type TopNavSection = 'health' | 'skin';
export type FitnessAppId =
  | 'google_fit'
  | 'apple_health'
  | 'samsung_health'
  | 'fitbit'
  | 'garmin'
  | 'manual';

export interface FitnessAppOption {
  id: FitnessAppId;
  name: string;
  shortLabel: string;
  ecosystem: string;
  supportsDirectCloudSync: boolean;
  description: string;
  accentColor: string;
}

export const FITNESS_APP_CATALOG: FitnessAppOption[] = [
  {
    id: 'google_fit',
    name: 'Google Fit',
    shortLabel: 'Google Fit',
    ecosystem: 'Android · Wear OS · iOS',
    supportsDirectCloudSync: true,
    description:
      'Direct Google OAuth sync for daily Steps, Weight, Sleep duration, and Hydration.',
    accentColor: '#10B981',
  },
  {
    id: 'apple_health',
    name: 'Apple Health',
    shortLabel: 'Apple Health',
    ecosystem: 'iPhone · Apple Watch',
    supportsDirectCloudSync: false,
    description:
      'Sync iPhone & Apple Watch daily rings via quick summary paste or end-of-day entry.',
    accentColor: '#F43F5E',
  },
  {
    id: 'samsung_health',
    name: 'Samsung Health',
    shortLabel: 'Samsung Health',
    ecosystem: 'Galaxy Phone · Galaxy Watch',
    supportsDirectCloudSync: false,
    description:
      'Sync Galaxy Watch & Samsung Health daily steps, sleep, weight, and water logs.',
    accentColor: '#38BDF8',
  },
  {
    id: 'fitbit',
    name: 'Fitbit',
    shortLabel: 'Fitbit',
    ecosystem: 'Fitbit · Pixel Watch',
    supportsDirectCloudSync: false,
    description:
      'Track and import daily Fitbit step count, sleep stages total, weight, and water.',
    accentColor: '#14B8A6',
  },
  {
    id: 'garmin',
    name: 'Garmin Connect',
    shortLabel: 'Garmin',
    ecosystem: 'Garmin Watch · Index Scale',
    supportsDirectCloudSync: false,
    description:
      'Log daily Garmin Connect step totals, sleep duration, body weight, and hydration.',
    accentColor: '#818CF8',
  },
  {
    id: 'manual',
    name: 'Manual Daily Log',
    shortLabel: 'Manual Log',
    ecosystem: 'Direct Input Only',
    supportsDirectCloudSync: false,
    description:
      'Log your exact end-of-day steps, weight, sleep, and water directly on the dashboard.',
    accentColor: '#A1A1AA',
  },
];

export function getFitnessAppMeta(id?: FitnessAppId): FitnessAppOption {
  return (
    FITNESS_APP_CATALOG.find((app) => app.id === id) || FITNESS_APP_CATALOG[0]
  );
}

export interface UserDoc {
  uid: string;
  displayName: string;
  workspaceId: string;
  defaultSlot: ProfileSlot;
  onboardingCompleted: boolean;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface PairingCodeDoc {
  code: string;
  workspaceId: string;
  ownerUid: string;
  ownerName: string;
  createdAt: Timestamp;
}

export interface WorkspaceDoc {
  id: string;
  ownerUid: string;
  partnerUid: string;
  pairingCode: string;
  onboardingCompleted: boolean;
  currency: string;

  partner1Name: string;
  partner1Role: string;
  partner1WeightUnit: 'kg' | 'lbs';
  partner1TargetWeight: number;
  partner1StartWeight: number;
  partner1StepsGoal: number;
  partner1SleepGoalMinutes: number;
  partner1WaterGoalMl: number;
  partner1FitnessApp: FitnessAppId;

  partner2Name: string;
  partner2Role: string;
  partner2WeightUnit: 'kg' | 'lbs';
  partner2TargetWeight: number;
  partner2StartWeight: number;
  partner2StepsGoal: number;
  partner2SleepGoalMinutes: number;
  partner2WaterGoalMl: number;
  partner2FitnessApp: FitnessAppId;

  skincareCategories: string[];
  haircareCategories: string[];
  bodycareCategories: string[];
  productIds: string[];

  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface HealthLogDoc {
  id: string;
  workspaceId: string;
  profileSlot: ProfileSlot;
  date: string; // YYYY-MM-DD
  weight: number;
  steps: number;
  sleepMinutes: number;
  waterMl: number;
  note: string;
  updatedByUid: string;
  createdAt?: Timestamp;
  updatedAt?: Timestamp;
}

export interface CareProductDoc {
  id: string;
  workspaceId: string;
  profileSlot: ProductOwnerSlot;
  segment: CareSegment;
  subCategory: string;
  name: string;
  brand: string;
  quantity: number;
  orderedDate: string;
  openedDate: string;
  expiryDate: string;
  saleInfo: string;
  pricePaid: number;
  originalPrice: number;
  status: ProductStatus;
  routineTime: RoutineTime;
  notes: string;
  updatedByUid: string;
  createdAt?: Timestamp;
  updatedAt?: Timestamp;
}

export interface PartnerProfileView {
  slot: ProfileSlot;
  name: string;
  role: string;
  weightUnit: 'kg' | 'lbs';
  targetWeight: number;
  startWeight: number;
  stepsGoal: number;
  sleepGoalMinutes: number;
  waterGoalMl: number;
  fitnessApp: FitnessAppId;
}

export const DEFAULT_SKINCARE_CATEGORIES = [
  'Cleanser',
  'Toner',
  'Essence',
  'Serum',
  'Moisturizer',
  'Sunscreen',
  'Eye Cream',
  'Lip Care',
  'Face Mask',
  'Exfoliator',
];

export const DEFAULT_HAIRCARE_CATEGORIES = [
  'Shampoo',
  'Conditioner',
  'Hair Mask',
  'Hair Serum',
  'Scalp Oil',
  'Leave-In Cream',
  'Heat Protectant',
];

export const DEFAULT_BODYCARE_CATEGORIES = [
  'Body Wash',
  'Body Lotion',
  'Body Oil',
  'Body Scrub',
  'Deodorant',
  'Hand Cream',
  'Body Sunscreen',
];

export function formatLocalDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function getLastNDates(n: number, referenceDateStr?: string): string[] {
  const base = referenceDateStr ? new Date(`${referenceDateStr}T12:00:00`) : new Date();
  const dates: string[] = [];
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date(base);
    d.setDate(base.getDate() - i);
    dates.push(formatLocalDate(d));
  }
  return dates;
}

export function formatSleepDuration(totalMinutes: number): string {
  if (!totalMinutes || totalMinutes <= 0) return '0h 00m';
  const hrs = Math.floor(totalMinutes / 60);
  const mins = Math.round(totalMinutes % 60);
  return `${hrs}h ${String(mins).padStart(2, '0')}m`;
}

export function formatShortDate(dateStr: string): string {
  if (!dateStr) return '—';
  const parts = dateStr.split('-');
  if (parts.length !== 3) return dateStr;
  const d = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
  if (Number.isNaN(d.getTime())) return dateStr;
  return d.toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' });
}
