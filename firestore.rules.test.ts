/**
 * Security Rules Red-Team Test Suite for DuoPulse
 * Verifies all 12 Dirty Dozen adversarial payloads return PERMISSION_DENIED.
 */

export interface DirtyDozenTestCase {
  id: number;
  name: string;
  operation: 'get' | 'list' | 'create' | 'update' | 'delete';
  path: string;
  auth: { uid: string; email_verified: boolean } | null;
  payload?: Record<string, unknown>;
  expectedResult: 'PERMISSION_DENIED';
}

export const DIRTY_DOZEN_TEST_CASES: DirtyDozenTestCase[] = [
  {
    id: 1,
    name: 'Unverified Email Spoof on User Profile Creation',
    operation: 'create',
    path: '/users/user_1',
    auth: { uid: 'user_1', email_verified: false },
    payload: {
      uid: 'user_1',
      displayName: 'Kavy',
      workspaceId: 'ws_1',
      defaultSlot: 'partner1',
    },
    expectedResult: 'PERMISSION_DENIED',
  },
  {
    id: 2,
    name: 'Cross-User Profile Snoop',
    operation: 'get',
    path: '/users/user_1',
    auth: { uid: 'user_2', email_verified: true },
    expectedResult: 'PERMISSION_DENIED',
  },
  {
    id: 3,
    name: 'Shadow Field Injection on Workspace',
    operation: 'update',
    path: '/workspaces/ws_1',
    auth: { uid: 'user_1', email_verified: true },
    payload: {
      isAdmin: true,
    },
    expectedResult: 'PERMISSION_DENIED',
  },
  {
    id: 4,
    name: 'Owner Hijack on Workspace Update',
    operation: 'update',
    path: '/workspaces/ws_1',
    auth: { uid: 'user_2', email_verified: true },
    payload: {
      ownerUid: 'user_2',
    },
    expectedResult: 'PERMISSION_DENIED',
  },
  {
    id: 5,
    name: 'Hijacking Already-Paired Workspace',
    operation: 'update',
    path: '/workspaces/ws_1',
    auth: { uid: 'user_3', email_verified: true },
    payload: {
      partnerUid: 'user_3',
    },
    expectedResult: 'PERMISSION_DENIED',
  },
  {
    id: 6,
    name: 'Orphaned Pairing Code Creation Without Workspace',
    operation: 'create',
    path: '/pairingCodes/123456',
    auth: { uid: 'user_1', email_verified: true },
    payload: {
      code: '123456',
      workspaceId: 'ws_nonexistent',
      ownerUid: 'user_1',
      ownerName: 'Kavy',
    },
    expectedResult: 'PERMISSION_DENIED',
  },
  {
    id: 7,
    name: 'Collection Scraping via List Query on PairingCodes',
    operation: 'list',
    path: '/pairingCodes',
    auth: { uid: 'user_1', email_verified: true },
    expectedResult: 'PERMISSION_DENIED',
  },
  {
    id: 8,
    name: 'Unauthorized Health Log Write by Non-Member',
    operation: 'create',
    path: '/workspaces/ws_1/healthLogs/partner2_2026-11-03',
    auth: { uid: 'user_3', email_verified: true },
    payload: {
      id: 'partner2_2026-11-03',
      workspaceId: 'ws_1',
      profileSlot: 'partner2',
      date: '2026-11-03',
      weight: 54.5,
      steps: 8500,
      sleepMinutes: 460,
      waterMl: 2200,
      note: 'Unauthorized entry',
      updatedByUid: 'user_3',
    },
    expectedResult: 'PERMISSION_DENIED',
  },
  {
    id: 9,
    name: 'Value Poisoning on Health Log (Negative Steps)',
    operation: 'update',
    path: '/workspaces/ws_1/healthLogs/partner2_2026-11-03',
    auth: { uid: 'user_1', email_verified: true },
    payload: {
      steps: -500,
    },
    expectedResult: 'PERMISSION_DENIED',
  },
  {
    id: 10,
    name: 'Denial-of-Wallet Oversized Sub-Category Array (>30 items)',
    operation: 'update',
    path: '/workspaces/ws_1',
    auth: { uid: 'user_1', email_verified: true },
    payload: {
      skincareCategories: new Array(35).fill('Category'),
    },
    expectedResult: 'PERMISSION_DENIED',
  },
  {
    id: 11,
    name: 'Forged Client Timestamp on CareProduct Creation',
    operation: 'create',
    path: '/workspaces/ws_1/careProducts/prod_1',
    auth: { uid: 'user_1', email_verified: true },
    payload: {
      createdAt: '2020-01-01T00:00:00Z',
    },
    expectedResult: 'PERMISSION_DENIED',
  },
  {
    id: 12,
    name: 'Identity Spoofing on CareProduct updatedByUid',
    operation: 'create',
    path: '/workspaces/ws_1/careProducts/prod_1',
    auth: { uid: 'user_1', email_verified: true },
    payload: {
      updatedByUid: 'user_2',
    },
    expectedResult: 'PERMISSION_DENIED',
  },
];
