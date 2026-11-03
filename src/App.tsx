import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  onAuthStateChanged,
  signInWithPopup,
  signOut,
  User as FirebaseUser,
} from 'firebase/auth';
import {
  doc,
  getDoc,
  onSnapshot,
  serverTimestamp,
  setDoc,
  updateDoc,
  writeBatch,
} from 'firebase/firestore';
import { AnimatePresence, motion } from 'motion/react';
import {
  Activity,
  Cloud,
  HeartHandshake,
  LogOut,
  Sparkles,
  Users,
  Watch,
} from 'lucide-react';
import {
  auth,
  clampNumber,
  db,
  googleProvider,
  handleFirestoreError,
  OperationType,
  sanitizeString,
  VALIDATION_BOUNDS,
} from './firebase';
import {
  CareProductDoc,
  CareSegment,
  DEFAULT_BODYCARE_CATEGORIES,
  DEFAULT_HAIRCARE_CATEGORIES,
  DEFAULT_SKINCARE_CATEGORIES,
  FitnessAppId,
  formatLocalDate,
  getFitnessAppMeta,
  getLastNDates,
  HealthLogDoc,
  PairingCodeDoc,
  PartnerProfileView,
  ProfileSlot,
  TopNavSection,
  UserDoc,
  WorkspaceDoc,
} from './types';
import { HealthDashboard } from './components/HealthDashboard';
import { SkinDashboard } from './components/SkinDashboard';
import { PartnerModal } from './components/PartnerModal';
import { OnboardingSubmission, OnboardingWizard } from './components/OnboardingWizard';
import { FitnessSyncModal } from './components/FitnessSyncModal';
import { VercelGuideModal } from './components/VercelGuideModal';

function generateSixDigitCode(): string {
  return String(Math.floor(100000 + Math.random() * 900000));
}

function getValidFitnessApp(val?: string): FitnessAppId {
  if (
    val === 'google_fit' ||
    val === 'apple_health' ||
    val === 'samsung_health' ||
    val === 'fitbit' ||
    val === 'garmin' ||
    val === 'manual'
  ) {
    return val;
  }
  return 'google_fit';
}

export default function App() {
  const todayDate = useMemo(() => formatLocalDate(new Date()), []);

  const [authUser, setAuthUser] = useState<FirebaseUser | null>(null);
  const [authReady, setAuthReady] = useState(false);
  const [signingIn, setSigningIn] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);

  const [userDoc, setUserDoc] = useState<UserDoc | null>(null);
  const [workspace, setWorkspace] = useState<WorkspaceDoc | null>(null);
  const [manualWizardOpen, setManualWizardOpen] = useState(false);

  const isBootstrappingRef = useRef(false);

  // Navigation & Active Profile Slot
  const [activeSection, setActiveSection] = useState<TopNavSection>('health');
  const [activeSlot, setActiveSlot] = useState<ProfileSlot>('partner1');
  const [hasInitializedSlot, setHasInitializedSlot] = useState(false);

  // Modals
  const [isPartnerModalOpen, setIsPartnerModalOpen] = useState(false);
  const [isFitnessSyncOpen, setIsFitnessSyncOpen] = useState(false);
  const [isVercelGuideOpen, setIsVercelGuideOpen] = useState(false);

  // Date state for Health Dashboard
  const [selectedDate, setSelectedDate] = useState<string>(todayDate);

  // Real-time maps of HealthLogs and CareProducts
  const [healthLogsMap, setHealthLogsMap] = useState<Record<string, HealthLogDoc>>({});
  const [careProductsMap, setCareProductsMap] = useState<Record<string, CareProductDoc>>({});

  // 1. Listen to Firebase Auth state
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (user) => {
      setAuthUser(user);
      setAuthReady(true);
      if (!user) {
        setUserDoc(null);
        setWorkspace(null);
        setHealthLogsMap({});
        setCareProductsMap({});
        setHasInitializedSlot(false);
      }
    });
    return () => unsub();
  }, []);

  // 2. Listen to /users/{uid} and bootstrap initial workspace if first login
  useEffect(() => {
    if (!authReady || !authUser) return;

    const userPath = `users/${authUser.uid}`;
    const userRef = doc(db, 'users', authUser.uid);

    const unsub = onSnapshot(
      userRef,
      async (snap) => {
        if (snap.exists()) {
          const data = snap.data() as UserDoc;
          setUserDoc(data);
          if (!hasInitializedSlot) {
            setActiveSlot(data.defaultSlot || 'partner1');
            setHasInitializedSlot(true);
          }
        } else if (!isBootstrappingRef.current) {
          isBootstrappingRef.current = true;
          try {
            const cleanUid = authUser.uid.replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 24) || 'user';
            const workspaceId = `ws_${cleanUid}_${Date.now()}`;
            let code = generateSixDigitCode();

            const existingCodeSnap = await getDoc(doc(db, 'pairingCodes', code));
            if (existingCodeSnap.exists()) {
              code = generateSixDigitCode();
            }

            const googleName = sanitizeString(
              authUser.displayName || authUser.email?.split('@')[0] || 'My Profile',
              VALIDATION_BOUNDS.MAX_DISPLAY_NAME,
              'My Profile'
            );

            const batch = writeBatch(db);

            batch.set(doc(db, 'workspaces', workspaceId), {
              id: workspaceId,
              ownerUid: authUser.uid,
              partnerUid: '',
              pairingCode: code,
              onboardingCompleted: false,
              currency: '₹',
              partner1Name: googleName,
              partner1Role: `${googleName}’s Dashboard`,
              partner1WeightUnit: 'kg',
              partner1TargetWeight: 62,
              partner1StartWeight: 65,
              partner1StepsGoal: 8500,
              partner1SleepGoalMinutes: 480,
              partner1WaterGoalMl: 2500,
              partner1FitnessApp: 'google_fit',
              partner2Name: 'Partner',
              partner2Role: 'Partner’s Dashboard',
              partner2WeightUnit: 'kg',
              partner2TargetWeight: 55,
              partner2StartWeight: 58,
              partner2StepsGoal: 8500,
              partner2SleepGoalMinutes: 480,
              partner2WaterGoalMl: 2500,
              partner2FitnessApp: 'google_fit',
              skincareCategories: DEFAULT_SKINCARE_CATEGORIES,
              haircareCategories: DEFAULT_HAIRCARE_CATEGORIES,
              bodycareCategories: DEFAULT_BODYCARE_CATEGORIES,
              productIds: [],
              createdAt: serverTimestamp(),
              updatedAt: serverTimestamp(),
            });

            batch.set(doc(db, 'pairingCodes', code), {
              code,
              workspaceId,
              ownerUid: authUser.uid,
              ownerName: googleName,
              createdAt: serverTimestamp(),
            });

            batch.set(userRef, {
              uid: authUser.uid,
              displayName: googleName,
              workspaceId,
              defaultSlot: 'partner1',
              onboardingCompleted: false,
              createdAt: serverTimestamp(),
              updatedAt: serverTimestamp(),
            });

            await batch.commit();
          } catch (error) {
            handleFirestoreError(error, OperationType.WRITE, userPath);
          } finally {
            isBootstrappingRef.current = false;
          }
        }
      },
      (error) => {
        handleFirestoreError(error, OperationType.GET, userPath);
      }
    );

    return () => unsub();
  }, [authReady, authUser, hasInitializedSlot]);

  // 3. Listen to active /workspaces/{workspaceId}
  useEffect(() => {
    if (!authReady || !authUser || !userDoc?.workspaceId) return;

    const wsPath = `workspaces/${userDoc.workspaceId}`;
    const wsRef = doc(db, 'workspaces', userDoc.workspaceId);

    const unsub = onSnapshot(
      wsRef,
      (snap) => {
        if (snap.exists()) {
          setWorkspace(snap.data() as WorkspaceDoc);
        }
      },
      (error) => {
        handleFirestoreError(error, OperationType.GET, wsPath);
      }
    );

    return () => unsub();
  }, [authReady, authUser, userDoc?.workspaceId]);

  // 4. Listen to deterministic daily HealthLog documents for both profiles across the active date window
  const watchedDates = useMemo(() => {
    const recent10 = getLastNDates(10, todayDate);
    const trend7 = getLastNDates(7, selectedDate);
    return Array.from(new Set([...recent10, ...trend7, todayDate, selectedDate]));
  }, [todayDate, selectedDate]);

  useEffect(() => {
    if (!authReady || !authUser || !workspace?.id) return;

    const unsubs: (() => void)[] = [];
    const slots: ProfileSlot[] = ['partner1', 'partner2'];

    for (const slot of slots) {
      for (const dateStr of watchedDates) {
        const logId = `${slot}_${dateStr}`;
        const logPath = `workspaces/${workspace.id}/healthLogs/${logId}`;
        const logRef = doc(db, 'workspaces', workspace.id, 'healthLogs', logId);

        const u = onSnapshot(
          logRef,
          (snap) => {
            setHealthLogsMap((prev) => {
              const next = { ...prev };
              if (snap.exists()) {
                next[logId] = snap.data() as HealthLogDoc;
              } else {
                delete next[logId];
              }
              return next;
            });
          },
          (error) => {
            handleFirestoreError(error, OperationType.GET, logPath);
          }
        );
        unsubs.push(u);
      }
    }

    return () => {
      unsubs.forEach((fn) => fn());
    };
  }, [authReady, authUser, workspace?.id, watchedDates]);

  // 5. Listen to CareProduct documents indexed in workspace.productIds
  const productIdsKey = workspace?.productIds ? workspace.productIds.join(',') : '';

  useEffect(() => {
    if (!authReady || !authUser || !workspace?.id) return;

    const ids = workspace.productIds || [];
    if (ids.length === 0) {
      setCareProductsMap({});
      return;
    }

    const unsubs: (() => void)[] = [];

    for (const prodId of ids) {
      const prodPath = `workspaces/${workspace.id}/careProducts/${prodId}`;
      const prodRef = doc(db, 'workspaces', workspace.id, 'careProducts', prodId);

      const u = onSnapshot(
        prodRef,
        (snap) => {
          setCareProductsMap((prev) => {
            const next = { ...prev };
            if (snap.exists()) {
              next[prodId] = snap.data() as CareProductDoc;
            } else {
              delete next[prodId];
            }
            return next;
          });
        },
        (error) => {
          handleFirestoreError(error, OperationType.GET, prodPath);
        }
      );
      unsubs.push(u);
    }

    return () => {
      unsubs.forEach((fn) => fn());
    };
  }, [authReady, authUser, workspace?.id, productIdsKey]);

  // Derived profile views
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
      fitnessApp: getValidFitnessApp(workspace.partner1FitnessApp),
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
      fitnessApp: getValidFitnessApp(workspace.partner2FitnessApp),
    };
  }, [workspace]);

  const activeProfile = activeSlot === 'partner2' ? partner2Profile : partner1Profile;
  const otherProfile = activeSlot === 'partner2' ? partner1Profile : partner2Profile;

  // Map logs by date for the currently active profile
  const activeProfileLogsByDate = useMemo(() => {
    const result: Record<string, HealthLogDoc> = {};
    for (const [key, log] of Object.entries(healthLogsMap)) {
      if (key.startsWith(`${activeSlot}_`)) {
        result[log.date] = log;
      }
    }
    return result;
  }, [healthLogsMap, activeSlot]);

  const otherProfileTodayLog = useMemo(() => {
    if (!otherProfile) return undefined;
    return healthLogsMap[`${otherProfile.slot}_${todayDate}`];
  }, [healthLogsMap, otherProfile, todayDate]);

  const orderedProductsList = useMemo(() => {
    if (!workspace?.productIds) return [];
    return workspace.productIds
      .map((id) => careProductsMap[id])
      .filter((p): p is CareProductDoc => Boolean(p));
  }, [workspace?.productIds, careProductsMap]);

  // Helper to ensure partner1FitnessApp & partner2FitnessApp are always included in workspace updates
  const getFitnessAppFields = (ws: WorkspaceDoc, overrides?: Partial<Record<'partner1FitnessApp' | 'partner2FitnessApp', FitnessAppId>>) => ({
    partner1FitnessApp: overrides?.partner1FitnessApp || getValidFitnessApp(ws.partner1FitnessApp),
    partner2FitnessApp: overrides?.partner2FitnessApp || getValidFitnessApp(ws.partner2FitnessApp),
  });

  // Handlers
  const handleGoogleSignIn = async () => {
    setSigningIn(true);
    setAuthError(null);
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (err) {
      setAuthError(err instanceof Error ? err.message : 'Sign-in was cancelled or failed.');
    } finally {
      setSigningIn(false);
    }
  };

  // Complete the 4-Step Onboarding Questionnaire and sync name + fitness app + goals to Firebase
  const handleOnboardingComplete = async (submission: OnboardingSubmission) => {
    if (!authUser || !userDoc || !workspace) return;

    const cleanMyName = sanitizeString(
      submission.myName,
      VALIDATION_BOUNDS.MAX_DISPLAY_NAME,
      'Me'
    );
    const cleanPartnerName = sanitizeString(
      submission.partnerName,
      VALIDATION_BOUNDS.MAX_DISPLAY_NAME,
      'Partner'
    );

    if (submission.mode === 'join_partner_code' && submission.partnerCodeToJoin) {
      const code = submission.partnerCodeToJoin;
      const codeSnap = await getDoc(doc(db, 'pairingCodes', code));
      if (!codeSnap.exists()) {
        throw new Error('No workspace found for that 6-digit partner code.');
      }
      const pairingData = codeSnap.data() as PairingCodeDoc;
      const targetWsId = pairingData.workspaceId;
      const targetWsRef = doc(db, 'workspaces', targetWsId);
      const targetWsSnap = await getDoc(targetWsRef);
      if (!targetWsSnap.exists()) {
        throw new Error('Target partner workspace could not be found.');
      }
      const targetWs = targetWsSnap.data() as WorkspaceDoc;
      if (
        targetWs.partnerUid &&
        targetWs.partnerUid !== '' &&
        targetWs.partnerUid !== authUser.uid &&
        targetWs.ownerUid !== authUser.uid
      ) {
        throw new Error('That workspace is already connected to another partner account.');
      }

      const assignedSlot: ProfileSlot = targetWs.ownerUid === authUser.uid ? 'partner1' : 'partner2';

      if (assignedSlot === 'partner2') {
        await updateDoc(targetWsRef, {
          ...getFitnessAppFields(targetWs, { partner2FitnessApp: submission.fitnessApp }),
          partnerUid: authUser.uid,
          partner2Name: cleanMyName,
          partner2Role: `${cleanMyName}’s Dashboard`,
          partner2WeightUnit: submission.weightUnit,
          partner2StartWeight: clampNumber(submission.currentWeight, 0, VALIDATION_BOUNDS.MAX_WEIGHT, 60),
          partner2TargetWeight: clampNumber(submission.targetWeight, 0, VALIDATION_BOUNDS.MAX_WEIGHT, 58),
          partner2StepsGoal: clampNumber(submission.stepsGoal, 100, 100000, 8500),
          partner2SleepGoalMinutes: clampNumber(submission.sleepGoalMinutes, 60, 1440, 480),
          partner2WaterGoalMl: clampNumber(submission.waterGoalMl, 250, 15000, 2500),
          onboardingCompleted: true,
          updatedAt: serverTimestamp(),
        });
      }

      await updateDoc(doc(db, 'users', authUser.uid), {
        displayName: cleanMyName,
        workspaceId: targetWsId,
        defaultSlot: assignedSlot,
        onboardingCompleted: true,
        updatedAt: serverTimestamp(),
      });

      const initLogId = `${assignedSlot}_${todayDate}`;
      await setDoc(doc(db, 'workspaces', targetWsId, 'healthLogs', initLogId), {
        id: initLogId,
        workspaceId: targetWsId,
        profileSlot: assignedSlot,
        date: todayDate,
        weight: clampNumber(submission.currentWeight, 0, VALIDATION_BOUNDS.MAX_WEIGHT, 0),
        steps: 0,
        sleepMinutes: 0,
        waterMl: 0,
        note: 'Initial baseline logged during onboarding',
        updatedByUid: authUser.uid,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });

      setActiveSlot(assignedSlot);
      setManualWizardOpen(false);
      return;
    }

    // Standard mode: Update user's own workspace (or current slot) in Firebase
    const isPartner2Creator = workspace.partnerUid === authUser.uid;
    const mySlot: ProfileSlot = isPartner2Creator ? 'partner2' : 'partner1';
    const prefix = mySlot === 'partner2' ? 'partner2' : 'partner1';

    const wsPath = `workspaces/${workspace.id}`;
    try {
      const wsUpdates: Record<string, unknown> = {
        ...getFitnessAppFields(workspace, {
          [`${prefix}FitnessApp`]: submission.fitnessApp,
        }),
        onboardingCompleted: true,
        currency: sanitizeString(submission.currency, VALIDATION_BOUNDS.MAX_CURRENCY, '₹'),
        [`${prefix}Name`]: cleanMyName,
        [`${prefix}Role`]: `${cleanMyName}’s Dashboard`,
        [`${prefix}WeightUnit`]: submission.weightUnit,
        [`${prefix}StartWeight`]: clampNumber(
          submission.currentWeight,
          0,
          VALIDATION_BOUNDS.MAX_WEIGHT,
          65
        ),
        [`${prefix}TargetWeight`]: clampNumber(
          submission.targetWeight,
          0,
          VALIDATION_BOUNDS.MAX_WEIGHT,
          62
        ),
        [`${prefix}StepsGoal`]: clampNumber(submission.stepsGoal, 100, 100000, 8500),
        [`${prefix}SleepGoalMinutes`]: clampNumber(submission.sleepGoalMinutes, 60, 1440, 480),
        [`${prefix}WaterGoalMl`]: clampNumber(submission.waterGoalMl, 250, 15000, 2500),
        skincareCategories: submission.skincareCategories.slice(0, 30),
        haircareCategories: submission.haircareCategories.slice(0, 30),
        bodycareCategories: submission.bodycareCategories.slice(0, 30),
        updatedAt: serverTimestamp(),
      };

      if (mySlot === 'partner1') {
        wsUpdates.partner2Name = cleanPartnerName;
        wsUpdates.partner2Role = `${cleanPartnerName}’s Dashboard`;
      }

      await updateDoc(doc(db, 'workspaces', workspace.id), wsUpdates);

      await updateDoc(doc(db, 'users', authUser.uid), {
        displayName: cleanMyName,
        defaultSlot: mySlot,
        onboardingCompleted: true,
        updatedAt: serverTimestamp(),
      });

      if (workspace.ownerUid === authUser.uid && workspace.pairingCode) {
        await updateDoc(doc(db, 'pairingCodes', workspace.pairingCode), {
          ownerName: cleanMyName,
        });
      }

      const todayLogId = `${mySlot}_${todayDate}`;
      const existingTodayLog = healthLogsMap[todayLogId];
      const todayLogRef = doc(db, 'workspaces', workspace.id, 'healthLogs', todayLogId);
      if (existingTodayLog) {
        await updateDoc(todayLogRef, {
          weight: clampNumber(submission.currentWeight, 0, VALIDATION_BOUNDS.MAX_WEIGHT, 0),
          updatedByUid: authUser.uid,
          updatedAt: serverTimestamp(),
        });
      } else {
        await setDoc(todayLogRef, {
          id: todayLogId,
          workspaceId: workspace.id,
          profileSlot: mySlot,
          date: todayDate,
          weight: clampNumber(submission.currentWeight, 0, VALIDATION_BOUNDS.MAX_WEIGHT, 0),
          steps: 0,
          sleepMinutes: 0,
          waterMl: 0,
          note: 'Initial baseline logged during setup',
          updatedByUid: authUser.uid,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
      }

      setActiveSlot(mySlot);
      setManualWizardOpen(false);
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, wsPath);
    }
  };

  const handleSaveHealthLog = async (
    date: string,
    updates: Partial<Pick<HealthLogDoc, 'weight' | 'steps' | 'sleepMinutes' | 'waterMl' | 'note'>>
  ) => {
    if (!authUser || !workspace) return;
    const logId = `${activeSlot}_${date}`;
    const logPath = `workspaces/${workspace.id}/healthLogs/${logId}`;
    const logRef = doc(db, 'workspaces', workspace.id, 'healthLogs', logId);
    const existing = healthLogsMap[logId];

    const payload = {
      id: logId,
      workspaceId: workspace.id,
      profileSlot: activeSlot,
      date,
      weight: clampNumber(
        updates.weight !== undefined ? updates.weight : existing?.weight ?? 0,
        0,
        VALIDATION_BOUNDS.MAX_WEIGHT
      ),
      steps: clampNumber(
        updates.steps !== undefined ? updates.steps : existing?.steps ?? 0,
        0,
        VALIDATION_BOUNDS.MAX_STEPS
      ),
      sleepMinutes: clampNumber(
        updates.sleepMinutes !== undefined ? updates.sleepMinutes : existing?.sleepMinutes ?? 0,
        0,
        VALIDATION_BOUNDS.MAX_SLEEP_MINUTES
      ),
      waterMl: clampNumber(
        updates.waterMl !== undefined ? updates.waterMl : existing?.waterMl ?? 0,
        0,
        VALIDATION_BOUNDS.MAX_WATER_ML
      ),
      note: sanitizeString(
        updates.note !== undefined ? updates.note : existing?.note ?? '',
        VALIDATION_BOUNDS.MAX_NOTE
      ),
      updatedByUid: authUser.uid,
      updatedAt: serverTimestamp(),
    };

    try {
      if (existing) {
        await updateDoc(logRef, {
          weight: payload.weight,
          steps: payload.steps,
          sleepMinutes: payload.sleepMinutes,
          waterMl: payload.waterMl,
          note: payload.note,
          updatedByUid: payload.updatedByUid,
          updatedAt: serverTimestamp(),
        });
      } else {
        await setDoc(logRef, {
          ...payload,
          createdAt: serverTimestamp(),
        });
      }
    } catch (error) {
      handleFirestoreError(
        error,
        existing ? OperationType.UPDATE : OperationType.CREATE,
        logPath
      );
    }
  };

  const handleSelectFitnessApp = async (appId: FitnessAppId) => {
    if (!authUser || !workspace) return;
    const wsPath = `workspaces/${workspace.id}`;
    const prefix = activeSlot === 'partner1' ? 'partner1FitnessApp' : 'partner2FitnessApp';
    try {
      await updateDoc(doc(db, 'workspaces', workspace.id), {
        ...getFitnessAppFields(workspace, { [prefix]: appId }),
        updatedAt: serverTimestamp(),
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, wsPath);
    }
  };

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
    const wsPath = `workspaces/${workspace.id}`;
    const wsRef = doc(db, 'workspaces', workspace.id);

    const prefix = activeSlot === 'partner1' ? 'partner1' : 'partner2';
    const cleanName = sanitizeString(
      goals.name,
      VALIDATION_BOUNDS.MAX_DISPLAY_NAME,
      activeSlot === 'partner1' ? 'Me' : 'Partner'
    );

    try {
      await updateDoc(wsRef, {
        ...getFitnessAppFields(workspace, {
          [`${prefix}FitnessApp`]: goals.fitnessApp,
        }),
        [`${prefix}Name`]: cleanName,
        [`${prefix}Role`]: sanitizeString(
          goals.role,
          VALIDATION_BOUNDS.MAX_ROLE_LABEL,
          `${cleanName}’s Dashboard`
        ),
        [`${prefix}WeightUnit`]: goals.weightUnit,
        [`${prefix}TargetWeight`]: clampNumber(
          goals.targetWeight,
          0,
          VALIDATION_BOUNDS.MAX_WEIGHT,
          60
        ),
        [`${prefix}StartWeight`]: clampNumber(
          goals.startWeight,
          0,
          VALIDATION_BOUNDS.MAX_WEIGHT,
          60
        ),
        [`${prefix}StepsGoal`]: clampNumber(goals.stepsGoal, 100, 100000, 8500),
        [`${prefix}SleepGoalMinutes`]: clampNumber(
          goals.sleepGoalMinutes,
          60,
          VALIDATION_BOUNDS.MAX_SLEEP_MINUTES,
          480
        ),
        [`${prefix}WaterGoalMl`]: clampNumber(goals.waterGoalMl, 250, 15000, 2500),
        updatedAt: serverTimestamp(),
      });

      if (
        (activeSlot === 'partner1' && workspace.ownerUid === authUser.uid) ||
        (activeSlot === 'partner2' && workspace.partnerUid === authUser.uid)
      ) {
        await updateDoc(doc(db, 'users', authUser.uid), {
          displayName: cleanName,
          updatedAt: serverTimestamp(),
        });
      }
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, wsPath);
    }
  };

  const handleSaveProduct = async (
    productInput: Omit<
      CareProductDoc,
      'id' | 'workspaceId' | 'updatedByUid' | 'createdAt' | 'updatedAt'
    >,
    existingId?: string
  ) => {
    if (!authUser || !workspace) return;

    const productId = existingId || `prod_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
    const prodPath = `workspaces/${workspace.id}/careProducts/${productId}`;
    const prodRef = doc(db, 'workspaces', workspace.id, 'careProducts', productId);

    const sanitizedPayload = {
      profileSlot: productInput.profileSlot,
      segment: productInput.segment,
      subCategory: sanitizeString(
        productInput.subCategory,
        VALIDATION_BOUNDS.MAX_CATEGORY_NAME,
        'Essentials'
      ),
      name: sanitizeString(
        productInput.name,
        VALIDATION_BOUNDS.MAX_PRODUCT_NAME,
        'Care Product'
      ),
      brand: sanitizeString(
        productInput.brand,
        VALIDATION_BOUNDS.MAX_BRAND_NAME,
        'Brand'
      ),
      quantity: clampNumber(
        Math.round(productInput.quantity || 1),
        1,
        VALIDATION_BOUNDS.MAX_QUANTITY,
        1
      ),
      orderedDate: sanitizeString(productInput.orderedDate, VALIDATION_BOUNDS.MAX_DATE_STR),
      openedDate: sanitizeString(productInput.openedDate, VALIDATION_BOUNDS.MAX_DATE_STR),
      expiryDate: sanitizeString(productInput.expiryDate, VALIDATION_BOUNDS.MAX_DATE_STR),
      saleInfo: sanitizeString(productInput.saleInfo, VALIDATION_BOUNDS.MAX_SALE_INFO),
      pricePaid: clampNumber(productInput.pricePaid, 0, VALIDATION_BOUNDS.MAX_PRICE),
      originalPrice: clampNumber(productInput.originalPrice, 0, VALIDATION_BOUNDS.MAX_PRICE),
      status: productInput.status,
      routineTime: productInput.routineTime,
      notes: sanitizeString(productInput.notes, VALIDATION_BOUNDS.MAX_NOTE),
      updatedByUid: authUser.uid,
      updatedAt: serverTimestamp(),
    };

    try {
      if (existingId && careProductsMap[existingId]) {
        await updateDoc(prodRef, sanitizedPayload);
      } else {
        if (workspace.productIds.length >= VALIDATION_BOUNDS.MAX_PRODUCTS_PER_WORKSPACE) {
          throw new Error('Maximum of 100 products reached in this workspace.');
        }
        const batch = writeBatch(db);
        batch.set(prodRef, {
          id: productId,
          workspaceId: workspace.id,
          ...sanitizedPayload,
          createdAt: serverTimestamp(),
        });
        batch.update(doc(db, 'workspaces', workspace.id), {
          ...getFitnessAppFields(workspace),
          productIds: [...workspace.productIds, productId],
          updatedAt: serverTimestamp(),
        });
        await batch.commit();
      }
    } catch (error) {
      handleFirestoreError(
        error,
        existingId ? OperationType.UPDATE : OperationType.CREATE,
        prodPath
      );
    }
  };

  const handleDeleteProduct = async (productId: string) => {
    if (!authUser || !workspace) return;
    const prodPath = `workspaces/${workspace.id}/careProducts/${productId}`;
    try {
      const batch = writeBatch(db);
      batch.delete(doc(db, 'workspaces', workspace.id, 'careProducts', productId));
      batch.update(doc(db, 'workspaces', workspace.id), {
        ...getFitnessAppFields(workspace),
        productIds: workspace.productIds.filter((id) => id !== productId),
        updatedAt: serverTimestamp(),
      });
      await batch.commit();
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, prodPath);
    }
  };

  const handleAddSubCategory = async (segment: CareSegment, categoryName: string) => {
    if (!authUser || !workspace) return;
    const clean = sanitizeString(categoryName, VALIDATION_BOUNDS.MAX_CATEGORY_NAME);
    if (!clean) return;

    const fieldName =
      segment === 'skincare'
        ? 'skincareCategories'
        : segment === 'haircare'
        ? 'haircareCategories'
        : 'bodycareCategories';

    const currentList = workspace[fieldName] || [];
    if (
      currentList.includes(clean) ||
      currentList.length >= VALIDATION_BOUNDS.MAX_CATEGORIES_PER_SEGMENT
    ) {
      return;
    }

    const wsPath = `workspaces/${workspace.id}`;
    try {
      await updateDoc(doc(db, 'workspaces', workspace.id), {
        ...getFitnessAppFields(workspace),
        [fieldName]: [...currentList, clean],
        updatedAt: serverTimestamp(),
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, wsPath);
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

    const updated = currentList.filter((c) => c !== categoryName);
    if (updated.length === 0) return;

    const wsPath = `workspaces/${workspace.id}`;
    try {
      await updateDoc(doc(db, 'workspaces', workspace.id), {
        ...getFitnessAppFields(workspace),
        [fieldName]: updated,
        updatedAt: serverTimestamp(),
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, wsPath);
    }
  };

  const handleJoinByCode = async (code: string) => {
    if (!authUser || !userDoc) return;
    const codePath = `pairingCodes/${code}`;
    let pairingData: PairingCodeDoc;

    try {
      const codeSnap = await getDoc(doc(db, 'pairingCodes', code));
      if (!codeSnap.exists()) {
        throw new Error('No workspace found for that 6-digit code.');
      }
      pairingData = codeSnap.data() as PairingCodeDoc;
    } catch (error) {
      if (error instanceof Error && error.message.includes('No workspace')) {
        throw error;
      }
      handleFirestoreError(error, OperationType.GET, codePath);
    }

    const targetWsId = pairingData.workspaceId;
    const targetWsPath = `workspaces/${targetWsId}`;
    try {
      const targetWsRef = doc(db, 'workspaces', targetWsId);
      const targetWsSnap = await getDoc(targetWsRef);
      if (!targetWsSnap.exists()) {
        throw new Error('Target workspace does not exist.');
      }
      const targetWs = targetWsSnap.data() as WorkspaceDoc;
      if (
        targetWs.partnerUid &&
        targetWs.partnerUid !== '' &&
        targetWs.partnerUid !== authUser.uid &&
        targetWs.ownerUid !== authUser.uid
      ) {
        throw new Error('That workspace is already paired with another account.');
      }

      if (targetWs.ownerUid !== authUser.uid) {
        await updateDoc(targetWsRef, {
          ...getFitnessAppFields(targetWs),
          partnerUid: authUser.uid,
          partner2Name: userDoc.displayName || 'Partner',
          partner2Role: `${userDoc.displayName || 'Partner'}’s Dashboard`,
          updatedAt: serverTimestamp(),
        });
      }

      await updateDoc(doc(db, 'users', authUser.uid), {
        workspaceId: targetWsId,
        defaultSlot: targetWs.ownerUid === authUser.uid ? 'partner1' : 'partner2',
        onboardingCompleted: true,
        updatedAt: serverTimestamp(),
      });
    } catch (error) {
      if (error instanceof Error && error.message.includes('already paired')) {
        throw error;
      }
      handleFirestoreError(error, OperationType.UPDATE, targetWsPath);
    }
  };

  const handleUnlinkPartner = async () => {
    if (!authUser || !workspace) return;
    const wsPath = `workspaces/${workspace.id}`;
    try {
      await updateDoc(doc(db, 'workspaces', workspace.id), {
        ...getFitnessAppFields(workspace),
        partnerUid: '',
        updatedAt: serverTimestamp(),
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, wsPath);
    }
  };

  const handleUpdateWorkspaceIdentities = async (updates: {
    currency: string;
    partner1Name: string;
    partner1Role: string;
    partner2Name: string;
    partner2Role: string;
    defaultSlot: ProfileSlot;
  }) => {
    if (!authUser || !workspace || !userDoc) return;
    const wsPath = `workspaces/${workspace.id}`;
    const cleanP1 = sanitizeString(updates.partner1Name, VALIDATION_BOUNDS.MAX_DISPLAY_NAME, 'Me');
    const cleanP2 = sanitizeString(
      updates.partner2Name,
      VALIDATION_BOUNDS.MAX_DISPLAY_NAME,
      'Partner'
    );

    try {
      await updateDoc(doc(db, 'workspaces', workspace.id), {
        ...getFitnessAppFields(workspace),
        currency: sanitizeString(updates.currency, VALIDATION_BOUNDS.MAX_CURRENCY, '₹'),
        partner1Name: cleanP1,
        partner1Role: sanitizeString(
          updates.partner1Role,
          VALIDATION_BOUNDS.MAX_ROLE_LABEL,
          `${cleanP1}’s Dashboard`
        ),
        partner2Name: cleanP2,
        partner2Role: sanitizeString(
          updates.partner2Role,
          VALIDATION_BOUNDS.MAX_ROLE_LABEL,
          `${cleanP2}’s Dashboard`
        ),
        updatedAt: serverTimestamp(),
      });

      const myNameInWs = workspace.ownerUid === authUser.uid ? cleanP1 : cleanP2;
      await updateDoc(doc(db, 'users', authUser.uid), {
        displayName: myNameInWs,
        defaultSlot: updates.defaultSlot,
        updatedAt: serverTimestamp(),
      });

      if (workspace.ownerUid === authUser.uid && workspace.pairingCode) {
        await updateDoc(doc(db, 'pairingCodes', workspace.pairingCode), {
          ownerName: cleanP1,
        });
      }
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, wsPath);
    }
  };

  // Initial Auth Loading
  if (!authReady) {
    return (
      <div className="min-h-screen bg-[#090A0F] flex items-center justify-center p-6">
        <div className="text-center space-y-2">
          <div className="w-10 h-10 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center mx-auto animate-pulse">
            <HeartHandshake className="w-5 h-5 text-rose-400" />
          </div>
          <p className="text-xs text-zinc-400 font-medium">Loading DuoPulse...</p>
        </div>
      </div>
    );
  }

  // Step 0: Strictly Login-Based Mobile-First Entry Screen
  if (!authUser) {
    return (
      <div className="min-h-screen bg-[#090A0F] text-zinc-100 flex flex-col justify-between p-4 sm:p-10">
        <header className="max-w-5xl w-full mx-auto flex items-center justify-between gap-4">
          <span className="text-lg font-bold tracking-tight text-white font-display whitespace-nowrap shrink-0">
            DuoPulse
          </span>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setIsVercelGuideOpen(true)}
              className="min-h-[40px] px-3 py-2 rounded-xl bg-white/8 hover:bg-white/12 border border-white/10 text-xs font-medium text-zinc-200 flex items-center gap-1.5 transition-colors"
            >
              <Cloud className="w-3.5 h-3.5 text-emerald-400" />
              <span>Vercel Guide</span>
            </button>
            <button
              type="button"
              onClick={handleGoogleSignIn}
              disabled={signingIn}
              className="min-h-[40px] px-4 py-2 rounded-xl bg-white text-zinc-950 hover:bg-zinc-200 text-xs font-semibold transition-colors whitespace-nowrap shrink-0"
            >
              {signingIn ? 'Signing in...' : 'Sign In'}
            </button>
          </div>
        </header>

        <main className="max-w-4xl w-full mx-auto my-auto py-8 sm:py-12 grid grid-cols-1 lg:grid-cols-12 gap-6 sm:gap-8 items-center">
          <div className="lg:col-span-7 space-y-5">
            <div className="text-xs font-medium text-rose-400 tracking-wide">
              Mobile-First · Cloud Saved · Google Fit & Multi-App Sync
            </div>
            <h1 className="text-3xl sm:text-5xl font-extrabold tracking-tight text-white leading-[1.1] text-balance">
              Your daily health rings and care routine—saved & synced with your partner.
            </h1>
            <p className="text-sm sm:text-base text-zinc-400 leading-relaxed max-w-xl">
              Sign in with Google so every log, fitness app connection (Google Fit, Apple Health, Samsung Health, Fitbit, Garmin), daily weight, step count, sleep, hydration ring, and Skincare/Haircare/Bodycare inventory (with bulk 2+ quantities) is saved automatically in real time.
            </p>

            <div className="pt-1 space-y-3">
              <button
                type="button"
                onClick={handleGoogleSignIn}
                disabled={signingIn}
                className="w-full sm:w-auto min-h-[52px] px-7 py-3.5 rounded-2xl bg-white text-zinc-950 hover:bg-zinc-200 text-sm font-semibold inline-flex items-center justify-center gap-2.5 transition-all shadow-lg shadow-white/5"
              >
                <HeartHandshake className="w-4 h-4 text-rose-500" />
                <span>
                  {signingIn ? 'Connecting Google Account...' : 'Sign In with Google to Start'}
                </span>
              </button>
              {authError && <p className="text-xs text-rose-400">{authError}</p>}
              <p className="text-xs text-zinc-500">
                100% Login-Based Cloud Persistence · Connect with your partner anytime via a 6-digit code.
              </p>
            </div>
          </div>

          {/* Mobile-First Preview Card */}
          <div className="lg:col-span-5 rounded-3xl bg-[#12141C] border border-white/10 p-5 sm:p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-white/8 pb-3.5">
              <div>
                <div className="text-xs text-emerald-400 font-medium">Fitness App Sync</div>
                <div className="text-sm sm:text-base font-bold text-white">
                  Google Fit · Apple · Samsung · Fitbit
                </div>
              </div>
              <div className="flex items-center gap-1 p-1 rounded-full bg-zinc-900 border border-white/10 text-xs font-medium">
                <span className="px-2.5 py-1 rounded-full bg-white text-zinc-950 font-semibold">
                  Health
                </span>
                <span className="px-2.5 py-1 text-zinc-400">Skin</span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2.5">
              <div className="rounded-2xl bg-zinc-900/90 border border-white/6 p-3 space-y-1">
                <div className="text-xs text-rose-400 font-medium">Daily Weight</div>
                <div className="text-base font-mono font-bold text-white tabular-nums">
                  Start → Goal
                </div>
                <div className="text-[11px] text-zinc-400">Circular ring + 7d curve</div>
              </div>
              <div className="rounded-2xl bg-zinc-900/90 border border-white/6 p-3 space-y-1">
                <div className="text-xs text-emerald-400 font-medium">Steps + Fitness App</div>
                <div className="text-base font-mono font-bold text-white tabular-nums">
                  Google Fit Sync
                </div>
                <div className="text-[11px] text-zinc-400">Or exact EOD input</div>
              </div>
              <div className="rounded-2xl bg-zinc-900/90 border border-white/6 p-3 space-y-1">
                <div className="text-xs text-indigo-400 font-medium">Total Sleep</div>
                <div className="text-base font-mono font-bold text-white tabular-nums">
                  Hrs & Mins
                </div>
                <div className="text-[11px] text-zinc-400">Duration ring tracker</div>
              </div>
              <div className="rounded-2xl bg-zinc-900/90 border border-white/6 p-3 space-y-1">
                <div className="text-xs text-sky-400 font-medium">Water Intake</div>
                <div className="text-base font-mono font-bold text-white tabular-nums">
                  Daily ml / L
                </div>
                <div className="text-[11px] text-zinc-400">Hydration progress ring</div>
              </div>
            </div>

            <div className="rounded-2xl bg-zinc-900/90 border border-white/6 p-3.5 space-y-1">
              <div className="text-xs text-amber-400 font-medium">
                Skincare · Haircare · Bodycare + Bulk Quantities
              </div>
              <p className="text-xs text-zinc-400 leading-relaxed">
                Track custom categories, bulk quantities (shown when 2+), order/open/expiry dates, sale info, and prices paid.
              </p>
            </div>
          </div>
        </main>

        <footer className="max-w-5xl w-full mx-auto text-xs text-zinc-500 flex items-center justify-between">
          <span>DuoPulse — Mobile-First Health & Care Tracker</span>
          <button
            type="button"
            onClick={() => setIsVercelGuideOpen(true)}
            className="text-zinc-400 hover:text-white underline underline-offset-4"
          >
            Host on Vercel Guide
          </button>
        </footer>

        <VercelGuideModal
          isOpen={isVercelGuideOpen}
          onClose={() => setIsVercelGuideOpen(false)}
        />
      </div>
    );
  }

  // Wait for userDoc & workspace from Firestore
  if (
    !workspace ||
    !userDoc ||
    !activeProfile ||
    !otherProfile ||
    !partner1Profile ||
    !partner2Profile
  ) {
    return (
      <div className="min-h-screen bg-[#090A0F] flex items-center justify-center p-6">
        <div className="text-center space-y-2">
          <div className="w-10 h-10 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center mx-auto animate-pulse">
            <Sparkles className="w-5 h-5 text-rose-400" />
          </div>
          <p className="text-xs text-zinc-400 font-medium">
            Syncing your Firebase profile...
          </p>
        </div>
      </div>
    );
  }

  // Show Step-by-Step Onboarding Questionnaire if onboarding is not completed yet (or manually opened)
  if (!userDoc.onboardingCompleted || !workspace.onboardingCompleted || manualWizardOpen) {
    return (
      <OnboardingWizard
        initialName={
          userDoc.displayName ||
          authUser.displayName?.split(' ')[0] ||
          workspace.partner1Name
        }
        initialPartnerName={workspace.partner2Name}
        initialCurrency={workspace.currency}
        initialFitnessApp={activeProfile.fitnessApp}
        pairingCode={workspace.pairingCode}
        onComplete={handleOnboardingComplete}
        onCancel={
          userDoc.onboardingCompleted && workspace.onboardingCompleted
            ? () => setManualWizardOpen(false)
            : undefined
        }
      />
    );
  }

  const activeFitnessMeta = getFitnessAppMeta(activeProfile.fitnessApp);

  return (
    <div className="min-h-screen bg-[#090A0F] text-zinc-100 flex flex-col">
      {/* Sticky Compact Top Navigation Bar (Strictly <= 15% mobile viewport height) */}
      <header className="sticky top-0 z-30 h-14 sm:h-16 bg-[#090A0F]/90 backdrop-blur-md border-b border-white/8 px-3 sm:px-6 flex items-center justify-between gap-2 sm:gap-6">
        {/* Zone 1: Brand Wordmark */}
        <a
          href="#top"
          onClick={(e) => {
            e.preventDefault();
            window.scrollTo({ top: 0, behavior: 'smooth' });
          }}
          className="text-sm sm:text-lg font-bold tracking-tight text-white font-display whitespace-nowrap shrink-0"
        >
          DuoPulse
        </a>

        {/* Zone 2: Top Pilled Navbar [ Health | Skin ] */}
        <nav
          aria-label="Primary View Switcher"
          className="flex items-center p-1 rounded-full bg-[#12141C] border border-white/10"
        >
          <button
            type="button"
            onClick={() => setActiveSection('health')}
            className={`relative min-h-[34px] sm:min-h-[36px] px-3.5 sm:px-5 py-1 rounded-full text-xs font-semibold transition-colors whitespace-nowrap shrink-0 flex items-center gap-1.5 ${
              activeSection === 'health' ? 'text-zinc-950' : 'text-zinc-400 hover:text-white'
            }`}
          >
            {activeSection === 'health' && (
              <motion.span
                layoutId="topNavPill"
                transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
                className="absolute inset-0 rounded-full bg-white"
              />
            )}
            <Activity className="w-3.5 h-3.5 relative z-10" />
            <span className="relative z-10">Health</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveSection('skin')}
            className={`relative min-h-[34px] sm:min-h-[36px] px-3.5 sm:px-5 py-1 rounded-full text-xs font-semibold transition-colors whitespace-nowrap shrink-0 flex items-center gap-1.5 ${
              activeSection === 'skin' ? 'text-zinc-950' : 'text-zinc-400 hover:text-white'
            }`}
          >
            {activeSection === 'skin' && (
              <motion.span
                layoutId="topNavPill"
                transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
                className="absolute inset-0 rounded-full bg-white"
              />
            )}
            <Sparkles className="w-3.5 h-3.5 relative z-10" />
            <span className="relative z-10">Skin</span>
          </button>
        </nav>

        {/* Zone 3: Connected Account Switcher & Actions */}
        <div className="flex items-center gap-1 sm:gap-2 shrink-0">
          {/* Connected Account Switcher */}
          <div className="flex items-center p-0.5 rounded-full bg-[#12141C] border border-white/10">
            <button
              type="button"
              onClick={() => setActiveSlot('partner1')}
              className={`min-h-[32px] sm:min-h-[34px] px-2.5 sm:px-3 rounded-full text-xs font-medium transition-colors whitespace-nowrap truncate max-w-[76px] sm:max-w-[130px] ${
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
              className={`min-h-[32px] sm:min-h-[34px] px-2.5 sm:px-3 rounded-full text-xs font-medium transition-colors whitespace-nowrap truncate max-w-[76px] sm:max-w-[130px] ${
                activeSlot === 'partner2'
                  ? 'bg-rose-500 text-white font-semibold'
                  : 'text-zinc-400 hover:text-white'
              }`}
              title={`View ${partner2Profile.name}'s Dashboard`}
            >
              {partner2Profile.name}
            </button>
          </div>

          <button
            type="button"
            onClick={() => setIsFitnessSyncOpen(true)}
            className="hidden sm:flex min-h-[36px] px-3 rounded-full bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-500/30 items-center justify-center gap-1.5 text-xs font-medium text-emerald-300 transition-colors shrink-0"
            title={`Fitness App Sync (${activeFitnessMeta.name})`}
          >
            <Watch className="w-3.5 h-3.5 text-emerald-400" />
            <span className="hidden lg:inline">{activeFitnessMeta.shortLabel}</span>
          </button>

          <button
            type="button"
            onClick={() => setIsPartnerModalOpen(true)}
            className="min-w-[36px] min-h-[36px] sm:px-3 rounded-full bg-[#12141C] hover:bg-white/10 border border-white/10 flex items-center justify-center gap-1.5 text-xs font-medium text-zinc-200 transition-colors shrink-0"
            title="Partner Invite Code & Profile Settings"
          >
            <Users className="w-3.5 h-3.5 text-rose-400" />
            <span className="hidden md:inline font-mono tabular-nums">
              {workspace.pairingCode}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setIsVercelGuideOpen(true)}
            className="min-w-[36px] min-h-[36px] rounded-full bg-[#12141C] hover:bg-white/10 border border-white/10 flex items-center justify-center text-zinc-300 hover:text-white transition-colors shrink-0"
            title="Vercel Hosting & Setup Guide"
            aria-label="Vercel Hosting Guide"
          >
            <Cloud className="w-3.5 h-3.5 text-sky-400" />
          </button>

          <button
            type="button"
            onClick={() => signOut(auth)}
            className="min-w-[36px] min-h-[36px] rounded-full bg-[#12141C] hover:bg-white/10 border border-white/10 flex items-center justify-center text-zinc-400 hover:text-white transition-colors shrink-0"
            title="Sign Out"
            aria-label="Sign Out"
          >
            <LogOut className="w-3.5 h-3.5" />
          </button>
        </div>
      </header>

      {/* Main Content Container with Seamless Screen Transitions */}
      <main className="max-w-6xl w-full mx-auto flex-1 px-3.5 sm:px-6 pt-4 sm:pt-5">
        <AnimatePresence mode="wait">
          {activeSection === 'health' ? (
            <motion.div
              key={`health-${activeSlot}`}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.16, ease: [0.16, 1, 0.3, 1] }}
            >
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
                onOpenFitnessSync={() => setIsFitnessSyncOpen(true)}
              />
            </motion.div>
          ) : (
            <motion.div
              key="skin-inventory"
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.16, ease: [0.16, 1, 0.3, 1] }}
            >
              <SkinDashboard
                profile={activeProfile}
                partnerProfile={otherProfile}
                currency={workspace.currency || '₹'}
                products={orderedProductsList}
                skincareCategories={workspace.skincareCategories || DEFAULT_SKINCARE_CATEGORIES}
                haircareCategories={workspace.haircareCategories || DEFAULT_HAIRCARE_CATEGORIES}
                bodycareCategories={workspace.bodycareCategories || DEFAULT_BODYCARE_CATEGORIES}
                onSaveProduct={handleSaveProduct}
                onDeleteProduct={handleDeleteProduct}
                onAddSubCategory={handleAddSubCategory}
                onRemoveSubCategory={handleRemoveSubCategory}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* Mobile-First Thumb-Zone Bottom Dock (Visible on Mobile Viewports) */}
      <div className="sm:hidden fixed bottom-0 inset-x-0 z-30 bg-[#090A0F]/95 backdrop-blur-lg border-t border-white/10 px-3 py-2 flex items-center justify-between gap-2">
        <button
          type="button"
          onClick={() => setActiveSection('health')}
          className={`flex-1 min-h-[44px] rounded-2xl text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors ${
            activeSection === 'health'
              ? 'bg-white text-zinc-950'
              : 'bg-[#12141C] text-zinc-400 border border-white/8'
          }`}
        >
          <Activity className="w-3.5 h-3.5" />
          <span>Health</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveSection('skin')}
          className={`flex-1 min-h-[44px] rounded-2xl text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors ${
            activeSection === 'skin'
              ? 'bg-white text-zinc-950'
              : 'bg-[#12141C] text-zinc-400 border border-white/8'
          }`}
        >
          <Sparkles className="w-3.5 h-3.5" />
          <span>Skin</span>
        </button>

        <button
          type="button"
          onClick={() => setIsFitnessSyncOpen(true)}
          className="flex-1 min-h-[44px] rounded-2xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-xs font-semibold flex items-center justify-center gap-1.5"
        >
          <Watch className="w-3.5 h-3.5 text-emerald-400" />
          <span className="truncate">{activeFitnessMeta.shortLabel}</span>
        </button>
      </div>

      {/* Fitness App Selection & Google Fit Sync Modal */}
      <FitnessSyncModal
        isOpen={isFitnessSyncOpen}
        onClose={() => setIsFitnessSyncOpen(false)}
        profile={activeProfile}
        selectedDate={selectedDate}
        currentLog={activeProfileLogsByDate[selectedDate]}
        onSelectFitnessApp={handleSelectFitnessApp}
        onApplySyncedMetrics={handleSaveHealthLog}
      />

      {/* Partner Sync & Profile Customization Modal */}
      <PartnerModal
        isOpen={isPartnerModalOpen}
        onClose={() => setIsPartnerModalOpen(false)}
        userDoc={userDoc}
        workspace={workspace}
        onJoinByCode={handleJoinByCode}
        onUnlinkPartner={handleUnlinkPartner}
        onOpenOnboardingWizard={() => setManualWizardOpen(true)}
        onUpdateWorkspaceIdentities={handleUpdateWorkspaceIdentities}
      />

      {/* Vercel Hosting & Firebase Domain Setup Guide Modal */}
      <VercelGuideModal
        isOpen={isVercelGuideOpen}
        onClose={() => setIsVercelGuideOpen(false)}
      />
    </div>
  );
}
