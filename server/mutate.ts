import { Router, Response } from 'express';
import { getDb, isDbConfigured, ensureSchema } from './db.js';
import { AuthenticatedRequest, requireAuth } from './auth.js';

export const mutateRouter = Router();

// Helper to bump workspace last_sync_timestamp
async function bumpWorkspaceSync(sql: ReturnType<typeof getDb>, workspaceId: string) {
  const ts = Date.now();
  await sql`
    UPDATE public.workspaces
    SET last_sync_timestamp = ${ts}, updated_at = now()
    WHERE id = ${workspaceId}
  `;
  return ts;
}

// 1. SAVE HEALTH LOG (UPSERT)
mutateRouter.post('/health-log', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (!isDbConfigured) {
      res.status(503).json({ error: 'Database is not configured.' });
      return;
    }

    const {
      workspaceId,
      profileSlot,
      date,
      weight = 0,
      steps = 0,
      sleepMinutes = 0,
      waterMl = 0,
      note = '',
    } = req.body;

    const targetWsId = workspaceId || req.user?.workspaceId;
    if (!targetWsId || !profileSlot || !date) {
      res.status(400).json({ error: 'workspaceId, profileSlot, and date are required.' });
      return;
    }

    const logId = `${targetWsId}_${profileSlot}_${date}`;
    const sql = getDb();

    await sql`
      INSERT INTO public.health_logs (
        id, workspace_id, profile_slot, date, weight, steps, sleep_minutes, water_ml, note, updated_by_id, updated_at
      ) VALUES (
        ${logId}, ${targetWsId}, ${profileSlot}, ${date}, ${Number(weight) || 0},
        ${Math.round(Number(steps) || 0)}, ${Math.round(Number(sleepMinutes) || 0)},
        ${Math.round(Number(waterMl) || 0)}, ${String(note || '').slice(0, 500)},
        ${req.user?.userId || null}, now()
      )
      ON CONFLICT (workspace_id, profile_slot, date)
      DO UPDATE SET
        weight = EXCLUDED.weight,
        steps = EXCLUDED.steps,
        sleep_minutes = EXCLUDED.sleep_minutes,
        water_ml = EXCLUDED.water_ml,
        note = EXCLUDED.note,
        updated_by_id = EXCLUDED.updated_by_id,
        updated_at = now()
    `;

    const newTimestamp = await bumpWorkspaceSync(sql, targetWsId);
    res.json({ success: true, timestamp: newTimestamp, id: logId });
  } catch (error: unknown) {
    console.error('Save health log error:', error);
    const msg = error instanceof Error ? error.message : 'Save health log failed.';
    res.status(500).json({ error: msg });
  }
});

// 2. UPDATE PARTNER GOALS
mutateRouter.post('/partner-goals', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (!isDbConfigured) {
      res.status(503).json({ error: 'Database is not configured.' });
      return;
    }

    const {
      workspaceId,
      slot,
      name,
      role,
      weightUnit = 'kg',
      targetWeight,
      startWeight,
      stepsGoal,
      sleepGoalMinutes,
      waterGoalMl,
    } = req.body;

    const targetWsId = workspaceId || req.user?.workspaceId;
    if (!targetWsId || !slot) {
      res.status(400).json({ error: 'workspaceId and slot are required.' });
      return;
    }

    const sql = getDb();

    await sql`
      UPDATE public.workspace_members
      SET
        name = COALESCE(${name}, name),
        role = COALESCE(${role}, role),
        weight_unit = COALESCE(${weightUnit}, weight_unit),
        target_weight = COALESCE(${targetWeight != null ? Number(targetWeight) : null}, target_weight),
        start_weight = COALESCE(${startWeight != null ? Number(startWeight) : null}, start_weight),
        steps_goal = COALESCE(${stepsGoal != null ? Math.round(Number(stepsGoal)) : null}, steps_goal),
        sleep_goal_minutes = COALESCE(${sleepGoalMinutes != null ? Math.round(Number(sleepGoalMinutes)) : null}, sleep_goal_minutes),
        water_goal_ml = COALESCE(${waterGoalMl != null ? Math.round(Number(waterGoalMl)) : null}, water_goal_ml)
      WHERE workspace_id = ${targetWsId} AND slot = ${slot}
    `;

    const newTimestamp = await bumpWorkspaceSync(sql, targetWsId);
    res.json({ success: true, timestamp: newTimestamp });
  } catch (error: unknown) {
    console.error('Update partner goals error:', error);
    const msg = error instanceof Error ? error.message : 'Update partner goals failed.';
    res.status(500).json({ error: msg });
  }
});

// 3. SAVE CARE PRODUCT
mutateRouter.post('/care-product', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (!isDbConfigured) {
      res.status(503).json({ error: 'Database is not configured.' });
      return;
    }

    const {
      id,
      workspaceId,
      profileSlot = 'shared',
      segment = 'skincare',
      subCategory = 'General',
      name,
      brand = '',
      quantity = 1,
      orderedDate = '',
      openedDate = '',
      expiryDate = '',
      saleInfo = '',
      pricePaid = 0,
      originalPrice = 0,
      status = 'in_use',
      routineTime = 'am',
      scheduleType = 'daily',
      scheduledDays = [],
      notes = '',
      imageUrl = '',
      thumbnailUrl = '',
    } = req.body;

    const targetWsId = workspaceId || req.user?.workspaceId;
    if (!targetWsId || !id || !name) {
      res.status(400).json({ error: 'id, workspaceId, and name are required.' });
      return;
    }

    const sql = getDb();

    try {
      await sql`
        INSERT INTO public.care_products (
          id, workspace_id, profile_slot, segment, sub_category, name, brand, quantity,
          ordered_date, opened_date, expiry_date, sale_info, price_paid, original_price,
          status, routine_time, schedule_type, scheduled_days, notes, image_url, thumbnail_url, updated_by_id, updated_at
        ) VALUES (
          ${id}, ${targetWsId}, ${profileSlot}, ${segment}, ${subCategory}, ${name}, ${brand},
          ${Number(quantity) || 1}, ${orderedDate}, ${openedDate}, ${expiryDate}, ${saleInfo},
          ${Number(pricePaid) || 0}, ${Number(originalPrice) || 0}, ${status}, ${routineTime},
          ${scheduleType}, ${scheduledDays}, ${notes}, ${imageUrl || ''}, ${thumbnailUrl || imageUrl || ''}, ${req.user?.userId || null}, now()
        )
        ON CONFLICT (id)
        DO UPDATE SET
          profile_slot = EXCLUDED.profile_slot,
          segment = EXCLUDED.segment,
          sub_category = EXCLUDED.sub_category,
          name = EXCLUDED.name,
          brand = EXCLUDED.brand,
          quantity = EXCLUDED.quantity,
          ordered_date = EXCLUDED.ordered_date,
          opened_date = EXCLUDED.opened_date,
          expiry_date = EXCLUDED.expiry_date,
          sale_info = EXCLUDED.sale_info,
          price_paid = EXCLUDED.price_paid,
          original_price = EXCLUDED.original_price,
          status = EXCLUDED.status,
          routine_time = EXCLUDED.routine_time,
          schedule_type = EXCLUDED.schedule_type,
          scheduled_days = EXCLUDED.scheduled_days,
          notes = EXCLUDED.notes,
          image_url = EXCLUDED.image_url,
          thumbnail_url = EXCLUDED.thumbnail_url,
          updated_by_id = EXCLUDED.updated_by_id,
          updated_at = now()
      `;
    } catch (colErr: any) {
      if (colErr?.message?.includes('image_url') || colErr?.message?.includes('thumbnail_url')) {
        await ensureSchema(sql);
        await sql`
          INSERT INTO public.care_products (
            id, workspace_id, profile_slot, segment, sub_category, name, brand, quantity,
            ordered_date, opened_date, expiry_date, sale_info, price_paid, original_price,
            status, routine_time, schedule_type, scheduled_days, notes, image_url, thumbnail_url, updated_by_id, updated_at
          ) VALUES (
            ${id}, ${targetWsId}, ${profileSlot}, ${segment}, ${subCategory}, ${name}, ${brand},
            ${Number(quantity) || 1}, ${orderedDate}, ${openedDate}, ${expiryDate}, ${saleInfo},
            ${Number(pricePaid) || 0}, ${Number(originalPrice) || 0}, ${status}, ${routineTime},
            ${scheduleType}, ${scheduledDays}, ${notes}, ${imageUrl || ''}, ${thumbnailUrl || imageUrl || ''}, ${req.user?.userId || null}, now()
          )
          ON CONFLICT (id)
          DO UPDATE SET
            profile_slot = EXCLUDED.profile_slot,
            segment = EXCLUDED.segment,
            sub_category = EXCLUDED.sub_category,
            name = EXCLUDED.name,
            brand = EXCLUDED.brand,
            quantity = EXCLUDED.quantity,
            ordered_date = EXCLUDED.ordered_date,
            opened_date = EXCLUDED.opened_date,
            expiry_date = EXCLUDED.expiry_date,
            sale_info = EXCLUDED.sale_info,
            price_paid = EXCLUDED.price_paid,
            original_price = EXCLUDED.original_price,
            status = EXCLUDED.status,
            routine_time = EXCLUDED.routine_time,
            schedule_type = EXCLUDED.schedule_type,
            scheduled_days = EXCLUDED.scheduled_days,
            notes = EXCLUDED.notes,
            image_url = EXCLUDED.image_url,
            thumbnail_url = EXCLUDED.thumbnail_url,
            updated_by_id = EXCLUDED.updated_by_id,
            updated_at = now()
        `;
      } else {
        throw colErr;
      }
    }

    const newTimestamp = await bumpWorkspaceSync(sql, targetWsId);
    res.json({ success: true, timestamp: newTimestamp, id });
  } catch (error: unknown) {
    console.error('Save care product error:', error);
    const msg = error instanceof Error ? error.message : 'Save care product failed.';
    res.status(500).json({ error: msg });
  }
});

// 4. DELETE CARE PRODUCT
mutateRouter.delete('/care-product', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (!isDbConfigured) {
      res.status(503).json({ error: 'Database is not configured.' });
      return;
    }

    const { id, workspaceId } = req.body;
    const targetWsId = workspaceId || req.user?.workspaceId;

    if (!id || !targetWsId) {
      res.status(400).json({ error: 'id and workspaceId are required.' });
      return;
    }

    const sql = getDb();
    await sql`DELETE FROM public.care_products WHERE id = ${id} AND workspace_id = ${targetWsId}`;

    const newTimestamp = await bumpWorkspaceSync(sql, targetWsId);
    res.json({ success: true, timestamp: newTimestamp });
  } catch (error: unknown) {
    console.error('Delete care product error:', error);
    const msg = error instanceof Error ? error.message : 'Delete care product failed.';
    res.status(500).json({ error: msg });
  }
});

// 5. TOGGLE ROUTINE COMPLETION
mutateRouter.post('/routine-completion', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (!isDbConfigured) {
      res.status(503).json({ error: 'Database is not configured.' });
      return;
    }

    const {
      workspaceId,
      profileSlot,
      productId,
      date,
      completed,
    } = req.body;

    const targetWsId = workspaceId || req.user?.workspaceId;
    if (!targetWsId || !profileSlot || !productId || !date) {
      res.status(400).json({ error: 'workspaceId, profileSlot, productId, and date are required.' });
      return;
    }

    const completionId = `${profileSlot}_${productId}_${date}`;
    const sql = getDb();
    const isCompleted = Boolean(completed);

    await sql`
      INSERT INTO public.routine_completions (
        id, workspace_id, profile_slot, product_id, date, completed, completed_at, updated_by_id, updated_at
      ) VALUES (
        ${completionId}, ${targetWsId}, ${profileSlot}, ${productId}, ${date},
        ${isCompleted}, ${isCompleted ? new Date().toISOString() : null},
        ${req.user?.userId || null}, now()
      )
      ON CONFLICT (workspace_id, profile_slot, product_id, date)
      DO UPDATE SET
        completed = EXCLUDED.completed,
        completed_at = EXCLUDED.completed_at,
        updated_by_id = EXCLUDED.updated_by_id,
        updated_at = now()
    `;

    const newTimestamp = await bumpWorkspaceSync(sql, targetWsId);
    res.json({ success: true, timestamp: newTimestamp, id: completionId });
  } catch (error: unknown) {
    console.error('Toggle routine completion error:', error);
    const msg = error instanceof Error ? error.message : 'Toggle routine completion failed.';
    res.status(500).json({ error: msg });
  }
});

// 6. SAVE WARDROBE ITEM
mutateRouter.post('/wardrobe-item', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (!isDbConfigured) {
      res.status(503).json({ error: 'Database is not configured.' });
      return;
    }

    const {
      id,
      workspaceId,
      profileSlot = 'shared',
      name,
      category = 'Tops',
      brand = '',
      color = '',
      size = '',
      season = 'All Season',
      occasion = 'Casual',
      imageUrl = '',
      thumbnailUrl = '',
      notes = '',
    } = req.body;

    const targetWsId = workspaceId || req.user?.workspaceId;
    if (!targetWsId || !id || !name) {
      res.status(400).json({ error: 'id, workspaceId, and name are required.' });
      return;
    }

    const sql = getDb();

    await sql`
      INSERT INTO public.wardrobe_items (
        id, workspace_id, profile_slot, name, category, brand, color, size, season,
        occasion, image_url, thumbnail_url, notes, updated_by_id, updated_at
      ) VALUES (
        ${id}, ${targetWsId}, ${profileSlot}, ${name}, ${category}, ${brand}, ${color}, ${size},
        ${season}, ${occasion}, ${imageUrl}, ${thumbnailUrl || imageUrl}, ${notes},
        ${req.user?.userId || null}, now()
      )
      ON CONFLICT (id)
      DO UPDATE SET
        profile_slot = EXCLUDED.profile_slot,
        name = EXCLUDED.name,
        category = EXCLUDED.category,
        brand = EXCLUDED.brand,
        color = EXCLUDED.color,
        size = EXCLUDED.size,
        season = EXCLUDED.season,
        occasion = EXCLUDED.occasion,
        image_url = EXCLUDED.image_url,
        thumbnail_url = EXCLUDED.thumbnail_url,
        notes = EXCLUDED.notes,
        updated_by_id = EXCLUDED.updated_by_id,
        updated_at = now()
    `;

    const newTimestamp = await bumpWorkspaceSync(sql, targetWsId);
    res.json({ success: true, timestamp: newTimestamp, id });
  } catch (error: unknown) {
    console.error('Save wardrobe item error:', error);
    const msg = error instanceof Error ? error.message : 'Save wardrobe item failed.';
    res.status(500).json({ error: msg });
  }
});

// 7. DELETE WARDROBE ITEM
mutateRouter.delete('/wardrobe-item', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (!isDbConfigured) {
      res.status(503).json({ error: 'Database is not configured.' });
      return;
    }

    const { id, workspaceId } = req.body;
    const targetWsId = workspaceId || req.user?.workspaceId;

    if (!id || !targetWsId) {
      res.status(400).json({ error: 'id and workspaceId are required.' });
      return;
    }

    const sql = getDb();
    await sql`DELETE FROM public.wardrobe_items WHERE id = ${id} AND workspace_id = ${targetWsId}`;

    const newTimestamp = await bumpWorkspaceSync(sql, targetWsId);
    res.json({ success: true, timestamp: newTimestamp });
  } catch (error: unknown) {
    console.error('Delete wardrobe item error:', error);
    const msg = error instanceof Error ? error.message : 'Delete wardrobe item failed.';
    res.status(500).json({ error: msg });
  }
});

// 8. SAVE OUTFIT
mutateRouter.post('/outfit', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (!isDbConfigured) {
      res.status(503).json({ error: 'Database is not configured.' });
      return;
    }

    const {
      id,
      workspaceId,
      profileSlot = 'shared',
      name,
      occasion = 'Casual',
      itemIds = [],
      notes = '',
    } = req.body;

    const targetWsId = workspaceId || req.user?.workspaceId;
    if (!targetWsId || !id || !name) {
      res.status(400).json({ error: 'id, workspaceId, and name are required.' });
      return;
    }

    const sql = getDb();

    await sql`
      INSERT INTO public.outfits (
        id, workspace_id, profile_slot, name, occasion, item_ids, notes, updated_by_id, updated_at
      ) VALUES (
        ${id}, ${targetWsId}, ${profileSlot}, ${name}, ${occasion}, ${itemIds}, ${notes},
        ${req.user?.userId || null}, now()
      )
      ON CONFLICT (id)
      DO UPDATE SET
        profile_slot = EXCLUDED.profile_slot,
        name = EXCLUDED.name,
        occasion = EXCLUDED.occasion,
        item_ids = EXCLUDED.item_ids,
        notes = EXCLUDED.notes,
        updated_by_id = EXCLUDED.updated_by_id,
        updated_at = now()
    `;

    const newTimestamp = await bumpWorkspaceSync(sql, targetWsId);
    res.json({ success: true, timestamp: newTimestamp, id });
  } catch (error: unknown) {
    console.error('Save outfit error:', error);
    const msg = error instanceof Error ? error.message : 'Save outfit failed.';
    res.status(500).json({ error: msg });
  }
});

// 9. DELETE OUTFIT
mutateRouter.delete('/outfit', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (!isDbConfigured) {
      res.status(503).json({ error: 'Database is not configured.' });
      return;
    }

    const { id, workspaceId } = req.body;
    const targetWsId = workspaceId || req.user?.workspaceId;

    if (!id || !targetWsId) {
      res.status(400).json({ error: 'id and workspaceId are required.' });
      return;
    }

    const sql = getDb();
    await sql`DELETE FROM public.outfits WHERE id = ${id} AND workspace_id = ${targetWsId}`;

    const newTimestamp = await bumpWorkspaceSync(sql, targetWsId);
    res.json({ success: true, timestamp: newTimestamp });
  } catch (error: unknown) {
    console.error('Delete outfit error:', error);
    const msg = error instanceof Error ? error.message : 'Delete outfit failed.';
    res.status(500).json({ error: msg });
  }
});

// 10. UPDATE CATEGORIES
mutateRouter.post('/categories', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (!isDbConfigured) {
      res.status(503).json({ error: 'Database is not configured.' });
      return;
    }

    const { workspaceId, skincareCategories, haircareCategories, bodycareCategories } = req.body;
    const targetWsId = workspaceId || req.user?.workspaceId;

    if (!targetWsId) {
      res.status(400).json({ error: 'workspaceId is required.' });
      return;
    }

    const sql = getDb();

    await sql`
      UPDATE public.workspaces
      SET
        skincare_categories = COALESCE(${skincareCategories}, skincare_categories),
        haircare_categories = COALESCE(${haircareCategories}, haircare_categories),
        bodycare_categories = COALESCE(${bodycareCategories}, bodycare_categories)
      WHERE id = ${targetWsId}
    `;

    const newTimestamp = await bumpWorkspaceSync(sql, targetWsId);
    res.json({ success: true, timestamp: newTimestamp });
  } catch (error: unknown) {
    console.error('Update categories error:', error);
    const msg = error instanceof Error ? error.message : 'Update categories failed.';
    res.status(500).json({ error: msg });
  }
});

// 11. PAIR WITH PARTNER (BY 6-DIGIT CODE)
mutateRouter.post('/pair', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (!isDbConfigured) {
      res.status(503).json({ error: 'Database is not configured.' });
      return;
    }

    const { code, submission } = req.body;
    const cleanCode = String(code || '').trim().replace(/[^0-9]/g, '');

    if (cleanCode.length !== 6) {
      res.status(400).json({ error: 'Please enter a valid 6-digit invite code.' });
      return;
    }

    const userId = req.user?.userId;
    if (!userId) {
      res.status(401).json({ error: 'User not authenticated.' });
      return;
    }

    const sql = getDb();

    // Look up pairing code
    const codes = await sql`
      SELECT * FROM public.pairing_codes WHERE code = ${cleanCode} LIMIT 1
    `;

    if (codes.length === 0) {
      res.status(404).json({ error: 'Invalid invite code. Please double-check with your partner.' });
      return;
    }

    const targetWsId = codes[0].workspace_id;

    // Check if partner2 slot is already occupied by someone else
    const partner2Member = await sql`
      SELECT * FROM public.workspace_members WHERE workspace_id = ${targetWsId} AND slot = 'partner2' LIMIT 1
    `;

    if (partner2Member.length > 0 && partner2Member[0].user_id && partner2Member[0].user_id !== userId) {
      res.status(409).json({ error: 'That workspace is already linked with another partner account.' });
      return;
    }

    const partnerName = submission?.partnerName?.trim() || 'Partner';

    // Assign current user to partner2
    await sql`
      UPDATE public.workspace_members
      SET
        user_id = ${userId},
        name = ${partnerName},
        role = ${partnerName + '’s Dashboard'},
        weight_unit = ${submission?.weightUnit || 'kg'},
        start_weight = ${Number(submission?.currentWeight) || 58},
        target_weight = ${Number(submission?.targetWeight) || 55},
        steps_goal = ${Math.round(Number(submission?.stepsGoal) || 8500)},
        sleep_goal_minutes = ${Math.round(Number(submission?.sleepGoalMinutes) || 480)},
        water_goal_ml = ${Math.round(Number(submission?.waterGoalMl) || 2500)}
      WHERE workspace_id = ${targetWsId} AND slot = 'partner2'
    `;

    // Update user record
    await sql`
      UPDATE public.users
      SET
        workspace_id = ${targetWsId},
        default_slot = 'partner2',
        display_name = ${partnerName},
        onboarding_completed = true,
        updated_at = now()
      WHERE id = ${userId}
    `;

    // Mark workspace onboarding complete
    await sql`
      UPDATE public.workspaces
      SET onboarding_completed = true, updated_at = now()
      WHERE id = ${targetWsId}
    `;

    // Log baseline weight if provided
    if (submission?.currentWeight) {
      const today = new Date().toISOString().split('T')[0];
      const logId = `${targetWsId}_partner2_${today}`;
      await sql`
        INSERT INTO public.health_logs (
          id, workspace_id, profile_slot, date, weight, note, updated_by_id, updated_at
        ) VALUES (
          ${logId}, ${targetWsId}, 'partner2', ${today}, ${Number(submission.currentWeight)},
          'Initial baseline logged during partner connection', ${userId}, now()
        )
        ON CONFLICT (workspace_id, profile_slot, date)
        DO UPDATE SET weight = EXCLUDED.weight, updated_at = now()
      `;
    }

    const newTimestamp = await bumpWorkspaceSync(sql, targetWsId);

    // Fetch full workspace state
    const [workspace] = await sql`SELECT * FROM public.workspaces WHERE id = ${targetWsId} LIMIT 1`;
    const members = await sql`SELECT * FROM public.workspace_members WHERE workspace_id = ${targetWsId} ORDER BY slot ASC`;

    res.json({
      success: true,
      timestamp: newTimestamp,
      workspace,
      members,
      defaultSlot: 'partner2',
    });
  } catch (error: unknown) {
    console.error('Pair with partner error:', error);
    const msg = error instanceof Error ? error.message : 'Partner connection failed.';
    res.status(500).json({ error: msg });
  }
});

// 12. COMPLETE ONBOARDING
mutateRouter.post('/onboarding', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (!isDbConfigured) {
      res.status(503).json({ error: 'Database is not configured.' });
      return;
    }

    const { workspaceId, slot = 'partner1', submission } = req.body;
    const targetWsId = workspaceId || req.user?.workspaceId;
    const userId = req.user?.userId;

    if (!targetWsId || !userId) {
      res.status(400).json({ error: 'workspaceId is required.' });
      return;
    }

    const sql = getDb();
    const myName = (submission?.myName || submission?.name || '').trim() || 'Partner 1';
    const partnerName = (submission?.partnerName || '').trim() || 'Partner 2';
    const currency = submission?.currency || '₹';

    // 1. Update active member record
    await sql`
      UPDATE public.workspace_members
      SET
        name = ${myName},
        role = ${myName + '’s Dashboard'},
        weight_unit = ${submission?.weightUnit || 'kg'},
        start_weight = ${Number(submission?.currentWeight) || 65},
        target_weight = ${Number(submission?.targetWeight) || 62},
        steps_goal = ${Math.round(Number(submission?.stepsGoal) || 8500)},
        sleep_goal_minutes = ${Math.round(Number(submission?.sleepGoalMinutes) || 480)},
        water_goal_ml = ${Math.round(Number(submission?.waterGoalMl) || 2500)}
      WHERE workspace_id = ${targetWsId} AND slot = ${slot}
    `;

    // 2. If partner1, also update partner2 member record name and role
    if (slot === 'partner1' && partnerName) {
      await sql`
        UPDATE public.workspace_members
        SET
          name = ${partnerName},
          role = ${partnerName + '’s Dashboard'}
        WHERE workspace_id = ${targetWsId} AND slot = 'partner2'
      `;
    }

    // 3. Mark user onboarding complete
    await sql`
      UPDATE public.users
      SET
        display_name = ${myName},
        default_slot = ${slot},
        onboarding_completed = true,
        updated_at = now()
      WHERE id = ${userId}
    `;

    // 4. Update workspace categories and currency
    const skincareCats = submission?.skincareCategories || null;
    const haircareCats = submission?.haircareCategories || null;
    const bodycareCats = submission?.bodycareCategories || null;

    await sql`
      UPDATE public.workspaces
      SET
        currency = ${currency},
        skincare_categories = COALESCE(${skincareCats}, skincare_categories),
        haircare_categories = COALESCE(${haircareCats}, haircare_categories),
        bodycare_categories = COALESCE(${bodycareCats}, bodycare_categories),
        onboarding_completed = true,
        updated_at = now()
      WHERE id = ${targetWsId}
    `;

    const wardrobeCats = submission?.wardrobeCategories || null;
    if (wardrobeCats) {
      try {
        await sql`
          UPDATE public.workspaces
          SET wardrobe_categories = ${wardrobeCats}
          WHERE id = ${targetWsId}
        `;
      } catch {
        // Table may not have wardrobe_categories column yet; client persists in local storage
      }
    }

    // 5. Save baseline health log with workspace-prefixed unique ID
    if (submission?.currentWeight) {
      const today = new Date().toISOString().split('T')[0];
      const logId = `${targetWsId}_${slot}_${today}`;
      await sql`
        INSERT INTO public.health_logs (
          id, workspace_id, profile_slot, date, weight, steps, sleep_minutes, water_ml, note, updated_by_id, updated_at
        ) VALUES (
          ${logId}, ${targetWsId}, ${slot}, ${today}, ${Number(submission.currentWeight)},
          ${Math.round(Number(submission.stepsGoal) || 0)},
          ${Math.round(Number(submission.sleepGoalMinutes) || 0)},
          ${Math.round(Number(submission.waterGoalMl) || 0)},
          'Initial baseline logged during onboarding', ${userId}, now()
        )
        ON CONFLICT (workspace_id, profile_slot, date)
        DO UPDATE SET
          weight = EXCLUDED.weight,
          steps = EXCLUDED.steps,
          sleep_minutes = EXCLUDED.sleep_minutes,
          water_ml = EXCLUDED.water_ml,
          updated_at = now()
      `;
    }

    const newTimestamp = await bumpWorkspaceSync(sql, targetWsId);

    // Fetch updated workspace and members
    const [updatedWorkspace] = await sql`SELECT * FROM public.workspaces WHERE id = ${targetWsId} LIMIT 1`;
    const updatedMembers = await sql`SELECT * FROM public.workspace_members WHERE workspace_id = ${targetWsId} ORDER BY slot ASC`;

    res.json({
      success: true,
      timestamp: newTimestamp,
      workspace: updatedWorkspace,
      members: updatedMembers,
      user: {
        id: userId,
        display_name: myName,
        default_slot: slot,
        onboarding_completed: true,
      },
    });
  } catch (error: unknown) {
    console.error('Onboarding completion error:', error);
    const msg = error instanceof Error ? error.message : 'Onboarding completion failed.';
    res.status(500).json({ error: msg });
  }
});

