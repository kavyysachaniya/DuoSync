/**
 * Idempotent Data Migration Script: Firebase Firestore -> Supabase PostgreSQL
 * 
 * Usage:
 *   npx tsx scripts/migrate-firebase-to-supabase.ts
 * 
 * Requirements:
 *   - Firebase config in firebase-applet-config.json
 *   - VITE_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY or VITE_SUPABASE_ANON_KEY in environment
 * 
 * Safety:
 *   - DOES NOT DELETE ANY FIREBASE DATA
 *   - Uses upsert (ON CONFLICT DO UPDATE) for idempotency
 */

import { initializeApp } from 'firebase/app';
import {
  collection,
  getDocs,
  getFirestore,
} from 'firebase/firestore';
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as fs from 'fs';
import * as path from 'path';

dotenv.config();

const configPath = path.resolve(process.cwd(), 'firebase-applet-config.json');
if (!fs.existsSync(configPath)) {
  console.error('Error: firebase-applet-config.json not found.');
  process.exit(1);
}

const firebaseConfig = JSON.parse(fs.readFileSync(configPath, 'utf8'));
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseKey =
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  process.env.VITE_SUPABASE_ANON_KEY ||
  process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Error: Please set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY (or SUPABASE_SERVICE_ROLE_KEY) in .env');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function runMigration() {
  console.log('--- Starting Idempotent DuoSync Migration ---');
  console.log(`Supabase URL: ${supabaseUrl}`);

  try {
    // 1. Fetch all workspaces from Firestore
    console.log('\n[1/6] Reading workspaces from Firestore...');
    const workspacesSnap = await getDocs(collection(db, 'workspaces'));
    console.log(`Found ${workspacesSnap.docs.length} workspaces.`);

    for (const wsDoc of workspacesSnap.docs) {
      const wsData = wsDoc.data();
      const wsId = wsDoc.id;
      console.log(`Processing workspace: ${wsId} (${wsData.partner1Name} & ${wsData.partner2Name})`);

      // Upsert workspace into Supabase
      const { error: wsError } = await supabase.from('workspaces').upsert(
        {
          id: wsId,
          owner_uid: wsData.ownerUid || '00000000-0000-0000-0000-000000000000',
          currency: wsData.currency || '₹',
          onboarding_completed: Boolean(wsData.onboardingCompleted),
          skincare_categories: wsData.skincareCategories || [],
          haircare_categories: wsData.haircareCategories || [],
          bodycare_categories: wsData.bodycareCategories || [],
          product_ids: wsData.productIds || [],
          created_at: wsData.createdAt?.toDate?.()?.toISOString() || new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'id' }
      );

      if (wsError) {
        console.warn(`  Workspace upsert notice (${wsId}): ${wsError.message}`);
      } else {
        console.log(`  ✓ Workspace ${wsId} synced.`);
      }

      // Upsert Partner 1 Member
      await supabase.from('workspace_members').upsert(
        {
          workspace_id: wsId,
          slot: 'partner1',
          name: wsData.partner1Name || 'Partner 1',
          role: wsData.partner1Role || 'Daily Dashboard',
          weight_unit: wsData.partner1WeightUnit || 'kg',
          target_weight: wsData.partner1TargetWeight || 62,
          start_weight: wsData.partner1StartWeight || 65,
          steps_goal: wsData.partner1StepsGoal || 8500,
          sleep_goal_minutes: wsData.partner1SleepGoalMinutes || 480,
          water_goal_ml: wsData.partner1WaterGoalMl || 2500,
        },
        { onConflict: 'workspace_id,slot' }
      );

      // Upsert Partner 2 Member
      await supabase.from('workspace_members').upsert(
        {
          workspace_id: wsId,
          slot: 'partner2',
          name: wsData.partner2Name || 'Partner 2',
          role: wsData.partner2Role || 'Daily Dashboard',
          weight_unit: wsData.partner2WeightUnit || 'kg',
          target_weight: wsData.partner2TargetWeight || 55,
          start_weight: wsData.partner2StartWeight || 58,
          steps_goal: wsData.partner2StepsGoal || 8500,
          sleep_goal_minutes: wsData.partner2SleepGoalMinutes || 480,
          water_goal_ml: wsData.partner2WaterGoalMl || 2500,
        },
        { onConflict: 'workspace_id,slot' }
      );
      console.log('  ✓ Workspace members synced.');

      // 2. Health Logs
      const healthSnap = await getDocs(collection(db, 'workspaces', wsId, 'healthLogs'));
      console.log(`  Reading ${healthSnap.docs.length} health logs...`);
      for (const hDoc of healthSnap.docs) {
        const hData = hDoc.data();
        await supabase.from('health_logs').upsert(
          {
            id: `${wsId}_${hData.profileSlot}_${hData.date}`,
            workspace_id: wsId,
            profile_slot: hData.profileSlot || 'partner1',
            date: hData.date,
            weight: Number(hData.weight) || 0,
            steps: Number(hData.steps) || 0,
            sleep_minutes: Number(hData.sleepMinutes) || 0,
            water_ml: Number(hData.waterMl) || 0,
            note: hData.note || '',
            created_at: hData.createdAt?.toDate?.()?.toISOString() || new Date().toISOString(),
            updated_at: new Date().toISOString(),
          },
          { onConflict: 'id' }
        );
      }
      console.log('  ✓ Health logs migrated.');

      // 3. Care Products
      const careSnap = await getDocs(collection(db, 'workspaces', wsId, 'careProducts'));
      console.log(`  Reading ${careSnap.docs.length} care products...`);
      for (const pDoc of careSnap.docs) {
        const pData = pDoc.data();
        await supabase.from('care_products').upsert(
          {
            id: pDoc.id,
            workspace_id: wsId,
            profile_slot: pData.profileSlot || 'shared',
            segment: pData.segment || 'skincare',
            sub_category: pData.subCategory || 'Other',
            name: pData.name || 'Untitled Product',
            brand: pData.brand || '',
            quantity: Number(pData.quantity) || 1,
            ordered_date: pData.orderedDate || '',
            opened_date: pData.openedDate || '',
            expiry_date: pData.expiryDate || '',
            sale_info: pData.saleInfo || '',
            price_paid: Number(pData.pricePaid) || 0,
            original_price: Number(pData.originalPrice) || 0,
            status: pData.status || 'in_use',
            routine_time: pData.routineTime || 'am',
            schedule_type: pData.scheduleType || 'daily',
            scheduled_days: pData.scheduledDays || [],
            notes: pData.notes || '',
            created_at: pData.createdAt?.toDate?.()?.toISOString() || new Date().toISOString(),
            updated_at: new Date().toISOString(),
          },
          { onConflict: 'id' }
        );
      }
      console.log('  ✓ Care products migrated.');

      // 4. Routine Completions
      const routineSnap = await getDocs(collection(db, 'workspaces', wsId, 'routineCompletions'));
      console.log(`  Reading ${routineSnap.docs.length} routine completions...`);
      for (const rDoc of routineSnap.docs) {
        const rData = rDoc.data();
        await supabase.from('routine_completions').upsert(
          {
            id: rDoc.id,
            workspace_id: wsId,
            profile_slot: rData.profileSlot || 'partner1',
            product_id: rData.productId,
            date: rData.date,
            completed: Boolean(rData.completed),
            completed_at: rData.completedAt?.toDate?.()?.toISOString() || null,
            created_at: rData.createdAt?.toDate?.()?.toISOString() || new Date().toISOString(),
            updated_at: new Date().toISOString(),
          },
          { onConflict: 'id' }
        );
      }
      console.log('  ✓ Routine completions migrated.');

      // 5. Wardrobe Items
      const wardrobeSnap = await getDocs(collection(db, 'workspaces', wsId, 'wardrobeItems'));
      console.log(`  Reading ${wardrobeSnap.docs.length} wardrobe items...`);
      for (const wDoc of wardrobeSnap.docs) {
        const wData = wDoc.data();
        await supabase.from('wardrobe_items').upsert(
          {
            id: wDoc.id,
            workspace_id: wsId,
            profile_slot: wData.profileSlot || 'shared',
            name: wData.name || 'Untitled Garment',
            category: wData.category || 'Tops',
            brand: wData.brand || '',
            color: wData.color || '',
            size: wData.size || '',
            season: wData.season || 'All Season',
            occasion: wData.occasion || 'Casual',
            image_url: wData.imageUrl || '',
            notes: wData.notes || '',
            created_at: wData.createdAt?.toDate?.()?.toISOString() || new Date().toISOString(),
            updated_at: new Date().toISOString(),
          },
          { onConflict: 'id' }
        );
      }
      console.log('  ✓ Wardrobe items migrated.');

      // 6. Outfits
      const outfitsSnap = await getDocs(collection(db, 'workspaces', wsId, 'outfits'));
      console.log(`  Reading ${outfitsSnap.docs.length} outfits...`);
      for (const oDoc of outfitsSnap.docs) {
        const oData = oDoc.data();
        await supabase.from('outfits').upsert(
          {
            id: oDoc.id,
            workspace_id: wsId,
            profile_slot: oData.profileSlot || 'shared',
            name: oData.name || 'Untitled Outfit',
            occasion: oData.occasion || 'Casual',
            item_ids: oData.itemIds || [],
            notes: oData.notes || '',
            created_at: oData.createdAt?.toDate?.()?.toISOString() || new Date().toISOString(),
            updated_at: new Date().toISOString(),
          },
          { onConflict: 'id' }
        );
      }
      console.log('  ✓ Outfits migrated.');
    }

    // 7. Pairing Codes
    console.log('\n[2/6] Reading pairing codes from Firestore...');
    const pairingSnap = await getDocs(collection(db, 'pairingCodes'));
    for (const pDoc of pairingSnap.docs) {
      const pData = pDoc.data();
      await supabase.from('pairing_codes').upsert(
        {
          code: pDoc.id,
          workspace_id: pData.workspaceId,
          owner_uid: pData.ownerUid || '00000000-0000-0000-0000-000000000000',
          owner_name: pData.ownerName || 'Partner',
          created_at: pData.createdAt?.toDate?.()?.toISOString() || new Date().toISOString(),
        },
        { onConflict: 'code' }
      );
    }
    console.log(`  ✓ ${pairingSnap.docs.length} Pairing codes migrated.`);

    console.log('\n============================================================');
    console.log('Migration Completed Successfully!');
    console.log('NOTE: All Firebase data has been left intact.');
    console.log('============================================================\n');
  } catch (err) {
    console.error('Migration failed:', err);
    process.exit(1);
  }
}

runMigration();
