import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider } from 'firebase/auth';
import { doc, getDocFromServer, getFirestore } from 'firebase/firestore';
import firebaseConfig from '../firebase-applet-config.json';

const app = initializeApp(firebaseConfig);
export const db = (firebaseConfig.firestoreDatabaseId && firebaseConfig.firestoreDatabaseId !== '(default)' && !firebaseConfig.firestoreDatabaseId.startsWith('ai-studio-'))
  ? getFirestore(app, firebaseConfig.firestoreDatabaseId)
  : getFirestore(app);
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();

// Validate connection to Firestore on startup as required
async function testConnection() {
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
  } catch (error) {
    if (error instanceof Error && error.message.includes('the client is offline')) {
      console.error('Please check your Firebase configuration.');
    }
  }
}
testConnection();

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  };
}

export function handleFirestoreError(
  error: unknown,
  operationType: OperationType,
  path: string | null
): never {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo:
        auth.currentUser?.providerData?.map((provider) => ({
          providerId: provider.providerId,
          email: provider.email,
        })) || [],
    },
    operationType,
    path,
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

// Validation constants synchronized verbatim with firebase-blueprint.json & firestore.rules
export const VALIDATION_BOUNDS = {
  ID_PATTERN: /^[a-zA-Z0-9_\-]+$/,
  PAIRING_CODE_PATTERN: /^[0-9]{6}$/,
  DATE_PATTERN: /^[0-9]{4}-[0-9]{2}-[0-9]{2}$/,
  MAX_DISPLAY_NAME: 60,
  MAX_ROLE_LABEL: 40,
  MAX_CURRENCY: 6,
  MAX_CATEGORIES_PER_SEGMENT: 30,
  MAX_CATEGORY_NAME: 50,
  MAX_PRODUCTS_PER_WORKSPACE: 100,
  MAX_PRODUCT_NAME: 100,
  MAX_BRAND_NAME: 80,
  MAX_QUANTITY: 999,
  MAX_DATE_STR: 20,
  MAX_SALE_INFO: 100,
  MAX_NOTE: 280,
  MAX_WEIGHT: 500,
  MAX_STEPS: 200000,
  MAX_SLEEP_MINUTES: 1440,
  MAX_WATER_ML: 20000,
  MAX_PRICE: 1000000,
  MAX_WARDROBE_NAME: 100,
  MAX_WARDROBE_CATEGORY: 50,
  MAX_WARDROBE_BRAND: 80,
  MAX_WARDROBE_COLOR: 40,
  MAX_WARDROBE_SIZE: 20,
  MAX_WARDROBE_SEASON: 40,
  MAX_WARDROBE_OCCASION: 50,
  MAX_WARDROBE_IMAGE_URL: 200000,
  MAX_WARDROBE_NOTE: 500,
  MAX_OUTFIT_NAME: 100,
  MAX_OUTFIT_OCCASION: 50,
  MAX_OUTFIT_ITEMS: 30,
  MAX_OUTFIT_NOTE: 500,
} as const;

export function sanitizeString(val: string, maxLength: number, fallback = ''): string {
  const trimmed = (val ?? '').trim();
  if (!trimmed && fallback) return fallback.slice(0, maxLength);
  return trimmed.slice(0, maxLength);
}

export function clampNumber(val: number, min: number, max: number, fallback = 0): number {
  if (typeof val !== 'number' || Number.isNaN(val) || !Number.isFinite(val)) {
    return fallback;
  }
  return Math.min(max, Math.max(min, val));
}
