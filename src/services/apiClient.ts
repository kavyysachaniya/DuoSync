// DuoSync Front-End API Client (Neon Serverless Backend)

const TOKEN_KEY = 'duosync_auth_token';

export function getStoredToken(): string | null {
  try {
    return localStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
}

export function setStoredToken(token: string | null): void {
  try {
    if (token) {
      localStorage.setItem(TOKEN_KEY, token);
    } else {
      localStorage.removeItem(TOKEN_KEY);
    }
  } catch {
    // Local storage disabled or quota exceeded
  }
}

interface FetchOptions extends RequestInit {
  data?: unknown;
}

async function request<T>(endpoint: string, options: FetchOptions = {}): Promise<T> {
  const token = getStoredToken();
  const headers = new Headers(options.headers || {});

  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  if (options.data && !(options.data instanceof FormData)) {
    headers.set('Content-Type', 'application/json');
    options.body = JSON.stringify(options.data);
  }

  const res = await fetch(endpoint, {
    ...options,
    headers,
  });

  const contentType = res.headers.get('content-type');
  const isJson = contentType && contentType.includes('application/json');
  const result = isJson ? await res.json() : await res.text();

  if (!res.ok) {
    const errorMsg =
      (result && typeof result === 'object' && 'error' in result && (result as { error: string }).error) ||
      `Request failed with status ${res.status}`;
    throw new Error(errorMsg);
  }

  return result as T;
}

export interface AuthResponse {
  token: string;
  user: {
    id: string;
    email: string;
    display_name: string;
    workspace_id: string | null;
    default_slot: 'partner1' | 'partner2';
    onboarding_completed: boolean;
  };
  workspace: Record<string, unknown> | null;
  members: Record<string, unknown>[];
  pairingCode: string;
}

export interface WorkspaceSyncState {
  workspace: Record<string, unknown>;
  members: Record<string, unknown>[];
  healthLogs: Record<string, unknown>[];
  careProducts: Record<string, unknown>[];
  routineCompletions: Record<string, unknown>[];
  wardrobeItems: Record<string, unknown>[];
  outfits: Record<string, unknown>[];
  pairingCode: string;
  timestamp: number;
}

export const api = {
  auth: {
    register: (data: { email: string; password: string; name?: string; defaultSlot?: string }) =>
      request<AuthResponse>('/api/auth/register', { method: 'POST', data }),

    login: (data: { email: string; password: string }) =>
      request<AuthResponse>('/api/auth/login', { method: 'POST', data }),

    getMe: () =>
      request<Omit<AuthResponse, 'token'>>('/api/auth/me', { method: 'GET' }),

    logout: () => {
      setStoredToken(null);
    },

    hasToken: () => Boolean(getStoredToken()),
  },

  sync: {
    poll: (workspaceId: string, since: number) =>
      request<{ timestamp: number; changed: boolean }>(
        `/api/sync/poll?workspace_id=${encodeURIComponent(workspaceId)}&since=${since}`,
        { method: 'GET' }
      ),

    getAll: (workspaceId: string) =>
      request<WorkspaceSyncState>(
        `/api/sync/all?workspace_id=${encodeURIComponent(workspaceId)}`,
        { method: 'GET' }
      ),
  },

  mutate: {
    saveHealthLog: (data: {
      workspaceId: string;
      profileSlot: string;
      date: string;
      weight?: number;
      steps?: number;
      sleepMinutes?: number;
      waterMl?: number;
      note?: string;
    }) => request<{ success: boolean; timestamp: number; id: string }>('/api/mutate/health-log', {
      method: 'POST',
      data,
    }),

    updatePartnerGoals: (data: {
      workspaceId: string;
      slot: string;
      name?: string;
      role?: string;
      weightUnit?: string;
      targetWeight?: number;
      startWeight?: number;
      stepsGoal?: number;
      sleepGoalMinutes?: number;
      waterGoalMl?: number;
    }) => request<{ success: boolean; timestamp: number }>('/api/mutate/partner-goals', {
      method: 'POST',
      data,
    }),

    saveCareProduct: (data: Record<string, unknown>) =>
      request<{ success: boolean; timestamp: number; id: string }>('/api/mutate/care-product', {
        method: 'POST',
        data,
      }),

    deleteCareProduct: (id: string, workspaceId: string) =>
      request<{ success: boolean; timestamp: number }>('/api/mutate/care-product', {
        method: 'DELETE',
        data: { id, workspaceId },
      }),

    toggleRoutineCompletion: (data: {
      workspaceId: string;
      profileSlot: string;
      productId: string;
      date: string;
      completed: boolean;
    }) =>
      request<{ success: boolean; timestamp: number; id: string }>('/api/mutate/routine-completion', {
        method: 'POST',
        data,
      }),

    saveWardrobeItem: (data: Record<string, unknown>) =>
      request<{ success: boolean; timestamp: number; id: string }>('/api/mutate/wardrobe-item', {
        method: 'POST',
        data,
      }),

    deleteWardrobeItem: (id: string, workspaceId: string) =>
      request<{ success: boolean; timestamp: number }>('/api/mutate/wardrobe-item', {
        method: 'DELETE',
        data: { id, workspaceId },
      }),

    saveOutfit: (data: Record<string, unknown>) =>
      request<{ success: boolean; timestamp: number; id: string }>('/api/mutate/outfit', {
        method: 'POST',
        data,
      }),

    deleteOutfit: (id: string, workspaceId: string) =>
      request<{ success: boolean; timestamp: number }>('/api/mutate/outfit', {
        method: 'DELETE',
        data: { id, workspaceId },
      }),

    updateCategories: (data: {
      workspaceId: string;
      skincareCategories?: string[];
      haircareCategories?: string[];
      bodycareCategories?: string[];
    }) =>
      request<{ success: boolean; timestamp: number }>('/api/mutate/categories', {
        method: 'POST',
        data,
      }),

    pairWithPartner: (code: string, submission: any) =>
      request<{
        success: boolean;
        timestamp: number;
        workspace: Record<string, unknown>;
        members: Record<string, unknown>[];
        defaultSlot: 'partner1' | 'partner2';
      }>('/api/mutate/pair', {
        method: 'POST',
        data: { code, submission },
      }),

    completeOnboarding: (workspaceId: string, slot: string, submission: any) =>
      request<{ success: boolean; timestamp: number }>('/api/mutate/onboarding', {
        method: 'POST',
        data: { workspaceId, slot, submission },
      }),
  },

  upload: {
    uploadImage: (imageBase64: string, filename: string, workspaceId: string) =>
      request<{
        imageUrl: string;
        thumbnailUrl: string;
        provider: string;
      }>('/api/upload', {
        method: 'POST',
        data: { imageBase64, filename, workspaceId },
      }),
  },
};
