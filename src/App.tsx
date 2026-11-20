import React, { useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import {
  Activity,
  AlertCircle,
  Droplet,
  HeartHandshake,
  RotateCcw,
  Sparkles,
  Users,
  Wind,
} from 'lucide-react';
import {
  CareProductDoc,
  CareSegment,
  DEFAULT_BODYCARE_CATEGORIES,
  DEFAULT_HAIRCARE_CATEGORIES,
  DEFAULT_SKINCARE_CATEGORIES,
  DEFAULT_WARDROBE_CATEGORIES,
  FitnessAppId,
  formatLocalDate,
  HealthLogDoc,
  OutfitDoc,
  PartnerProfileView,
  ProfileSlot,
  RoutineCompletionDoc,
  TopNavSection,
  UserDoc,
  WardrobeItemDoc,
  WorkspaceDoc,
} from './types';
import { HealthDashboard } from './components/HealthDashboard';
import { SkinDashboard } from './components/SkinDashboard';
import { WardrobeDashboard } from './components/WardrobeDashboard';
import { AccountModal } from './components/AccountModal';
import { UserAvatar } from './components/UserAvatar';
import { OnboardingSubmission, OnboardingWizard } from './components/OnboardingWizard';
import { AuthCard } from './components/AuthCard';
import { LandingPage } from './components/landing/LandingPage';
import { api, AuthResponse, setStoredToken } from './services/apiClient';
import { ShampooBottleNavIcon, CollaredShirtNavIcon } from './components/SkinIcons';

interface AppUser {
  id: string;
  email: string;
  displayName: string;
  workspaceId: string;
  defaultSlot: ProfileSlot;
  onboardingCompleted: boolean;
}

function mapToWorkspaceDoc(ws: any, members: any[], pairingCode: string): WorkspaceDoc {
  const m1 = members?.find((m: any) => m.slot === 'partner1') || {};
  const m2 = members?.find((m: any) => m.slot === 'partner2') || {};

  return {
    id: ws.id,
    ownerUid: ws.owner_id || '',
    partnerUid: m2.user_id || '',
    pairingCode: pairingCode || '',
    onboardingCompleted: Boolean(ws.onboarding_completed),
    currency: ws.currency || '₹',
    partner1Name: m1.name || 'Partner 1',
    partner1Role: m1.role || 'Partner 1’s Dashboard',
    partner1WeightUnit: m1.weight_unit || 'kg',
    partner1TargetWeight: Number(m1.target_weight) || 62,
    partner1StartWeight: Number(m1.start_weight) || 65,
    partner1StepsGoal: Number(m1.steps_goal) || 8500,
    partner1SleepGoalMinutes: Number(m1.sleep_goal_minutes) || 480,
    partner1WaterGoalMl: Number(m1.water_goal_ml) || 2500,
    partner1FitnessApp: 'manual',
    partner2Name: m2.name || 'Partner 2',
    partner2Role: m2.role || 'Partner 2’s Dashboard',
    partner2WeightUnit: m2.weight_unit || 'kg',
    partner2TargetWeight: Number(m2.target_weight) || 55,
    partner2StartWeight: Number(m2.start_weight) || 58,
    partner2StepsGoal: Number(m2.steps_goal) || 8500,
    partner2SleepGoalMinutes: Number(m2.sleep_goal_minutes) || 480,
    partner2WaterGoalMl: Number(m2.water_goal_ml) || 2500,
    partner2FitnessApp: 'manual',
    skincareCategories: ws.skincare_categories || DEFAULT_SKINCARE_CATEGORIES,
    haircareCategories: ws.haircare_categories || DEFAULT_HAIRCARE_CATEGORIES,
    bodycareCategories: ws.bodycare_categories || DEFAULT_BODYCARE_CATEGORIES,
    wardrobeCategories: (() => {
      if (ws.wardrobe_categories && Array.isArray(ws.wardrobe_categories) && ws.wardrobe_categories.length > 0) {
        return ws.wardrobe_categories;
      }
      try {
        const cached = localStorage.getItem(`duosync_wardrobe_categories_${ws.id}`);
        if (cached) {
          const parsed = JSON.parse(cached);
          if (Array.isArray(parsed) && parsed.length > 0) return parsed;
        }
      } catch {}
      return DEFAULT_WARDROBE_CATEGORIES;
    })(),
    productIds: ws.product_ids || [],
    createdAt: ws.created_at as any,
    updatedAt: ws.updated_at as any,
  };
}

function getCachedProductImage(id: string): string {
  if (typeof localStorage === 'undefined') return '';
  try {
    return localStorage.getItem(`duosync_img_care_${id}`) || '';
  } catch {
    return '';
  }
}

function setCachedProductImage(id: string, url: string) {
  if (typeof localStorage === 'undefined') return;
  try {
    if (url) {
      localStorage.setItem(`duosync_img_care_${id}`, url);
    } else {
      localStorage.removeItem(`duosync_img_care_${id}`);
    }
  } catch {}
}

function getCachedWardrobeImage(id: string): string {
  if (typeof localStorage === 'undefined') return '';
  try {
    return localStorage.getItem(`duosync_img_wardrobe_${id}`) || '';
  } catch {
    return '';
  }
}

function setCachedWardrobeImage(id: string, url: string) {
  if (typeof localStorage === 'undefined') return;
  try {
    if (url) {
      localStorage.setItem(`duosync_img_wardrobe_${id}`, url);
    } else {
      localStorage.removeItem(`duosync_img_wardrobe_${id}`);
    }
  } catch {}
}

export default function App() {
  const todayDate = useMemo(() => formatLocalDate(new Date()), []);

  // Authentication State
  const [authUser, setAuthUser] = useState<AppUser | null>(null);
  const [authReady, setAuthReady] = useState(false);

  // Workspace & Profile Documents
  const [userDoc, setUserDoc] = useState<UserDoc | null>(null);
  const [workspace, setWorkspace] = useState<WorkspaceDoc | null>(null);
  const [manualWizardOpen, setManualWizardOpen] = useState(false);

  // Sync Diagnostics & Error Handling
  const [syncError, setSyncError] = useState<string | null>(null);
  const [syncTakingTooLong, setSyncTakingTooLong] = useState(false);

  const lastSyncTimestampRef = useRef<number>(0);
  const isSyncingRef = useRef<boolean>(false);

  // Navigation & Active Profile Slot (starts from where user left it)
  const [activeSection, setActiveSection] = useState<TopNavSection>(() => {
    if (typeof localStorage !== 'undefined') {
      const saved = localStorage.getItem('duosync_active_section');
      if (saved === 'health' || saved === 'skin' || saved === 'wardrobe') return saved;
    }
    return 'health';
  });
  const [activeSlot, setActiveSlot] = useState<ProfileSlot>(() => {
    if (typeof localStorage !== 'undefined') {
      const saved = localStorage.getItem('duosync_active_slot');
      if (saved === 'partner1' || saved === 'partner2') return saved;
    }
    return 'partner1';
  });
  const [hasInitializedSlot, setHasInitializedSlot] = useState(false);

  // Modals
  const [isAccountModalOpen, setIsAccountModalOpen] = useState(false);

  // Avatar photo sync with local storage (no gradients, circular cropped)
  const [headerAvatarPhoto, setHeaderAvatarPhoto] = useState<string | null>(null);

  useEffect(() => {
    const updatePhoto = () => {
      if (userDoc?.uid) {
        setHeaderAvatarPhoto(localStorage.getItem(`duosync_avatar_${userDoc.uid}`) || null);
      } else {
        setHeaderAvatarPhoto(null);
      }
    };
    updatePhoto();
    window.addEventListener('duosync-avatar-updated', updatePhoto);
    return () => window.removeEventListener('duosync-avatar-updated', updatePhoto);
  }, [userDoc?.uid]);

  // Persist navigation and partner slot so the app always starts from where user left it
  useEffect(() => {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem('duosync_active_section', activeSection);
    }
  }, [activeSection]);

  useEffect(() => {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem('duosync_active_slot', activeSlot);
    }
  }, [activeSlot]);

  // Track and restore scroll position so app always starts where user left it
  const isInitialMountRef = useRef(true);
  const previousSectionRef = useRef<TopNavSection>(activeSection);

  // 1. Record scroll position periodically per section
  useEffect(() => {
    if (typeof window === 'undefined') return;

    let timer: any;
    const handleScroll = () => {
      clearTimeout(timer);
      timer = setTimeout(() => {
        try {
          sessionStorage.setItem(`duosync_scroll_${activeSection}`, String(window.scrollY));
        } catch {}
      }, 120);
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => {
      clearTimeout(timer);
      window.removeEventListener('scroll', handleScroll);
    };
  }, [activeSection]);

  // 2. Restore scroll position on reload / section load
  useEffect(() => {
    if (typeof window === 'undefined') return;

    if (isInitialMountRef.current) {
      isInitialMountRef.current = false;
      const savedY = sessionStorage.getItem(`duosync_scroll_${activeSection}`);
      if (savedY && parseFloat(savedY) > 0) {
        requestAnimationFrame(() => {
          requestAnimationFrame(() => {
            window.scrollTo({ top: parseFloat(savedY), left: 0, behavior: 'instant' });
          });
        });
      }
      return;
    }

    // When switching to a different section
    if (previousSectionRef.current !== activeSection) {
      previousSectionRef.current = activeSection;
      const savedY = sessionStorage.getItem(`duosync_scroll_${activeSection}`);
      const targetY = savedY ? parseFloat(savedY) : 0;
      requestAnimationFrame(() => {
        window.scrollTo({ top: targetY, left: 0, behavior: 'instant' });
      });
    }
  }, [activeSection, activeSlot]);

  // Reset scroll on logout
  useEffect(() => {
    if (!authUser && typeof window !== 'undefined') {
      window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
    }
  }, [authUser]);

  // Date State for Health Dashboard
  const [selectedDate, setSelectedDate] = useState<string>(todayDate);

  // Real-time In-Memory State Maps
  const [healthLogsMap, setHealthLogsMap] = useState<Record<string, HealthLogDoc>>({});
  const [careProductsMap, setCareProductsMap] = useState<Record<string, CareProductDoc>>({});
  const [routineCompletionsMap, setRoutineCompletionsMap] = useState<Record<string, RoutineCompletionDoc>>({});
  const [wardrobeItemsMap, setWardrobeItemsMap] = useState<Record<string, WardrobeItemDoc>>({});
  const [outfitsMap, setOutfitsMap] = useState<Record<string, OutfitDoc>>({});

  // 1. Initial Session Restoration (Persistent Token in localStorage)
  useEffect(() => {
    async function restoreSession() {
      if (!api.auth.hasToken()) {
        setAuthReady(true);
        return;
      }

      try {
        const res = await api.auth.getMe();
        const u = res.user;
        const mappedUser: UserDoc = {
          uid: u.id,
          displayName: u.display_name,
          workspaceId: u.workspace_id || '',
          defaultSlot: (u.default_slot as ProfileSlot) || 'partner1',
          onboardingCompleted: Boolean(u.onboarding_completed),
          createdAt: new Date() as any,
          updatedAt: new Date() as any,
        };

        setUserDoc(mappedUser);
        setAuthUser({
          id: u.id,
          email: u.email,
          displayName: u.display_name,
          workspaceId: u.workspace_id || '',
          defaultSlot: mappedUser.defaultSlot,
          onboardingCompleted: mappedUser.onboardingCompleted,
        });

        if (res.workspace) {
          const wsDoc = mapToWorkspaceDoc(res.workspace, res.members, res.pairingCode);
          setWorkspace(wsDoc);
          if (!hasInitializedSlot) {
            const savedSlot = typeof localStorage !== 'undefined' ? localStorage.getItem('duosync_active_slot') : null;
            if (savedSlot === 'partner1' || savedSlot === 'partner2') {
              setActiveSlot(savedSlot);
            } else {
              setActiveSlot(mappedUser.defaultSlot || 'partner1');
            }
            setHasInitializedSlot(true);
          }
        }
      } catch (err) {
        console.warn('Session restoration failed:', err);
        api.auth.logout();
        setAuthUser(null);
        setUserDoc(null);
        setWorkspace(null);
      } finally {
        setAuthReady(true);
      }
    }

    restoreSession();
  }, []);

  // 2. Fetch Full Workspace State from Neon
  const fetchFullWorkspaceState = async (workspaceId: string) => {
    if (!workspaceId) return;
    try {
      const data = await api.sync.getAll(workspaceId);
      const wsDoc = mapToWorkspaceDoc(data.workspace, data.members, data.pairingCode);
      setWorkspace(wsDoc);
      lastSyncTimestampRef.current = data.timestamp;

      // Map health logs
      const hlMap: Record<string, HealthLogDoc> = {};
      data.healthLogs?.forEach((row: any) => {
        const docDate = String(row.date).slice(0, 10);
        const doc: HealthLogDoc = {
          id: row.id,
          workspaceId: row.workspace_id,
          profileSlot: row.profile_slot,
          date: docDate,
          weight: Number(row.weight) || 0,
          steps: Number(row.steps) || 0,
          sleepMinutes: Number(row.sleep_minutes) || 0,
          waterMl: Number(row.water_ml) || 0,
          note: row.note || '',
          updatedByUid: row.updated_by_id || '',
          createdAt: row.created_at,
          updatedAt: row.updated_at,
        };
        hlMap[row.id] = doc;
        hlMap[`${row.profile_slot}_${docDate}`] = doc;
      });
      setHealthLogsMap(hlMap);

      // Map care products
      const cpMap: Record<string, CareProductDoc> = {};
      data.careProducts?.forEach((row: any) => {
        const cachedImg = getCachedProductImage(row.id);
        const resolvedImage = row.image_url || cachedImg || '';
        const resolvedThumb = row.thumbnail_url || row.image_url || cachedImg || '';
        if (resolvedImage) {
          setCachedProductImage(row.id, resolvedImage);
        }
        cpMap[row.id] = {
          id: row.id,
          workspaceId: row.workspace_id,
          profileSlot: row.profile_slot,
          segment: row.segment,
          subCategory: row.sub_category,
          name: row.name,
          brand: row.brand || '',
          quantity: Number(row.quantity) || 1,
          orderedDate: row.ordered_date || '',
          openedDate: row.opened_date || '',
          expiryDate: row.expiry_date || '',
          saleInfo: row.sale_info || '',
          pricePaid: Number(row.price_paid) || 0,
          originalPrice: Number(row.original_price) || 0,
          status: row.status,
          routineTime: row.routine_time,
          scheduleType: row.schedule_type || 'daily',
          scheduledDays: row.scheduled_days || [],
          imageUrl: resolvedImage,
          thumbnailUrl: resolvedThumb,
          notes: row.notes || '',
          updatedByUid: row.updated_by_id || '',
          createdAt: row.created_at,
          updatedAt: row.updated_at,
        };
      });
      setCareProductsMap(cpMap);

      // Map routine completions
      const rcMap: Record<string, RoutineCompletionDoc> = {};
      data.routineCompletions?.forEach((row: any) => {
        rcMap[row.id] = {
          id: row.id,
          workspaceId: row.workspace_id,
          profileSlot: row.profile_slot,
          productId: row.product_id,
          date: String(row.date).slice(0, 10),
          completed: Boolean(row.completed),
          completedAt: row.completed_at,
          updatedByUid: row.updated_by_id || '',
          createdAt: row.created_at,
          updatedAt: row.updated_at,
        };
      });
      setRoutineCompletionsMap(rcMap);

      // Map wardrobe items
      const wiMap: Record<string, WardrobeItemDoc> = {};
      data.wardrobeItems?.forEach((row: any) => {
        const cachedImg = getCachedWardrobeImage(row.id);
        const resolvedImage = row.image_url || cachedImg || '';
        const resolvedThumb = row.thumbnail_url || row.image_url || cachedImg || '';
        if (resolvedImage) {
          setCachedWardrobeImage(row.id, resolvedImage);
        }
        wiMap[row.id] = {
          id: row.id,
          workspaceId: row.workspace_id,
          profileSlot: row.profile_slot,
          name: row.name,
          category: row.category,
          brand: row.brand || '',
          color: row.color || '',
          size: row.size || '',
          season: row.season || 'All Season',
          occasion: row.occasion || 'Casual',
          imageUrl: resolvedImage,
          thumbnailUrl: resolvedThumb,
          notes: row.notes || '',
          updatedByUid: row.updated_by_id || '',
          createdAt: row.created_at,
          updatedAt: row.updated_at,
        };
      });
      setWardrobeItemsMap(wiMap);

      // Map outfits
      const ofMap: Record<string, OutfitDoc> = {};
      data.outfits?.forEach((row: any) => {
        ofMap[row.id] = {
          id: row.id,
          workspaceId: row.workspace_id,
          profileSlot: row.profile_slot,
          name: row.name,
          occasion: row.occasion || 'Casual',
          itemIds: row.item_ids || [],
          notes: row.notes || '',
          updatedByUid: row.updated_by_id || '',
          createdAt: row.created_at,
          updatedAt: row.updated_at,
        };
      });
      setOutfitsMap(ofMap);

      setSyncError(null);
    } catch (err) {
      console.error('Fetch workspace state error:', err);
    }
  };

  // 3. Partner Synchronization (Bi-directional polling heartbeat every 3s)
  useEffect(() => {
    if (!authUser || !workspace?.id) return;

    // Load full workspace state on start
    fetchFullWorkspaceState(workspace.id);

    // Heartbeat check for partner mutations
    const interval = setInterval(async () => {
      if (document.hidden || isSyncingRef.current) return;
      try {
        const poll = await api.sync.poll(workspace.id, lastSyncTimestampRef.current);
        if (poll.changed) {
          isSyncingRef.current = true;
          await fetchFullWorkspaceState(workspace.id);
          isSyncingRef.current = false;
        }
      } catch (err) {
        // Tolerates brief network drops silently
      }
    }, 3000);

    // Immediate sync on tab switch / window focus
    const handleVisibility = () => {
      if (document.visibilityState === 'visible' && workspace?.id) {
        api.sync.poll(workspace.id, lastSyncTimestampRef.current).then((res) => {
          if (res.changed) fetchFullWorkspaceState(workspace.id);
        }).catch(() => {});
      }
    };

    document.addEventListener('visibilitychange', handleVisibility);
    window.addEventListener('focus', handleVisibility);

    return () => {
      clearInterval(interval);
      document.removeEventListener('visibilitychange', handleVisibility);
      window.removeEventListener('focus', handleVisibility);
    };
  }, [authUser?.id, workspace?.id]);

  // Handle successful login or register from AuthCard
  const handleAuthSuccess = (res: AuthResponse) => {
    setStoredToken(res.token);
    const u = res.user;
    const mappedUser: UserDoc = {
      uid: u.id,
      displayName: u.display_name,
      workspaceId: u.workspace_id || '',
      defaultSlot: (u.default_slot as ProfileSlot) || 'partner1',
      onboardingCompleted: Boolean(u.onboarding_completed),
      createdAt: new Date() as any,
      updatedAt: new Date() as any,
    };

    setUserDoc(mappedUser);
    setAuthUser({
      id: u.id,
      email: u.email,
      displayName: u.display_name,
      workspaceId: u.workspace_id || '',
      defaultSlot: mappedUser.defaultSlot,
      onboardingCompleted: mappedUser.onboardingCompleted,
    });

    if (res.workspace) {
      const wsDoc = mapToWorkspaceDoc(res.workspace, res.members, res.pairingCode);
      setWorkspace(wsDoc);
      setActiveSlot(mappedUser.defaultSlot || 'partner1');
      fetchFullWorkspaceState(wsDoc.id);
    }
  };

  // Sign out handler
  const handleSignOut = () => {
    api.auth.logout();
    setAuthUser(null);
    setUserDoc(null);
    setWorkspace(null);
    setHealthLogsMap({});
    setCareProductsMap({});
    setRoutineCompletionsMap({});
    setWardrobeItemsMap({});
    setOutfitsMap({});
    setHasInitializedSlot(false);
    if (typeof window !== 'undefined') {
      window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
      document.documentElement.scrollTop = 0;
      document.body.scrollTop = 0;
    }
  };

  // Derived Profile Views
  const partner1Profile: PartnerProfileView | null = useMemo(() => {
    if (!workspace) return null;
    return {
      slot: 'partner1',
      name: workspace.partner1Name,
      role: workspace.partner1Role,
      weightUnit: workspace.partner1WeightUnit,
      targetWeight: workspace.partner1TargetWeight,
      startWeight: workspace.partner1StartWeight,
      stepsGoal: workspace.partner1StepsGoal,
      sleepGoalMinutes: workspace.partner1SleepGoalMinutes,
      waterGoalMl: workspace.partner1WaterGoalMl,
      fitnessApp: 'manual',
    };
  }, [workspace]);

  const partner2Profile: PartnerProfileView | null = useMemo(() => {
    if (!workspace) return null;
    return {
      slot: 'partner2',
      name: workspace.partner2Name,
      role: workspace.partner2Role,
      weightUnit: workspace.partner2WeightUnit,
      targetWeight: workspace.partner2TargetWeight,
      startWeight: workspace.partner2StartWeight,
      stepsGoal: workspace.partner2StepsGoal,
      sleepGoalMinutes: workspace.partner2SleepGoalMinutes,
      waterGoalMl: workspace.partner2WaterGoalMl,
      fitnessApp: 'manual',
    };
  }, [workspace]);

  const activeProfile = activeSlot === 'partner2' ? partner2Profile : partner1Profile;
  const otherProfile = activeSlot === 'partner2' ? partner1Profile : partner2Profile;

  // Active Profile's Logs
  const activeProfileLogsByDate = useMemo(() => {
    const map: Record<string, HealthLogDoc> = {};
    Object.values(healthLogsMap).forEach((log) => {
      if (log.profileSlot === activeSlot) {
        map[log.date] = log;
      }
    });
    return map;
  }, [healthLogsMap, activeSlot]);

  const otherProfileTodayLog = useMemo(() => {
    const otherSlot = activeSlot === 'partner2' ? 'partner1' : 'partner2';
    const logId = `${otherSlot}_${todayDate}`;
    return healthLogsMap[logId] || null;
  }, [healthLogsMap, activeSlot, todayDate]);

  const orderedProductsList = useMemo(() => {
    return Object.values(careProductsMap).sort((a, b) => {
      return (b.name || '').localeCompare(a.name || '');
    });
  }, [careProductsMap]);

  // MUTATIONS

  // 1. Save Health Log (Optimistic + Neon Mutation)
  const handleSaveHealthLog = async (
    date: string,
    updates: Partial<Pick<HealthLogDoc, 'weight' | 'steps' | 'sleepMinutes' | 'waterMl' | 'note'>>
  ) => {
    if (!authUser || !workspace) return;
    const logId = `${activeSlot}_${date}`;
    const existing = healthLogsMap[logId];

    const newLog: HealthLogDoc = {
      id: logId,
      workspaceId: workspace.id,
      profileSlot: activeSlot,
      date,
      weight: updates.weight !== undefined ? updates.weight : existing?.weight ?? 0,
      steps: updates.steps !== undefined ? updates.steps : existing?.steps ?? 0,
      sleepMinutes: updates.sleepMinutes !== undefined ? updates.sleepMinutes : existing?.sleepMinutes ?? 0,
      waterMl: updates.waterMl !== undefined ? updates.waterMl : existing?.waterMl ?? 0,
      note: updates.note !== undefined ? updates.note : existing?.note ?? '',
      updatedByUid: authUser.id,
    };

    // Instant optimistic update
    setHealthLogsMap((prev) => ({ ...prev, [logId]: newLog }));

    try {
      const res = await api.mutate.saveHealthLog({
        workspaceId: workspace.id,
        profileSlot: activeSlot,
        date,
        weight: newLog.weight,
        steps: newLog.steps,
        sleepMinutes: newLog.sleepMinutes,
        waterMl: newLog.waterMl,
        note: newLog.note,
      });
      lastSyncTimestampRef.current = res.timestamp;
    } catch (err) {
      console.warn('Health log save error:', err);
    }
  };

  // 2. Update Profile Goals
  const handleUpdateProfileGoals = async (goals: {
    name: string;
    role: string;
    weightUnit: 'kg' | 'lbs';
    targetWeight: number;
    startWeight: number;
    stepsGoal: number;
    sleepGoalMinutes: number;
    waterGoalMl: number;
    fitnessApp: FitnessAppId;
  }) => {
    if (!authUser || !workspace) return;
    const prefix = activeSlot === 'partner1' ? 'partner1' : 'partner2';

    // Optimistic workspace update
    setWorkspace((prev) => {
      if (!prev) return null;
      return {
        ...prev,
        [`${prefix}Name`]: goals.name,
        [`${prefix}Role`]: goals.role,
        [`${prefix}WeightUnit`]: goals.weightUnit,
        [`${prefix}TargetWeight`]: goals.targetWeight,
        [`${prefix}StartWeight`]: goals.startWeight,
        [`${prefix}StepsGoal`]: goals.stepsGoal,
        [`${prefix}SleepGoalMinutes`]: goals.sleepGoalMinutes,
        [`${prefix}WaterGoalMl`]: goals.waterGoalMl,
      };
    });

    try {
      const res = await api.mutate.updatePartnerGoals({
        workspaceId: workspace.id,
        slot: activeSlot,
        name: goals.name,
        role: goals.role,
        weightUnit: goals.weightUnit,
        targetWeight: goals.targetWeight,
        startWeight: goals.startWeight,
        stepsGoal: goals.stepsGoal,
        sleepGoalMinutes: goals.sleepGoalMinutes,
        waterGoalMl: goals.waterGoalMl,
      });
      lastSyncTimestampRef.current = res.timestamp;
    } catch (err) {
      console.warn('Update goals error:', err);
    }
  };

  // 3. Save Care Product
  const handleSaveProduct = async (
    productInput: Omit<CareProductDoc, 'id' | 'workspaceId' | 'updatedByUid' | 'createdAt' | 'updatedAt'>,
    existingId?: string
  ) => {
    if (!authUser || !workspace) return;
    const productId = existingId || `prod_${Date.now()}_${Math.floor(Math.random() * 1000)}`;

    const newProd: CareProductDoc = {
      id: productId,
      workspaceId: workspace.id,
      ...productInput,
      updatedByUid: authUser.id,
    };

    // Optimistic update
    setCareProductsMap((prev) => ({ ...prev, [productId]: newProd }));
    if (newProd.imageUrl) {
      setCachedProductImage(productId, newProd.imageUrl);
    }

    try {
      const res = await api.mutate.saveCareProduct({
        ...newProd,
        workspaceId: workspace.id,
      });
      lastSyncTimestampRef.current = res.timestamp;
    } catch (err) {
      console.warn('Save care product error:', err);
    }
  };

  // 4. Delete Care Product
  const handleDeleteProduct = async (productId: string) => {
    if (!authUser || !workspace) return;

    setCachedProductImage(productId, '');

    // Optimistic deletion
    setCareProductsMap((prev) => {
      const next = { ...prev };
      delete next[productId];
      return next;
    });

    try {
      const res = await api.mutate.deleteCareProduct(productId, workspace.id);
      lastSyncTimestampRef.current = res.timestamp;
    } catch (err) {
      console.warn('Delete care product error:', err);
    }
  };

  // 5. Toggle Routine Completion
  const handleToggleRoutineCompletion = async (productId: string, date: string, completed: boolean) => {
    if (!authUser || !workspace) return;
    const completionId = `${activeSlot}_${productId}_${date}`;

    // Optimistic toggle
    setRoutineCompletionsMap((prev) => {
      const next = { ...prev };
      if (completed) {
        next[completionId] = {
          id: completionId,
          workspaceId: workspace.id,
          profileSlot: activeSlot,
          productId,
          date,
          completed: true,
          completedAt: new Date() as any,
          updatedByUid: authUser.id,
        };
      } else {
        delete next[completionId];
      }
      return next;
    });

    try {
      const res = await api.mutate.toggleRoutineCompletion({
        workspaceId: workspace.id,
        profileSlot: activeSlot,
        productId,
        date,
        completed,
      });
      lastSyncTimestampRef.current = res.timestamp;
    } catch (err) {
      console.warn('Toggle routine error:', err);
    }
  };

  // 6. Save Wardrobe Item
  const handleSaveWardrobeItem = async (
    itemInput: Omit<WardrobeItemDoc, 'id' | 'workspaceId' | 'updatedByUid' | 'createdAt' | 'updatedAt'>,
    existingId?: string
  ) => {
    if (!authUser || !workspace) return;
    const itemId = existingId || `item_${Date.now()}_${Math.floor(Math.random() * 1000)}`;

    const newItem: WardrobeItemDoc = {
      id: itemId,
      workspaceId: workspace.id,
      ...itemInput,
      updatedByUid: authUser.id,
    };

    // Optimistic update
    setWardrobeItemsMap((prev) => ({ ...prev, [itemId]: newItem }));
    if (newItem.imageUrl) {
      setCachedWardrobeImage(itemId, newItem.imageUrl);
    }

    try {
      const res = await api.mutate.saveWardrobeItem({
        ...newItem,
        workspaceId: workspace.id,
      });
      lastSyncTimestampRef.current = res.timestamp;
    } catch (err) {
      console.warn('Save wardrobe item error:', err);
    }
  };

  // 7. Delete Wardrobe Item
  const handleDeleteWardrobeItem = async (itemId: string) => {
    if (!authUser || !workspace) return;

    setCachedWardrobeImage(itemId, '');

    // Optimistic deletion
    setWardrobeItemsMap((prev) => {
      const next = { ...prev };
      delete next[itemId];
      return next;
    });

    try {
      const res = await api.mutate.deleteWardrobeItem(itemId, workspace.id);
      lastSyncTimestampRef.current = res.timestamp;
    } catch (err) {
      console.warn('Delete wardrobe item error:', err);
    }
  };

  // 8. Save Outfit
  const handleSaveOutfit = async (
    outfitInput: Omit<OutfitDoc, 'id' | 'workspaceId' | 'updatedByUid' | 'createdAt' | 'updatedAt'>,
    existingId?: string
  ) => {
    if (!authUser || !workspace) return;
    const outfitId = existingId || `fit_${Date.now()}_${Math.floor(Math.random() * 1000)}`;

    const newFit: OutfitDoc = {
      id: outfitId,
      workspaceId: workspace.id,
      ...outfitInput,
      updatedByUid: authUser.id,
    };

    // Optimistic update
    setOutfitsMap((prev) => ({ ...prev, [outfitId]: newFit }));

    try {
      const res = await api.mutate.saveOutfit({
        ...newFit,
        workspaceId: workspace.id,
      });
      lastSyncTimestampRef.current = res.timestamp;
    } catch (err) {
      console.warn('Save outfit error:', err);
    }
  };

  // 9. Delete Outfit
  const handleDeleteOutfit = async (outfitId: string) => {
    if (!authUser || !workspace) return;

    // Optimistic deletion
    setOutfitsMap((prev) => {
      const next = { ...prev };
      delete next[outfitId];
      return next;
    });

    try {
      const res = await api.mutate.deleteOutfit(outfitId, workspace.id);
      lastSyncTimestampRef.current = res.timestamp;
    } catch (err) {
      console.warn('Delete outfit error:', err);
    }
  };

  // 10. Add / Remove Care Sub-Categories
  const handleAddSubCategory = async (segment: CareSegment, categoryName: string) => {
    if (!authUser || !workspace || !categoryName.trim()) return;
    const clean = categoryName.trim();

    const fieldName =
      segment === 'skincare'
        ? 'skincareCategories'
        : segment === 'haircare'
        ? 'haircareCategories'
        : 'bodycareCategories';

    const currentList = workspace[fieldName] || [];
    if (currentList.includes(clean)) return;

    const updatedList = [...currentList, clean];
    setWorkspace((prev) => (prev ? { ...prev, [fieldName]: updatedList } : null));

    try {
      const res = await api.mutate.updateCategories({
        workspaceId: workspace.id,
        [fieldName]: updatedList,
      });
      lastSyncTimestampRef.current = res.timestamp;
    } catch (err) {
      console.warn('Update categories error:', err);
    }
  };

  const handleRemoveSubCategory = async (segment: CareSegment, categoryName: string) => {
    if (!authUser || !workspace) return;
    const fieldName =
      segment === 'skincare'
        ? 'skincareCategories'
        : segment === 'haircare'
        ? 'haircareCategories'
        : 'bodycareCategories';

    const currentList = workspace[fieldName] || [];
    if (currentList.length <= 1) return;

    const updatedList = currentList.filter((c) => c !== categoryName);
    setWorkspace((prev) => (prev ? { ...prev, [fieldName]: updatedList } : null));

    try {
      const res = await api.mutate.updateCategories({
        workspaceId: workspace.id,
        [fieldName]: updatedList,
      });
      lastSyncTimestampRef.current = res.timestamp;
    } catch (err) {
      console.warn('Remove category error:', err);
    }
  };

  // 11. Complete Onboarding Questionnaire
  const handleOnboardingComplete = async (submission: OnboardingSubmission) => {
    if (!authUser || !workspace) return;

    if (submission.mode === 'join_partner_code' && submission.partnerCodeToJoin) {
      const res = await api.mutate.pairWithPartner(submission.partnerCodeToJoin, submission);
      if (res.workspace) {
        const wsDoc = mapToWorkspaceDoc(res.workspace, res.members, submission.partnerCodeToJoin);
        setWorkspace(wsDoc);
        setUserDoc((prev) => (prev ? { ...prev, onboardingCompleted: true } : null));
        setAuthUser((prev) => (prev ? { ...prev, onboardingCompleted: true } : null));
        setActiveSlot('partner2');
        await fetchFullWorkspaceState(wsDoc.id);
      }
      setManualWizardOpen(false);
      return;
    }

    // Standard mode: update own workspace goals
    try {
      const res = await api.mutate.completeOnboarding(workspace.id, activeSlot, submission);
      lastSyncTimestampRef.current = res.timestamp;

      // Update local state immediately so dashboard renders without manual page refresh
      const newName = submission.myName || userDoc?.displayName || 'Partner 1';
      setUserDoc((prev) =>
        prev
          ? {
              ...prev,
              displayName: newName,
              onboardingCompleted: true,
            }
          : null
      );
      setAuthUser((prev) =>
        prev
          ? {
              ...prev,
              displayName: newName,
              onboardingCompleted: true,
            }
          : null
      );

      if (res.workspace && res.members) {
        const wsDoc = mapToWorkspaceDoc(res.workspace, res.members, workspace.pairingCode);
        if (submission.wardrobeCategories && submission.wardrobeCategories.length > 0) {
          wsDoc.wardrobeCategories = submission.wardrobeCategories;
          try {
            localStorage.setItem(`duosync_wardrobe_categories_${workspace.id}`, JSON.stringify(submission.wardrobeCategories));
          } catch {}
        }
        setWorkspace(wsDoc);
      } else {
        setWorkspace((prev) => (prev ? {
          ...prev,
          onboardingCompleted: true,
          wardrobeCategories: submission.wardrobeCategories || prev.wardrobeCategories || DEFAULT_WARDROBE_CATEGORIES,
        } : null));
        if (submission.wardrobeCategories && submission.wardrobeCategories.length > 0) {
          try {
            localStorage.setItem(`duosync_wardrobe_categories_${workspace.id}`, JSON.stringify(submission.wardrobeCategories));
          } catch {}
        }
      }

      setManualWizardOpen(false);
      await fetchFullWorkspaceState(workspace.id);
    } catch (err) {
      console.error('Onboarding complete error:', err);
    }
  };

  // 12. Connect via 6-digit partner code in PartnerModal
  const handleJoinByCode = async (code: string) => {
    if (!authUser) return;
    const res = await api.mutate.pairWithPartner(code, {});
    if (res.workspace) {
      const wsDoc = mapToWorkspaceDoc(res.workspace, res.members, code);
      setWorkspace(wsDoc);
      setActiveSlot('partner2');
      fetchFullWorkspaceState(wsDoc.id);
    }
  };

  // 13. Update Workspace Identities
  const handleUpdateWorkspaceIdentities = async (updates: {
    currency: string;
    partner1Name: string;
    partner1Role: string;
    partner2Name: string;
    partner2Role: string;
    defaultSlot: ProfileSlot;
  }) => {
    if (!authUser || !workspace) return;

    const myNewName = updates.defaultSlot === 'partner2' ? updates.partner2Name : updates.partner1Name;

    setWorkspace((prev) =>
      prev
        ? {
            ...prev,
            currency: updates.currency,
            partner1Name: updates.partner1Name,
            partner1Role: updates.partner1Role,
            partner2Name: updates.partner2Name,
            partner2Role: updates.partner2Role,
          }
        : null
    );

    setUserDoc((prev) =>
      prev
        ? {
            ...prev,
            displayName: myNewName,
            defaultSlot: updates.defaultSlot,
          }
        : null
    );

    setAuthUser((prev) =>
      prev
        ? {
            ...prev,
            displayName: myNewName,
            defaultSlot: updates.defaultSlot,
          }
        : null
    );

    try {
      await api.mutate.updatePartnerGoals({
        workspaceId: workspace.id,
        slot: 'partner1',
        name: updates.partner1Name,
        role: updates.partner1Role,
      });
      await api.mutate.updatePartnerGoals({
        workspaceId: workspace.id,
        slot: 'partner2',
        name: updates.partner2Name,
        role: updates.partner2Role,
      });
      setActiveSlot(updates.defaultSlot);
    } catch (err) {
      console.warn('Update identities error:', err);
    }
  };

  const handleUnlinkPartner = async () => {
    if (!workspace) return;
    setWorkspace((prev) => (prev ? { ...prev, partnerUid: '' } : null));
  };

  // 14. Fresh Start Database Wipe
  const handleDeleteAllUserData = async () => {
    try {
      await fetch('/api/admin/reset', {
        method: 'POST',
        headers: { 'x-admin-key': 'duosync-reset-2026' },
      });
      handleSignOut();
      window.location.reload();
    } catch (err) {
      console.error('Reset error:', err);
    }
  };

  // Initial Loading Screen while checking JWT token
  if (!authReady) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center p-6">
        <div className="text-center space-y-2">
          <div className="w-10 h-10 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center mx-auto animate-pulse">
            <HeartHandshake className="w-5 h-5 text-rose-400" />
          </div>
          <p className="text-xs text-zinc-400 font-medium">Loading DuoSync...</p>
        </div>
      </div>
    );
  }

  // Not Logged In: Graphic-First Minimal Mobile Landing Page
  if (!authUser) {
    return <LandingPage onAuthSuccess={handleAuthSuccess} />;
  }

  // Loading Dashboard State
  if (!workspace || !userDoc || !activeProfile || !otherProfile || !partner1Profile || !partner2Profile) {
    return (
      <div className="min-h-screen bg-black text-zinc-100 flex items-center justify-center p-4 sm:p-6">
        <div className="w-full max-w-md rounded-3xl bg-[#0A0A0F] border border-white/[0.08] p-6 sm:p-8 text-center space-y-5 shadow-2xl">
          <div className="w-12 h-12 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center mx-auto">
            {syncError ? (
              <AlertCircle className="w-6 h-6 text-amber-400" />
            ) : (
              <Sparkles className="w-6 h-6 text-rose-400 animate-pulse" />
            )}
          </div>

          <div className="space-y-1.5">
            <h3 className="text-base font-bold text-white">
              {syncError ? 'Unable to Load Workspace' : 'Loading Your Dashboard...'}
            </h3>
            <p className="text-xs text-zinc-400 leading-relaxed">
              {syncError || 'Synchronizing your vitals and care routines with Neon PostgreSQL.'}
            </p>
          </div>

          <button
            type="button"
            onClick={() => window.location.reload()}
            className="w-full min-h-[40px] rounded-xl bg-black hover:bg-white/5 border border-white/10 text-xs font-medium text-zinc-400 hover:text-white flex items-center justify-center gap-1.5 transition-colors"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Retry Connection</span>
          </button>
        </div>
      </div>
    );
  }

  // Onboarding Wizard for New Accounts (or Manually Triggered via Account Settings)
  if (!userDoc.onboardingCompleted || !workspace.onboardingCompleted || manualWizardOpen) {
    return (
      <OnboardingWizard
        initialName={activeProfile.name || userDoc.displayName || workspace.partner1Name}
        initialRole={activeProfile.role}
        initialPartnerName={otherProfile.name || workspace.partner2Name}
        initialCurrency={workspace.currency}
        initialFitnessApp={activeProfile.fitnessApp || 'manual'}
        initialWeightUnit={activeProfile.weightUnit}
        initialCurrentWeight={activeProfile.startWeight}
        initialTargetWeight={activeProfile.targetWeight}
        initialStepsGoal={activeProfile.stepsGoal}
        initialSleepGoalMinutes={activeProfile.sleepGoalMinutes}
        initialWaterGoalMl={activeProfile.waterGoalMl}
        initialSkincareCategories={workspace.skincareCategories}
        initialHaircareCategories={workspace.haircareCategories}
        initialBodycareCategories={workspace.bodycareCategories}
        initialWardrobeCategories={workspace.wardrobeCategories}
        pairingCode={workspace.pairingCode}
        onComplete={handleOnboardingComplete}
        onCancel={() => setManualWizardOpen(false)}
      />
    );
  }

  // Active Main Dashboard
  return (
    <div className="min-h-screen bg-black text-zinc-100 flex flex-col font-sans selection:bg-rose-500 selection:text-white pb-20 sm:pb-8">
      {/* Top Header */}
      <header className="sticky top-0 z-40 bg-black/80 backdrop-blur-2xl border-b border-white/[0.06] px-2.5 sm:px-8 py-2.5 sm:py-3 pt-[max(0.65rem,env(safe-area-inset-top,0px))] flex items-center justify-between gap-1.5 sm:gap-3">
        {/* Brand */}
        <a
          href="#dashboard"
          onClick={(e) => {
            e.preventDefault();
            window.scrollTo({ top: 0, behavior: 'smooth' });
          }}
          className="flex items-center gap-2 select-none shrink-0 group"
          title="DuoSync"
          aria-label="DuoSync Home"
        >
          <div className="w-4 h-4 rounded-full border border-white/25 flex items-center justify-center group-hover:border-white/50 transition-colors">
            <span className="w-1.5 h-1.5 rounded-full bg-white" />
          </div>
          <span className="text-[17px] font-semibold tracking-[-0.025em] text-white whitespace-nowrap">
            DuoSync
          </span>
        </a>

        {/* Top Navbar Pill: Hidden on mobile, visible on tablet/desktop */}
        <nav
          aria-label="Primary View Switcher"
          className="hidden sm:flex relative items-center p-1 rounded-full bg-[#0A0A0F] border border-white/10 overflow-hidden"
        >
          <motion.div
            initial={false}
            className="absolute top-1 bottom-1 rounded-full bg-white shadow-sm pointer-events-none"
            style={{
              width: 'calc((100% - 8px) / 3)',
              left: '4px',
            }}
            animate={{
              x: activeSection === 'health' ? '0%' : activeSection === 'skin' ? '100%' : '200%',
            }}
            transition={{ type: 'spring', damping: 32, stiffness: 220, mass: 0.8 }}
          />

          <button
            type="button"
            onClick={() => setActiveSection('health')}
            className={`relative min-h-[34px] sm:min-h-[36px] px-3.5 sm:px-5 py-1 rounded-full text-xs font-semibold transition-colors whitespace-nowrap shrink-0 flex items-center gap-1.5 z-10 ${
              activeSection === 'health' ? 'text-zinc-950 font-bold' : 'text-white/60 hover:text-white'
            }`}
          >
            <Activity className="w-3.5 h-3.5" strokeWidth={1.5} />
            <span>Health</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveSection('skin')}
            className={`relative min-h-[34px] sm:min-h-[36px] px-3.5 sm:px-5 py-1 rounded-full text-xs font-semibold transition-colors whitespace-nowrap shrink-0 flex items-center gap-1.5 z-10 ${
              activeSection === 'skin' ? 'text-zinc-950 font-bold' : 'text-white/60 hover:text-white'
            }`}
          >
            <ShampooBottleNavIcon className="w-3.5 h-3.5" />
            <span>Skin</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveSection('wardrobe')}
            className={`relative min-h-[34px] sm:min-h-[36px] px-3.5 sm:px-5 py-1 rounded-full text-xs font-semibold transition-colors whitespace-nowrap shrink-0 flex items-center gap-1.5 z-10 ${
              activeSection === 'wardrobe' ? 'text-zinc-950 font-bold' : 'text-white/60 hover:text-white'
            }`}
          >
            <CollaredShirtNavIcon className="w-3.5 h-3.5" />
            <span>Fits</span>
          </button>
        </nav>

        {/* Partner Switcher & Actions */}
        <div className="flex items-center gap-1 sm:gap-2 shrink-0">
          <div className="flex items-center p-0.5 rounded-full bg-[#0A0A0F] border border-white/10">
            <button
              type="button"
              onClick={() => setActiveSlot('partner1')}
              className={`min-h-[34px] px-2 sm:px-3 rounded-full text-[11px] sm:text-xs font-medium transition-colors whitespace-nowrap truncate max-w-[58px] sm:max-w-[130px] ${
                activeSlot === 'partner1'
                  ? 'bg-sky-500 text-white font-semibold'
                  : 'text-zinc-400 hover:text-white'
              }`}
              title={`View ${partner1Profile.name}'s Dashboard`}
            >
              {partner1Profile.name}
            </button>
            <button
              type="button"
              onClick={() => setActiveSlot('partner2')}
              className={`min-h-[34px] px-2 sm:px-3 rounded-full text-[11px] sm:text-xs font-medium transition-colors whitespace-nowrap truncate max-w-[58px] sm:max-w-[130px] ${
                activeSlot === 'partner2'
                  ? 'bg-rose-500 text-white font-semibold'
                  : 'text-zinc-400 hover:text-white'
              }`}
              title={`View ${partner2Profile.name}'s Dashboard`}
            >
              {partner2Profile.name}
            </button>
          </div>

          {/* Account Profile Button: Pure circular avatar with NO outer oval or extra padding */}
          <button
            type="button"
            onClick={() => setIsAccountModalOpen(true)}
            className="w-11 h-11 min-w-[44px] min-h-[44px] rounded-full flex items-center justify-center shrink-0 active:scale-95 cursor-pointer transition-transform focus:outline-none"
            title="Account & Partner Settings"
            aria-label="Account & Partner Settings"
          >
            <UserAvatar
              name={activeProfile?.name || userDoc?.displayName || 'User'}
              photoUrl={headerAvatarPhoto}
              size="md"
            />
          </button>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="max-w-6xl w-full mx-auto flex-1 px-3 sm:px-6 pt-3 sm:pt-5 pb-[calc(5.5rem+env(safe-area-inset-bottom,0px))] sm:pb-12 min-w-0">
        <AnimatePresence mode="popLayout" initial={false}>
          <motion.div
            key={activeSection}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
          >
            {activeSection === 'health' ? (
              <HealthDashboard
                profile={activeProfile}
                partnerProfile={otherProfile}
                selectedDate={selectedDate}
                todayDate={todayDate}
                onSelectDate={setSelectedDate}
                logsByDate={activeProfileLogsByDate}
                partnerTodayLog={otherProfileTodayLog}
                onSaveHealthLog={handleSaveHealthLog}
                onUpdateProfileGoals={handleUpdateProfileGoals}
                onSwitchToPartner={() =>
                  setActiveSlot((prev) => (prev === 'partner2' ? 'partner1' : 'partner2'))
                }
              />
            ) : activeSection === 'skin' ? (
              <SkinDashboard
                profile={activeProfile}
                partnerProfile={otherProfile}
                currency={workspace.currency || '₹'}
                products={orderedProductsList}
                skincareCategories={workspace.skincareCategories || DEFAULT_SKINCARE_CATEGORIES}
                haircareCategories={workspace.haircareCategories || DEFAULT_HAIRCARE_CATEGORIES}
                bodycareCategories={workspace.bodycareCategories || DEFAULT_BODYCARE_CATEGORIES}
                todayDate={todayDate}
                routineCompletionsMap={routineCompletionsMap}
                onToggleRoutineCompletion={handleToggleRoutineCompletion}
                onSaveProduct={handleSaveProduct}
                onDeleteProduct={handleDeleteProduct}
                onAddSubCategory={handleAddSubCategory}
                onRemoveSubCategory={handleRemoveSubCategory}
              />
            ) : (
              <WardrobeDashboard
                profile={activeProfile}
                partnerProfile={otherProfile}
                items={Object.values(wardrobeItemsMap)}
                outfits={Object.values(outfitsMap)}
                wardrobeCategories={workspace.wardrobeCategories}
                onSaveItem={handleSaveWardrobeItem}
                onDeleteItem={handleDeleteWardrobeItem}
                onSaveOutfit={handleSaveOutfit}
                onDeleteOutfit={handleDeleteOutfit}
              />
            )}
          </motion.div>
        </AnimatePresence>
      </main>

      {/* Premium Top Blur Effect (diffuses content scrolling under top header) */}
      <div
        className="fixed top-0 inset-x-0 h-24 bg-gradient-to-b from-black via-black/85 to-transparent pointer-events-none z-30 backdrop-blur-[8px]"
        style={{
          WebkitMaskImage: 'linear-gradient(to bottom, black 50%, transparent)',
          maskImage: 'linear-gradient(to bottom, black 50%, transparent)',
        }}
      />

      {/* Premium Bottom Blur Effect (obscures content behind bottom nav so it is not visible) */}
      <div
        className="fixed bottom-0 inset-x-0 h-32 bg-gradient-to-t from-black via-black/95 to-transparent pointer-events-none z-30 backdrop-blur-[12px]"
        style={{
          WebkitMaskImage: 'linear-gradient(to top, black 55%, transparent)',
          maskImage: 'linear-gradient(to top, black 55%, transparent)',
        }}
      />

      {/* Mobile-Only Floating Bottom Navbar Pill [ Health | Skin | Fits ] */}
      <div className="sm:hidden fixed bottom-[max(0.75rem,env(safe-area-inset-bottom,0px))] inset-x-0 mx-auto w-[min(92%,360px)] z-40">
        <div className="relative bg-[#0A0A0F]/95 backdrop-blur-2xl border border-white/12 shadow-2xl shadow-black rounded-full p-1.5 flex items-center justify-between gap-1 overflow-hidden">
          {/* Smooth hardware-accelerated horizontal sliding indicator (purely horizontal, zero vertical bounce) */}
          <motion.div
            initial={false}
            className="absolute top-1.5 bottom-1.5 rounded-full bg-white shadow-md pointer-events-none"
            style={{
              width: 'calc((100% - 12px) / 3)',
              left: '6px',
            }}
            animate={{
              x: activeSection === 'health' ? '0%' : activeSection === 'skin' ? '100%' : '200%',
            }}
            transition={{ type: 'spring', damping: 32, stiffness: 220, mass: 0.8 }}
          />

          <button
            type="button"
            onClick={() => setActiveSection('health')}
            className={`relative flex-1 min-h-[46px] rounded-full text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors z-10 ${
              activeSection === 'health' ? 'text-zinc-950 font-bold' : 'text-white/60 hover:text-white'
            }`}
          >
            <Activity className="w-4 h-4" strokeWidth={1.5} />
            <span className="text-xs">Health</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveSection('skin')}
            className={`relative flex-1 min-h-[46px] rounded-full text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors z-10 ${
              activeSection === 'skin' ? 'text-zinc-950 font-bold' : 'text-white/60 hover:text-white'
            }`}
          >
            <ShampooBottleNavIcon className="w-4 h-4" />
            <span className="text-xs">Skin</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveSection('wardrobe')}
            className={`relative flex-1 min-h-[46px] rounded-full text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors z-10 ${
              activeSection === 'wardrobe' ? 'text-zinc-950 font-bold' : 'text-white/60 hover:text-white'
            }`}
          >
            <CollaredShirtNavIcon className="w-4 h-4" />
            <span className="text-xs">Fits</span>
          </button>
        </div>
      </div>

      {/* Account Profile, Partner Pairing & Preferences Modal */}
      <AccountModal
        isOpen={isAccountModalOpen}
        onClose={() => setIsAccountModalOpen(false)}
        authUser={authUser}
        userDoc={userDoc}
        workspace={workspace}
        activeProfile={activeProfile}
        onOpenEditOnboarding={() => setManualWizardOpen(true)}
        onUpdateCurrency={async (curr) => {
          await handleUpdateWorkspaceIdentities({
            currency: curr,
            partner1Name: workspace.partner1Name,
            partner1Role: workspace.partner1Role,
            partner2Name: workspace.partner2Name,
            partner2Role: workspace.partner2Role,
            defaultSlot: userDoc.defaultSlot,
          });
        }}
        onSignOut={handleSignOut}
        onJoinByCode={handleJoinByCode}
        onUnlinkPartner={handleUnlinkPartner}
        onUpdateWorkspaceIdentities={handleUpdateWorkspaceIdentities}
        onDeleteAllUserData={handleDeleteAllUserData}
      />
    </div>
  );
}
