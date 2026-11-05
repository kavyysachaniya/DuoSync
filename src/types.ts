import { Timestamp } from 'firebase/firestore';

export type ProfileSlot = 'partner1' | 'partner2';
export type ProductOwnerSlot = 'partner1' | 'partner2' | 'shared';
export type CareSegment = 'skincare' | 'haircare' | 'bodycare';
export type ProductStatus = 'in_use' | 'unopened' | 'finished';
export type RoutineTime = 'am' | 'pm' | 'both' | 'weekly';
export type TopNavSection = 'health' | 'skin' | 'wardrobe';
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

// Unreliable integrations (Google Fit & Samsung Health) removed as requested.
// Direct manual logging is prioritized along with supported summary inputs.
export const FITNESS_APP_CATALOG: FitnessAppOption[] = [
  {
    id: 'manual',
    name: 'Manual Daily Tracking',
    shortLabel: 'Manual Log',
    ecosystem: 'Direct Input Only',
    supportsDirectCloudSync: false,
    description:
      'Log your exact end-of-day steps, weight, sleep, and water directly on the dashboard.',
    accentColor: '#A1A1AA',
  },
  {
    id: 'apple_health',
    name: 'Apple Health',
    shortLabel: 'Apple Health',
    ecosystem: 'iPhone · Apple Watch',
    supportsDirectCloudSync: false,
    description:
      'Track iPhone & Apple Watch daily activity metrics directly on the dashboard.',
    accentColor: '#F43F5E',
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
  scheduleType?: 'daily' | 'weekly';
  scheduledDays?: WeekDay[];
  notes: string;
  updatedByUid: string;
  createdAt?: Timestamp;
  updatedAt?: Timestamp;
}

export type WeekDay =
  | 'monday'
  | 'tuesday'
  | 'wednesday'
  | 'thursday'
  | 'friday'
  | 'saturday'
  | 'sunday';

export const WEEKDAY_OPTIONS: { id: WeekDay; label: string; shortLabel: string }[] = [
  { id: 'monday', label: 'Monday', shortLabel: 'Mon' },
  { id: 'tuesday', label: 'Tuesday', shortLabel: 'Tue' },
  { id: 'wednesday', label: 'Wednesday', shortLabel: 'Wed' },
  { id: 'thursday', label: 'Thursday', shortLabel: 'Thu' },
  { id: 'friday', label: 'Friday', shortLabel: 'Fri' },
  { id: 'saturday', label: 'Saturday', shortLabel: 'Sat' },
  { id: 'sunday', label: 'Sunday', shortLabel: 'Sun' },
];

export function getWeekdayFromDate(dateStr: string): WeekDay {
  const [y, m, d] = dateStr.split('-').map(Number);
  const date = new Date(y, m - 1, d);
  const days: WeekDay[] = [
    'sunday',
    'monday',
    'tuesday',
    'wednesday',
    'thursday',
    'friday',
    'saturday',
  ];
  return days[date.getDay()];
}

export function getDayDisplayName(dateStr: string): string {
  const [y, m, d] = dateStr.split('-').map(Number);
  const date = new Date(y, m - 1, d);
  return date.toLocaleDateString('en-US', { weekday: 'long' });
}

export interface RoutineCompletionDoc {
  id: string; // Deterministic: `${profileSlot}_${productId}_${date}`
  workspaceId: string;
  profileSlot: ProfileSlot;
  productId: string;
  date: string; // YYYY-MM-DD
  completed: boolean;
  completedAt: Timestamp;
  updatedByUid: string;
  createdAt?: Timestamp;
  updatedAt?: Timestamp;
}

export type WardrobeCategory =
  | 'Tops'
  | 'Bottoms'
  | 'Footwear'
  | 'Outerwear'
  | 'Accessories'
  | 'Dresses'
  | 'Activewear';

export const WARDROBE_CATEGORIES: WardrobeCategory[] = [
  'Tops',
  'Bottoms',
  'Footwear',
  'Outerwear',
  'Accessories',
  'Dresses',
  'Activewear',
];

export type WardrobeOccasion =
  | 'Casual'
  | 'College'
  | 'Formal'
  | 'Party'
  | 'Date Night'
  | 'Work'
  | 'Athletic';

export const WARDROBE_OCCASIONS: WardrobeOccasion[] = [
  'Casual',
  'College',
  'Formal',
  'Party',
  'Date Night',
  'Work',
  'Athletic',
];

export type WardrobeSeason =
  | 'All Season'
  | 'Spring'
  | 'Summer'
  | 'Fall'
  | 'Winter';

export const WARDROBE_SEASONS: WardrobeSeason[] = [
  'All Season',
  'Spring',
  'Summer',
  'Fall',
  'Winter',
];

export interface WardrobeItemDoc {
  id: string;
  workspaceId: string;
  profileSlot: ProductOwnerSlot;
  name: string;
  category: string;
  brand: string;
  color: string;
  size: string;
  season: string;
  occasion: string;
  imageUrl: string;
  notes: string;
  updatedByUid: string;
  createdAt?: Timestamp;
  updatedAt?: Timestamp;
}

export interface OutfitDoc {
  id: string;
  workspaceId: string;
  profileSlot: ProductOwnerSlot;
  name: string;
  occasion: string;
  itemIds: string[];
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
