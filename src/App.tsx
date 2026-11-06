import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  onAuthStateChanged,
  signInWithPopup,
  signOut,
  User as FirebaseUser,
} from 'firebase/auth';
import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  onSnapshot,
  serverTimestamp,
  setDoc,
  Timestamp,
  updateDoc,
  writeBatch,
} from 'firebase/firestore';
import { AnimatePresence, motion } from 'motion/react';
import {
  Activity,
  AlertCircle,
  Droplet,
  HeartHandshake,
  LogOut,
  RotateCcw,
  Shirt,
  Sparkles,
  Users,
  Wind,
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
  getLastNDates,
  HealthLogDoc,
  OutfitDoc,
  PairingCodeDoc,
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
import { PartnerModal } from './components/PartnerModal';
import { OnboardingSubmission, OnboardingWizard } from './components/OnboardingWizard';
import { AuthCard } from './components/AuthCard';
import { isSupabaseConfigured, supabase } from './supabase';

function generateSixDigitCode(): string {
  return String(Math.floor(100000 + Math.random() * 900000));
}

function getValidFitnessApp(_val?: unknown): FitnessAppId {
  return 'manual';
}

export default function App() {
  const todayDate = useMemo(() => formatLocalDate(new Date()), []);

  const [authUser, setAuthUser] = useState<FirebaseUser | null>(null);
  const [authReady, setAuthReady] = useState(false);
  const [signingIn, setSigningIn] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);

  // Interactive toggle for the Onboarding / Login Hero preview card
  const [heroPreviewTab, setHeroPreviewTab] = useState<TopNavSection>('health');

  const [userDoc, setUserDoc] = useState<UserDoc | null>(null);
  const [workspace, setWorkspace] = useState<WorkspaceDoc | null>(null);
  const [manualWizardOpen, setManualWizardOpen] = useState(false);

  const [syncError, setSyncError] = useState<string | null>(null);
  const [syncTakingTooLong, setSyncTakingTooLong] = useState(false);

  const isBootstrappingRef = useRef(false);

  // Navigation & Active Profile Slot
  const [activeSection, setActiveSection] = useState<TopNavSection>('health');
  const [activeSlot, setActiveSlot] = useState<ProfileSlot>('partner1');
  const [hasInitializedSlot, setHasInitializedSlot] = useState(false);

  // Modals
  const [isPartnerModalOpen, setIsPartnerModalOpen] = useState(false);

  // Date state for Health Dashboard
  const [selectedDate, setSelectedDate] = useState<string>(todayDate);

  // Real-time maps of HealthLogs, CareProducts, RoutineCompletions, WardrobeItems and Outfits
  const [healthLogsMap, setHealthLogsMap] = useState<Record<string, HealthLogDoc>>({});
  const [careProductsMap, setCareProductsMap] = useState<Record<string, CareProductDoc>>({});
  const [routineCompletionsMap, setRoutineCompletionsMap] = useState<Record<string, RoutineCompletionDoc>>({});
  const [wardrobeItemsMap, setWardrobeItemsMap] = useState<Record<string, WardrobeItemDoc>>({});
  const [outfitsMap, setOutfitsMap] = useState<Record<string, OutfitDoc>>({});

  // Monitor slow sync to offer instant recovery controls
  useEffect(() => {
    if (authUser && (!userDoc || !workspace)) {
      const timer = setTimeout(() => {
        setSyncTakingTooLong(true);
      }, 4000);
      return () => clearTimeout(timer);
    } else {
      setSyncTakingTooLong(false);
      setSyncError(null);
    }
  }, [authUser, userDoc, workspace]);

  // Resilient Workspace & User Initializer / Self-Healer
  const bootstrapWorkspaceAndUser = async (uid: string, profileName: string) => {
    if (isBootstrappingRef.current) return;
    isBootstrappingRef.current = true;
    setSyncError(null);

    const userRef = doc(db, 'users', uid);

    try {
      // Guard against race conditions: verify document truly does not exist
      const existingSnap = await getDoc(userRef);
      if (existingSnap.exists()) {
        setUserDoc(existingSnap.data() as UserDoc);
        isBootstrappingRef.current = false;
        return;
      }

      const cleanUid = uid.replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 24) || 'user';
      const workspaceId = `ws_${cleanUid}_${Date.now()}`;
      const code = generateSixDigitCode();

      const cleanName = sanitizeString(
        profileName || authUser?.displayName || authUser?.email?.split('@')[0] || 'My Profile',
        VALIDATION_BOUNDS.MAX_DISPLAY_NAME,
        'My Profile'
      );

      const batch = writeBatch(db);

      batch.set(doc(db, 'workspaces', workspaceId), {
        id: workspaceId,
        ownerUid: uid,
        partnerUid: '',
        pairingCode: code,
        onboardingCompleted: false,
        currency: '₹',
        partner1Name: cleanName,
        partner1Role: `${cleanName}’s Dashboard`,
        partner1WeightUnit: 'kg',
        partner1TargetWeight: 62,
        partner1StartWeight: 65,
        partner1StepsGoal: 8500,
        partner1SleepGoalMinutes: 480,
        partner1WaterGoalMl: 2500,
        partner1FitnessApp: 'manual',
        partner2Name: 'Partner',
        partner2Role: 'Partner’s Dashboard',
        partner2WeightUnit: 'kg',
        partner2TargetWeight: 55,
        partner2StartWeight: 58,
        partner2StepsGoal: 8500,
        partner2SleepGoalMinutes: 480,
        partner2WaterGoalMl: 2500,
        partner2FitnessApp: 'manual',
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
        ownerUid: uid,
        ownerName: cleanName,
        createdAt: serverTimestamp(),
      });

      batch.set(userRef, {
        uid,
        displayName: cleanName,
        workspaceId,
        defaultSlot: 'partner1',
        onboardingCompleted: false,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });

      await batch.commit();
      console.log('Successfully bootstrapped workspace & user doc!');
    } catch (error: unknown) {
      console.error('Bootstrap failed:', error);
      const msg = error instanceof Error ? error.message : String(error);
      setSyncError(`Failed to initialize profile in Firestore: ${msg}`);
    } finally {
      isBootstrappingRef.current = false;
    }
  };

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
        setRoutineCompletionsMap({});
        setWardrobeItemsMap({});
        setOutfitsMap({});
        setHasInitializedSlot(false);
        setSyncError(null);
      }
    });
    return () => unsub();
  }, []);

  // 2. Listen to /users/{uid} and bootstrap initial workspace if first login
  useEffect(() => {
    if (!authReady || !authUser) return;

    const userRef = doc(db, 'users', authUser.uid);

    const unsub = onSnapshot(
      userRef,
      (snap) => {
        if (snap.exists()) {
          const data = snap.data() as UserDoc;
          setUserDoc(data);
          setSyncError(null);
          if (!hasInitializedSlot) {
            setActiveSlot(data.defaultSlot || 'partner1');
            setHasInitializedSlot(true);
          }
        } else {
          // User document doesn't exist yet, bootstrap fresh
          bootstrapWorkspaceAndUser(authUser.uid, authUser.displayName || '');
        }
      },
      (error) => {
        console.error('Error listening to user document:', error);
        setSyncError(`User profile read error: ${error.message}. Please verify Firestore rules.`);
      }
    );

    return () => unsub();
  }, [authReady, authUser, hasInitializedSlot]);

  // 3. Listen to active /workspaces/{workspaceId} with self-healing
  useEffect(() => {
    if (!authReady || !authUser || !userDoc?.workspaceId) return;

    const wsRef = doc(db, 'workspaces', userDoc.workspaceId);

    const unsub = onSnapshot(
      wsRef,
      (snap) => {
        if (snap.exists()) {
          setWorkspace(snap.data() as WorkspaceDoc);
          setSyncError(null);
        } else {
          // Workspace document is missing or was deleted! Auto self-heal!
          console.warn(`Workspace ${userDoc.workspaceId} was not found. Self-healing fresh workspace...`);
          bootstrapWorkspaceAndUser(authUser.uid, userDoc.displayName || '');
        }
      },
      (error) => {
        console.error('Error listening to workspace document:', error);
        setSyncError(`Workspace read error: ${error.message}. Please verify Firestore rules.`);
      }
    );

    return () => unsub();
  }, [authReady, authUser, userDoc?.workspaceId]);

  // 4. Listen to HealthLog collection in real-time
  useEffect(() => {
    if (!authReady || !authUser || !workspace?.id) return;
    const collPath = `workspaces/${workspace.id}/healthLogs`;
    const collRef = collection(db, 'workspaces', workspace.id, 'healthLogs');

    const unsub = onSnapshot(
      collRef,
      (snapshot) => {
        const nextLogs: Record<string, HealthLogDoc> = {};
        snapshot.docs.forEach((docSnap) => {
          nextLogs[docSnap.id] = docSnap.data() as HealthLogDoc;
        });
        setHealthLogsMap(nextLogs);
      },
      (error) => {
        handleFirestoreError(error, OperationType.LIST, collPath);
      }
    );

    return () => unsub();
  }, [authReady, authUser, workspace?.id]);

  // 5. Listen to CareProduct collection in real-time
  useEffect(() => {
    if (!authReady || !authUser || !workspace?.id) return;
    const collPath = `workspaces/${workspace.id}/careProducts`;
    const collRef = collection(db, 'workspaces', workspace.id, 'careProducts');

    const unsub = onSnapshot(
      collRef,
      (snapshot) => {
        const nextProds: Record<string, CareProductDoc> = {};
        snapshot.docs.forEach((docSnap) => {
          nextProds[docSnap.id] = docSnap.data() as CareProductDoc;
        });
        setCareProductsMap(nextProds);
      },
      (error) => {
        handleFirestoreError(error, OperationType.LIST, collPath);
      }
    );

    return () => unsub();
  }, [authReady, authUser, workspace?.id]);

  // 6. Listen to RoutineCompletions collection in real-time
  useEffect(() => {
    if (!authReady || !authUser || !workspace?.id) return;
    const collPath = `workspaces/${workspace.id}/routineCompletions`;
    const collRef = collection(db, 'workspaces', workspace.id, 'routineCompletions');

    const unsub = onSnapshot(
      collRef,
      (snapshot) => {
        const nextCompletions: Record<string, RoutineCompletionDoc> = {};
        snapshot.docs.forEach((docSnap) => {
          nextCompletions[docSnap.id] = docSnap.data() as RoutineCompletionDoc;
        });
        setRoutineCompletionsMap(nextCompletions);
      },
      (error) => {
        handleFirestoreError(error, OperationType.LIST, collPath);
      }
    );

    return () => unsub();
  }, [authReady, authUser, workspace?.id]);

  // 7. Listen to WardrobeItems collection in real-time
  useEffect(() => {
    if (!authReady || !authUser || !workspace?.id) return;
    const collPath = `workspaces/${workspace.id}/wardrobeItems`;
    const collRef = collection(db, 'workspaces', workspace.id, 'wardrobeItems');

    const unsub = onSnapshot(
      collRef,
      (snapshot) => {
        const nextItems: Record<string, WardrobeItemDoc> = {};
        snapshot.docs.forEach((docSnap) => {
          nextItems[docSnap.id] = docSnap.data() as WardrobeItemDoc;
        });
        setWardrobeItemsMap(nextItems);
      },
      (error) => {
        handleFirestoreError(error, OperationType.LIST, collPath);
      }
    );

    return () => unsub();
  }, [authReady, authUser, workspace?.id]);

  // 8. Listen to Outfits collection in real-time
  useEffect(() => {
    if (!authReady || !authUser || !workspace?.id) return;
    const collPath = `workspaces/${workspace.id}/outfits`;
    const collRef = collection(db, 'workspaces', workspace.id, 'outfits');

    const unsub = onSnapshot(
      collRef,
      (snapshot) => {
        const nextOutfits: Record<string, OutfitDoc> = {};
        snapshot.docs.forEach((docSnap) => {
          nextOutfits[docSnap.id] = docSnap.data() as OutfitDoc;
        });
        setOutfitsMap(nextOutfits);
      },
      (error) => {
        handleFirestoreError(error, OperationType.LIST, collPath);
      }
    );

    return () => unsub();
  }, [authReady, authUser, workspace?.id]);

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
    const list = Object.values(careProductsMap);
    if (!workspace?.productIds || workspace.productIds.length === 0) return list;
    const ordered = workspace.productIds
      .map((id) => careProductsMap[id])
      .filter((p): p is CareProductDoc => Boolean(p));
    const orderedIdSet = new Set(ordered.map((p) => p.id));
    const unindexed = list.filter((p) => !orderedIdSet.has(p.id));
    return [...ordered, ...unindexed];
  }, [workspace?.productIds, careProductsMap]);

  // Helper to ensure partner1FitnessApp & partner2FitnessApp are always included in workspace updates
  const getFitnessAppFields = (
    ws: WorkspaceDoc,
    overrides?: Partial<Record<'partner1FitnessApp' | 'partner2FitnessApp', FitnessAppId>>
  ) => ({
    partner1FitnessApp: overrides?.partner1FitnessApp || getValidFitnessApp(ws.partner1FitnessApp),
    partner2FitnessApp: overrides?.partner2FitnessApp || getValidFitnessApp(ws.partner2FitnessApp),
  });

  // Permanently delete all current data for user & workspace
  const handleDeleteAllUserData = async () => {
    if (!authUser) return;
    const wsId = userDoc?.workspaceId || workspace?.id;

    try {
      if (wsId) {
        const batch = writeBatch(db);

        // Delete healthLogs
        Object.keys(healthLogsMap).forEach((id) => {
          batch.delete(doc(db, 'workspaces', wsId, 'healthLogs', id));
        });
        // Delete careProducts
        Object.keys(careProductsMap).forEach((id) => {
          batch.delete(doc(db, 'workspaces', wsId, 'careProducts', id));
        });
        // Delete routineCompletions
        Object.keys(routineCompletionsMap).forEach((id) => {
          batch.delete(doc(db, 'workspaces', wsId, 'routineCompletions', id));
        });
        // Delete wardrobeItems
        Object.keys(wardrobeItemsMap).forEach((id) => {
          batch.delete(doc(db, 'workspaces', wsId, 'wardrobeItems', id));
        });
        // Delete outfits
        Object.keys(outfitsMap).forEach((id) => {
          batch.delete(doc(db, 'workspaces', wsId, 'outfits', id));
        });

        await batch.commit();

        // Delete pairing code doc if owner
        if (workspace?.pairingCode && workspace.ownerUid === authUser.uid) {
          try {
            await deleteDoc(doc(db, 'pairingCodes', workspace.pairingCode));
          } catch (e) {
            console.warn('Pairing code delete error:', e);
          }
        }

        // Delete workspace doc
        try {
          await deleteDoc(doc(db, 'workspaces', wsId));
        } catch (e) {
          console.warn('Workspace delete error:', e);
        }
      }

      // Delete user doc
      try {
        await deleteDoc(doc(db, 'users', authUser.uid));
      } catch (e) {
        console.warn('User doc delete error:', e);
      }

      await signOut(auth);
      window.location.reload();
    } catch (err) {
      console.error('Failed to wipe data:', err);
      throw err;
    }
  };

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
          partner2StartWeight: clampNumber(
            submission.currentWeight,
            0,
            VALIDATION_BOUNDS.MAX_WEIGHT,
            60
          ),
          partner2TargetWeight: clampNumber(
            submission.targetWeight,
            0,
            VALIDATION_BOUNDS.MAX_WEIGHT,
            58
          ),
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

    // Optimistic local state update for instant UI feedback
    setHealthLogsMap((prev) => ({
      ...prev,
      [logId]: {
        ...(existing || {}),
        ...payload,
        id: logId,
        workspaceId: workspace.id,
        profileSlot: activeSlot,
        date,
      } as HealthLogDoc,
    }));

    // If Supabase is active, sync in background
    if (isSupabaseConfigured) {
      supabase.from('health_logs').upsert(
        {
          id: `${workspace.id}_${activeSlot}_${date}`,
          workspace_id: workspace.id,
          profile_slot: activeSlot,
          date,
          weight: payload.weight,
          steps: payload.steps,
          sleep_minutes: payload.sleepMinutes,
          water_ml: payload.waterMl,
          note: payload.note,
          updated_by_uid: authUser.uid,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'id' }
      ).then();
    }

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
      console.warn('Background sync warning:', error);
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
      scheduleType: productInput.scheduleType || 'daily',
      scheduledDays: productInput.scheduledDays || [],
      notes: sanitizeString(productInput.notes, VALIDATION_BOUNDS.MAX_NOTE),
      updatedByUid: authUser.uid,
      updatedAt: serverTimestamp(),
    };

    // Optimistic local state update
    setCareProductsMap((prev) => ({
      ...prev,
      [productId]: {
        ...(existingId && prev[existingId] ? prev[existingId] : {}),
        id: productId,
        workspaceId: workspace.id,
        ...sanitizedPayload,
      } as CareProductDoc,
    }));

    if (isSupabaseConfigured) {
      supabase
        .from('care_products')
        .upsert(
          {
            id: productId,
            workspace_id: workspace.id,
            profile_slot: sanitizedPayload.profileSlot,
            segment: sanitizedPayload.segment,
            sub_category: sanitizedPayload.subCategory,
            name: sanitizedPayload.name,
            brand: sanitizedPayload.brand,
            quantity: sanitizedPayload.quantity,
            ordered_date: sanitizedPayload.orderedDate,
            opened_date: sanitizedPayload.openedDate,
            expiry_date: sanitizedPayload.expiryDate,
            sale_info: sanitizedPayload.saleInfo,
            price_paid: sanitizedPayload.pricePaid,
            original_price: sanitizedPayload.originalPrice,
            status: sanitizedPayload.status,
            routine_time: sanitizedPayload.routineTime,
            schedule_type: sanitizedPayload.scheduleType,
            scheduled_days: sanitizedPayload.scheduledDays,
            notes: sanitizedPayload.notes,
            updated_by_uid: authUser.uid,
            updated_at: new Date().toISOString(),
          },
          { onConflict: 'id' }
        )
        .then();
    }

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
          productIds: [...workspace.productIds, productId],
          updatedAt: serverTimestamp(),
        });
        await batch.commit();
      }
    } catch (error) {
      console.warn('Care product sync notice:', error);
    }
  };

  const handleDeleteProduct = async (productId: string) => {
    if (!authUser || !workspace) return;
    const prodPath = `workspaces/${workspace.id}/careProducts/${productId}`;

    // Optimistic deletion
    setCareProductsMap((prev) => {
      const next = { ...prev };
      delete next[productId];
      return next;
    });

    if (isSupabaseConfigured) {
      supabase.from('care_products').delete().eq('id', productId).then();
    }

    try {
      const batch = writeBatch(db);
      batch.delete(doc(db, 'workspaces', workspace.id, 'careProducts', productId));
      batch.update(doc(db, 'workspaces', workspace.id), {
        productIds: workspace.productIds.filter((id) => id !== productId),
        updatedAt: serverTimestamp(),
      });
      await batch.commit();
    } catch (error) {
      console.warn('Care product delete notice:', error);
    }
  };

  // Toggle routine completion for deterministic date-based persistence in Firestore
  const handleToggleRoutineCompletion = async (
    productId: string,
    date: string,
    completed: boolean
  ) => {
    if (!authUser || !workspace) return;
    const completionId = `${activeSlot}_${productId}_${date}`;
    const docPath = `workspaces/${workspace.id}/routineCompletions/${completionId}`;
    const docRef = doc(db, 'workspaces', workspace.id, 'routineCompletions', completionId);

    // Optimistic toggle for instant checkmark feedback
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
          completedAt: Timestamp.now(),
          updatedByUid: authUser.uid,
        };
      } else {
        delete next[completionId];
      }
      return next;
    });

    // Background sync to Supabase if configured
    if (isSupabaseConfigured) {
      if (completed) {
        supabase
          .from('routine_completions')
          .upsert(
            {
              id: completionId,
              workspace_id: workspace.id,
              profile_slot: activeSlot,
              product_id: productId,
              date,
              completed: true,
              completed_at: new Date().toISOString(),
              updated_by_uid: authUser.uid,
            },
            { onConflict: 'id' }
          )
          .then();
      } else {
        supabase.from('routine_completions').delete().eq('id', completionId).then();
      }
    }

    try {
      if (completed) {
        await setDoc(docRef, {
          id: completionId,
          workspaceId: workspace.id,
          profileSlot: activeSlot,
          productId,
          date,
          completed: true,
          completedAt: serverTimestamp(),
          updatedByUid: authUser.uid,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
      } else {
        await deleteDoc(docRef);
      }
    } catch (error) {
      console.warn('Routine completion sync notice:', error);
    }
  };

  // Wardrobe Items CRUD
  const handleSaveWardrobeItem = async (
    itemInput: Omit<
      WardrobeItemDoc,
      'id' | 'workspaceId' | 'updatedByUid' | 'createdAt' | 'updatedAt'
    >,
    existingId?: string
  ) => {
    if (!authUser || !workspace) return;
    const itemId = existingId || `cloth_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
    const itemPath = `workspaces/${workspace.id}/wardrobeItems/${itemId}`;
    const itemRef = doc(db, 'workspaces', workspace.id, 'wardrobeItems', itemId);

    const payload = {
      profileSlot: itemInput.profileSlot,
      name: sanitizeString(itemInput.name, 100, 'Clothing Item'),
      category: itemInput.category,
      brand: sanitizeString(itemInput.brand, 80, ''),
      color: sanitizeString(itemInput.color, 40, ''),
      size: sanitizeString(itemInput.size, 20, ''),
      season: itemInput.season,
      occasion: itemInput.occasion,
      imageUrl: itemInput.imageUrl || '',
      notes: sanitizeString(itemInput.notes, 500, ''),
      updatedByUid: authUser.uid,
      updatedAt: serverTimestamp(),
    };

    // Optimistic local update
    setWardrobeItemsMap((prev) => ({
      ...prev,
      [itemId]: {
        ...(existingId && prev[existingId] ? prev[existingId] : {}),
        id: itemId,
        workspaceId: workspace.id,
        ...payload,
      } as WardrobeItemDoc,
    }));

    if (isSupabaseConfigured) {
      supabase
        .from('wardrobe_items')
        .upsert(
          {
            id: itemId,
            workspace_id: workspace.id,
            profile_slot: payload.profileSlot,
            name: payload.name,
            category: payload.category,
            brand: payload.brand,
            color: payload.color,
            size: payload.size,
            season: payload.season,
            occasion: payload.occasion,
            image_url: payload.imageUrl,
            notes: payload.notes,
            updated_by_uid: authUser.uid,
            updated_at: new Date().toISOString(),
          },
          { onConflict: 'id' }
        )
        .then();
    }

    try {
      if (existingId && wardrobeItemsMap[existingId]) {
        await updateDoc(itemRef, payload);
      } else {
        await setDoc(itemRef, {
          id: itemId,
          workspaceId: workspace.id,
          ...payload,
          createdAt: serverTimestamp(),
        });
      }
    } catch (error) {
      console.warn('Wardrobe item sync notice:', error);
    }
  };

  const handleDeleteWardrobeItem = async (itemId: string) => {
    if (!authUser || !workspace) return;
    const itemPath = `workspaces/${workspace.id}/wardrobeItems/${itemId}`;

    // Optimistic deletion
    setWardrobeItemsMap((prev) => {
      const next = { ...prev };
      delete next[itemId];
      return next;
    });

    if (isSupabaseConfigured) {
      supabase.from('wardrobe_items').delete().eq('id', itemId).then();
    }

    try {
      await deleteDoc(doc(db, 'workspaces', workspace.id, 'wardrobeItems', itemId));
    } catch (error) {
      console.warn('Wardrobe delete notice:', error);
    }
  };

  // Outfits CRUD
  const handleSaveOutfit = async (
    outfitInput: Omit<
      OutfitDoc,
      'id' | 'workspaceId' | 'updatedByUid' | 'createdAt' | 'updatedAt'
    >,
    existingId?: string
  ) => {
    if (!authUser || !workspace) return;
    const outfitId = existingId || `fit_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
    const fitPath = `workspaces/${workspace.id}/outfits/${outfitId}`;
    const fitRef = doc(db, 'workspaces', workspace.id, 'outfits', outfitId);

    const payload = {
      profileSlot: outfitInput.profileSlot,
      name: sanitizeString(outfitInput.name, 100, 'My Outfit'),
      occasion: outfitInput.occasion,
      itemIds: outfitInput.itemIds.slice(0, 30),
      notes: sanitizeString(outfitInput.notes, 500, ''),
      updatedByUid: authUser.uid,
      updatedAt: serverTimestamp(),
    };

    // Optimistic local update
    setOutfitsMap((prev) => ({
      ...prev,
      [outfitId]: {
        ...(existingId && prev[existingId] ? prev[existingId] : {}),
        id: outfitId,
        workspaceId: workspace.id,
        ...payload,
      } as OutfitDoc,
    }));

    if (isSupabaseConfigured) {
      supabase
        .from('outfits')
        .upsert(
          {
            id: outfitId,
            workspace_id: workspace.id,
            profile_slot: payload.profileSlot,
            name: payload.name,
            occasion: payload.occasion,
            item_ids: payload.itemIds,
            notes: payload.notes,
            updated_by_uid: authUser.uid,
            updated_at: new Date().toISOString(),
          },
          { onConflict: 'id' }
        )
        .then();
    }

    try {
      if (existingId && outfitsMap[existingId]) {
        await updateDoc(fitRef, payload);
      } else {
        await setDoc(fitRef, {
          id: outfitId,
          workspaceId: workspace.id,
          ...payload,
          createdAt: serverTimestamp(),
        });
      }
    } catch (error) {
      console.warn('Outfit sync notice:', error);
    }
  };

  const handleDeleteOutfit = async (outfitId: string) => {
    if (!authUser || !workspace) return;
    const fitPath = `workspaces/${workspace.id}/outfits/${outfitId}`;

    // Optimistic deletion
    setOutfitsMap((prev) => {
      const next = { ...prev };
      delete next[outfitId];
      return next;
    });

    if (isSupabaseConfigured) {
      supabase.from('outfits').delete().eq('id', outfitId).then();
    }

    try {
      await deleteDoc(doc(db, 'workspaces', workspace.id, 'outfits', outfitId));
    } catch (error) {
      console.warn('Outfit delete notice:', error);
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
          <div className="text-xs text-zinc-400 flex items-center gap-1.5 font-medium">
            <Sparkles className="w-3.5 h-3.5 text-rose-400" />
            <span>Always in Sync</span>
          </div>
        </header>

        <main className="max-w-5xl w-full mx-auto my-auto py-6 sm:py-10 grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-10 items-center">
          <div className="lg:col-span-6 space-y-6">
            <div className="space-y-3">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-rose-500/10 border border-rose-500/20 text-xs font-semibold text-rose-400">
                <HeartHandshake className="w-3.5 h-3.5" />
                <span>Designed for Two · Always Connected</span>
              </div>
              <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight text-white leading-[1.1] text-balance">
                Your daily health rings, care routines & fits—synced together.
              </h1>
              <p className="text-xs sm:text-sm text-zinc-400 leading-relaxed">
                Connect with your partner via a 6-digit code. Track daily steps, weight, hydration, custom weekly skincare/haircare schedules, and create stylish fits in your digital closet.
              </p>
            </div>

            {/* Interactive Mobile-First Preview Card with Working [ Health | Skin | Fits ] Toggle */}
            <div className="rounded-3xl bg-[#12141C] border border-white/10 p-5 space-y-4">
              <div className="flex items-center justify-between border-b border-white/8 pb-3.5 gap-2">
                <div>
                  <div className="text-xs text-emerald-400 font-medium">
                    {heroPreviewTab === 'health'
                      ? 'Fitness & Vitals Rings'
                      : heroPreviewTab === 'skin'
                      ? '3-Segment Care Shelf'
                      : 'Digital Wardrobe & Fits'}
                  </div>
                  <div className="text-sm font-bold text-white">
                    {heroPreviewTab === 'health'
                      ? 'Steps · Weight · Sleep · Water'
                      : heroPreviewTab === 'skin'
                      ? 'Skincare · Haircare · Bodycare'
                      : 'Closet Items · Outfit Studio'}
                  </div>
                </div>

                {/* Working Interactive Pilled Toggle */}
                <div
                  role="tablist"
                  aria-label="Preview Dashboard Section"
                  className="flex items-center p-1 rounded-full bg-zinc-900 border border-white/10 text-xs font-medium shrink-0"
                >
                  <button
                    type="button"
                    role="tab"
                    aria-selected={heroPreviewTab === 'health'}
                    onClick={() => setHeroPreviewTab('health')}
                    className={`relative min-h-[30px] px-2.5 py-1 rounded-full text-xs font-semibold transition-colors flex items-center gap-1 ${
                      heroPreviewTab === 'health'
                        ? 'text-zinc-950'
                        : 'text-zinc-400 hover:text-white'
                    }`}
                  >
                    {heroPreviewTab === 'health' && (
                      <motion.span
                        layoutId="heroPreviewPill"
                        transition={{ duration: 0.16, ease: [0.16, 1, 0.3, 1] }}
                        className="absolute inset-0 rounded-full bg-white"
                      />
                    )}
                    <Activity className="w-3 h-3 relative z-10" />
                    <span className="relative z-10">Health</span>
                  </button>

                  <button
                    type="button"
                    role="tab"
                    aria-selected={heroPreviewTab === 'skin'}
                    onClick={() => setHeroPreviewTab('skin')}
                    className={`relative min-h-[30px] px-2.5 py-1 rounded-full text-xs font-semibold transition-colors flex items-center gap-1 ${
                      heroPreviewTab === 'skin'
                        ? 'text-zinc-950'
                        : 'text-zinc-400 hover:text-white'
                    }`}
                  >
                    {heroPreviewTab === 'skin' && (
                      <motion.span
                        layoutId="heroPreviewPill"
                        transition={{ duration: 0.16, ease: [0.16, 1, 0.3, 1] }}
                        className="absolute inset-0 rounded-full bg-white"
                      />
                    )}
                    <Sparkles className="w-3 h-3 relative z-10" />
                    <span className="relative z-10">Skin</span>
                  </button>

                  <button
                    type="button"
                    role="tab"
                    aria-selected={heroPreviewTab === 'wardrobe'}
                    onClick={() => setHeroPreviewTab('wardrobe')}
                    className={`relative min-h-[30px] px-2.5 py-1 rounded-full text-xs font-semibold transition-colors flex items-center gap-1 ${
                      heroPreviewTab === 'wardrobe'
                        ? 'text-zinc-950'
                        : 'text-zinc-400 hover:text-white'
                    }`}
                  >
                    {heroPreviewTab === 'wardrobe' && (
                      <motion.span
                        layoutId="heroPreviewPill"
                        transition={{ duration: 0.16, ease: [0.16, 1, 0.3, 1] }}
                        className="absolute inset-0 rounded-full bg-white"
                      />
                    )}
                    <Shirt className="w-3 h-3 relative z-10" />
                    <span className="relative z-10">Fits</span>
                  </button>
                </div>
              </div>

            <AnimatePresence mode="wait">
              {heroPreviewTab === 'health' ? (
                <motion.div
                  key="hero-health-preview"
                  initial={{ opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -4 }}
                  transition={{ duration: 0.15 }}
                  className="space-y-3"
                >
                  <div className="grid grid-cols-2 gap-2.5">
                    <div className="rounded-2xl bg-zinc-900/90 border border-white/6 p-3 space-y-1">
                      <div className="text-xs text-rose-400 font-medium">Daily Weight</div>
                      <div className="text-base font-mono font-bold text-white tabular-nums">
                        Start → Goal
                      </div>
                      <div className="text-[11px] text-zinc-400">Circular ring + 7d curve</div>
                    </div>
                    <div className="rounded-2xl bg-zinc-900/90 border border-white/6 p-3 space-y-1">
                      <div className="text-xs text-emerald-400 font-medium">Daily Steps</div>
                      <div className="text-base font-mono font-bold text-white tabular-nums">
                        Step Ring
                      </div>
                      <div className="text-[11px] text-zinc-400">Target progress & streaks</div>
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
                    <div className="text-xs text-emerald-400 font-medium">
                      Real-Time Partner Account Switcher
                    </div>
                    <p className="text-xs text-zinc-400 leading-relaxed">
                      Switch between your dashboard and your partner’s dashboard anytime to view or log daily vitals.
                    </p>
                  </div>
                </motion.div>
              ) : heroPreviewTab === 'skin' ? (
                <motion.div
                  key="hero-skin-preview"
                  initial={{ opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -4 }}
                  transition={{ duration: 0.15 }}
                  className="space-y-2.5"
                >
                  <div className="rounded-2xl bg-zinc-900/90 border border-white/6 p-3 flex items-center justify-between">
                    <div className="space-y-0.5">
                      <div className="text-xs font-semibold text-rose-400 flex items-center gap-1.5">
                        <Sparkles className="w-3.5 h-3.5" />
                        <span>1. Skincare Essentials</span>
                      </div>
                      <div className="text-[11px] text-zinc-400">
                        Cleanser · Serum · Moisturizer · Sunscreen
                      </div>
                    </div>
                    <span className="text-xs font-mono font-semibold text-white">Qty 2+</span>
                  </div>

                  <div className="rounded-2xl bg-zinc-900/90 border border-white/6 p-3 flex items-center justify-between">
                    <div className="space-y-0.5">
                      <div className="text-xs font-semibold text-amber-400 flex items-center gap-1.5">
                        <Wind className="w-3.5 h-3.5" />
                        <span>2. Haircare Essentials</span>
                      </div>
                      <div className="text-[11px] text-zinc-400">
                        Shampoo · Conditioner · Mask · Scalp Oil
                      </div>
                    </div>
                    <span className="text-xs font-mono font-semibold text-emerald-400">Sale %</span>
                  </div>

                  <div className="rounded-2xl bg-zinc-900/90 border border-white/6 p-3 flex items-center justify-between">
                    <div className="space-y-0.5">
                      <div className="text-xs font-semibold text-sky-400 flex items-center gap-1.5">
                        <Droplet className="w-3.5 h-3.5" />
                        <span>3. Bodycare Essentials</span>
                      </div>
                      <div className="text-[11px] text-zinc-400">
                        Body Wash · Lotion · Scrub · Deodorant
                      </div>
                    </div>
                    <span className="text-xs font-mono font-semibold text-zinc-300">Dates</span>
                  </div>

                  <div className="rounded-2xl bg-zinc-900/90 border border-white/6 p-3 space-y-1">
                    <div className="text-xs text-amber-400 font-medium">
                      Custom Weekly Routine Checklist
                    </div>
                    <p className="text-[11px] text-zinc-400 leading-relaxed">
                      Schedule products for specific days of the week (e.g. Shampoo on Sun/Wed/Fri) with date-based check-off tracking.
                    </p>
                  </div>
                </motion.div>
              ) : (
                <motion.div
                  key="hero-wardrobe-preview"
                  initial={{ opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -4 }}
                  transition={{ duration: 0.15 }}
                  className="space-y-2.5"
                >
                  <div className="grid grid-cols-2 gap-2.5">
                    <div className="rounded-2xl bg-zinc-900/90 border border-white/6 p-3 space-y-1">
                      <div className="text-xs text-rose-400 font-medium">Digital Closet</div>
                      <div className="text-base font-bold text-white">Visual Pieces</div>
                      <div className="text-[11px] text-zinc-400">Tops, bottoms, shoes & accessories</div>
                    </div>
                    <div className="rounded-2xl bg-zinc-900/90 border border-white/6 p-3 space-y-1">
                      <div className="text-xs text-amber-400 font-medium">Outfit Studio</div>
                      <div className="text-base font-bold text-white">Create Your Fits</div>
                      <div className="text-[11px] text-zinc-400">Combine pieces for date night & work</div>
                    </div>
                  </div>

                  <div className="rounded-2xl bg-zinc-900/90 border border-white/6 p-3.5 space-y-1">
                    <div className="text-xs text-emerald-400 font-medium">
                      Shared Partner Wardrobe
                    </div>
                    <p className="text-xs text-zinc-400 leading-relaxed">
                      Toggle between your items, your partner’s items, or shared apparel with custom tags and photos.
                    </p>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* AuthCard Column */}
        <div className="lg:col-span-6 w-full flex justify-center">
          <AuthCard />
        </div>
      </main>

        <footer className="max-w-5xl w-full mx-auto text-xs text-zinc-500 flex items-center justify-between">
          <span>DuoPulse — Mobile-First Health & Care Tracker</span>
          <span>Real-Time Cloud Sync</span>
        </footer>
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
      <div className="min-h-screen bg-[#090A0F] text-zinc-100 flex items-center justify-center p-4 sm:p-6">
        <div className="w-full max-w-md rounded-3xl bg-[#12141C] border border-white/10 p-6 sm:p-8 text-center space-y-5 shadow-2xl">
          <div className="w-12 h-12 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center mx-auto">
            {syncTakingTooLong || syncError ? (
              <AlertCircle className="w-6 h-6 text-amber-400" />
            ) : (
              <Sparkles className="w-6 h-6 text-rose-400 animate-pulse" />
            )}
          </div>

          <div className="space-y-1.5">
            <h3 className="text-base font-bold text-white">
              {syncError
                ? 'Unable to Connect'
                : syncTakingTooLong
                ? 'Almost Ready...'
                : 'Loading Your Dashboard...'}
            </h3>
            <p className="text-xs text-zinc-400 leading-relaxed">
              {syncError
                ? 'Could not connect to your shared space. Please check your network connection or try refreshing.'
                : syncTakingTooLong
                ? 'Connecting with your shared dashboard. Thank you for your patience.'
                : 'Getting your latest vitals and routines ready.'}
            </p>
          </div>

          {/* Diagnostic status */}
          <div className="p-3 rounded-xl bg-[#090A0F] border border-white/8 text-left text-xs space-y-1.5 text-zinc-400 font-mono">
            <div className="flex justify-between">
              <span>Account:</span>
              <span className="text-emerald-400 truncate max-w-[200px]">
                {authUser.email || authUser.uid.slice(0, 10)}
              </span>
            </div>
            <div className="flex justify-between">
              <span>Profile Doc:</span>
              <span className={userDoc ? 'text-emerald-400' : 'text-amber-400'}>
                {userDoc ? 'Ready' : 'Waiting...'}
              </span>
            </div>
            <div className="flex justify-between">
              <span>Workspace:</span>
              <span className={workspace ? 'text-emerald-400' : 'text-amber-400'}>
                {workspace
                  ? 'Ready'
                  : userDoc?.workspaceId
                  ? `Loading (${userDoc.workspaceId.slice(0, 10)}...)`
                  : 'Bootstrapping...'}
              </span>
            </div>
          </div>

          {/* Action buttons if taking too long or error */}
          {(syncTakingTooLong || syncError) && (
            <div className="pt-2 space-y-2">
              <button
                type="button"
                onClick={() => {
                  setSyncError(null);
                  bootstrapWorkspaceAndUser(authUser.uid, authUser.displayName || '');
                }}
                className="w-full min-h-[44px] rounded-xl bg-white text-zinc-950 hover:bg-zinc-200 text-xs font-semibold flex items-center justify-center gap-2 transition-colors"
              >
                <RotateCcw className="w-4 h-4" />
                <span>Initialize / Repair Workspace</span>
              </button>

              <button
                type="button"
                onClick={() => signOut(auth)}
                className="w-full min-h-[40px] rounded-xl bg-[#090A0F] hover:bg-white/5 border border-white/10 text-xs font-medium text-zinc-400 hover:text-white flex items-center justify-center gap-1.5 transition-colors"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>Sign Out</span>
              </button>
            </div>
          )}
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

        {/* Zone 2: Top Pilled Navbar [ Health | Skin | Fits ] - Hidden on mobile phones */}
        <nav
          aria-label="Primary View Switcher"
          className="hidden sm:flex items-center p-1 rounded-full bg-[#12141C] border border-white/10"
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

          <button
            type="button"
            onClick={() => setActiveSection('wardrobe')}
            className={`relative min-h-[34px] sm:min-h-[36px] px-3.5 sm:px-5 py-1 rounded-full text-xs font-semibold transition-colors whitespace-nowrap shrink-0 flex items-center gap-1.5 ${
              activeSection === 'wardrobe' ? 'text-zinc-950' : 'text-zinc-400 hover:text-white'
            }`}
          >
            {activeSection === 'wardrobe' && (
              <motion.span
                layoutId="topNavPill"
                transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
                className="absolute inset-0 rounded-full bg-white"
              />
            )}
            <Shirt className="w-3.5 h-3.5 relative z-10" />
            <span className="relative z-10">Fits</span>
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
            onClick={() => signOut(auth)}
            className="min-w-[36px] min-h-[36px] rounded-full bg-[#12141C] hover:bg-white/10 border border-white/10 flex items-center justify-center text-zinc-400 hover:text-white transition-colors shrink-0"
            title="Sign Out"
            aria-label="Sign Out"
          >
            <LogOut className="w-3.5 h-3.5" />
          </button>
        </div>
      </header>

      {/* Main Content Container with safe mobile bottom spacing */}
      <main className="max-w-6xl w-full mx-auto flex-1 px-3.5 sm:px-6 pt-3 sm:pt-5 pb-28 sm:pb-10">
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
              />
            </motion.div>
          ) : activeSection === 'skin' ? (
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
                todayDate={todayDate}
                routineCompletionsMap={routineCompletionsMap}
                onToggleRoutineCompletion={handleToggleRoutineCompletion}
                onSaveProduct={handleSaveProduct}
                onDeleteProduct={handleDeleteProduct}
                onAddSubCategory={handleAddSubCategory}
                onRemoveSubCategory={handleRemoveSubCategory}
              />
            </motion.div>
          ) : (
            <motion.div
              key="wardrobe-studio"
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.16, ease: [0.16, 1, 0.3, 1] }}
            >
              <WardrobeDashboard
                profile={activeProfile}
                partnerProfile={otherProfile}
                items={Object.values(wardrobeItemsMap)}
                outfits={Object.values(outfitsMap)}
                onSaveItem={handleSaveWardrobeItem}
                onDeleteItem={handleDeleteWardrobeItem}
                onSaveOutfit={handleSaveOutfit}
                onDeleteOutfit={handleDeleteOutfit}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* Mobile-Only Floating Bottom Navbar Pill [ Health | Skin | Fits ] */}
      <div className="sm:hidden fixed bottom-4 inset-x-0 mx-auto w-[92%] max-w-sm z-40 pb-[max(0.25rem,env(safe-area-inset-bottom))]">
        <div className="bg-[#12141C]/92 backdrop-blur-xl border border-white/12 shadow-2xl shadow-black/80 rounded-full p-1.5 flex items-center justify-between gap-1">
          <button
            type="button"
            onClick={() => setActiveSection('health')}
            className={`relative flex-1 min-h-[46px] rounded-full text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors ${
              activeSection === 'health' ? 'text-zinc-950 font-bold' : 'text-zinc-400 hover:text-white'
            }`}
          >
            {activeSection === 'health' && (
              <motion.span
                layoutId="mobileNavPill"
                transition={{ type: 'spring', damping: 25, stiffness: 350 }}
                className="absolute inset-0 rounded-full bg-white shadow-md"
              />
            )}
            <Activity className="w-4 h-4 relative z-10" />
            <span className="relative z-10 text-xs">Health</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveSection('skin')}
            className={`relative flex-1 min-h-[46px] rounded-full text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors ${
              activeSection === 'skin' ? 'text-zinc-950 font-bold' : 'text-zinc-400 hover:text-white'
            }`}
          >
            {activeSection === 'skin' && (
              <motion.span
                layoutId="mobileNavPill"
                transition={{ type: 'spring', damping: 25, stiffness: 350 }}
                className="absolute inset-0 rounded-full bg-white shadow-md"
              />
            )}
            <Sparkles className="w-4 h-4 relative z-10" />
            <span className="relative z-10 text-xs">Skin</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveSection('wardrobe')}
            className={`relative flex-1 min-h-[46px] rounded-full text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors ${
              activeSection === 'wardrobe' ? 'text-zinc-950 font-bold' : 'text-zinc-400 hover:text-white'
            }`}
          >
            {activeSection === 'wardrobe' && (
              <motion.span
                layoutId="mobileNavPill"
                transition={{ type: 'spring', damping: 25, stiffness: 350 }}
                className="absolute inset-0 rounded-full bg-white shadow-md"
              />
            )}
            <Shirt className="w-4 h-4 relative z-10" />
            <span className="relative z-10 text-xs">Fits</span>
          </button>
        </div>
      </div>

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
        onDeleteAllUserData={handleDeleteAllUserData}
      />
    </div>
  );
}
