import puppeteer, { Page } from 'puppeteer-core';
import { spawn, ChildProcess } from 'child_process';
import path from 'path';
import fs from 'fs';

const EDGE_PATH = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
const SCREENSHOT_DIR = path.resolve('docs', 'screenshots');

if (!fs.existsSync(SCREENSHOT_DIR)) {
  fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });
}

interface ViewportConfig {
  name: string;
  width: number;
  height: number;
  isLandscape?: boolean;
}

const VIEWPORTS: ViewportConfig[] = [
  { name: '320px-SE-narrow', width: 320, height: 568 },
  { name: '360px-Galaxy-S8', width: 360, height: 740 },
  { name: '375px-iPhone-Mini', width: 375, height: 667 },
  { name: '390px-iPhone-14', width: 390, height: 844 },
  { name: '412px-Pixel-7', width: 412, height: 915 },
  { name: '430px-iPhone-ProMax', width: 430, height: 932 },
  { name: '667x375-landscape', width: 667, height: 375, isLandscape: true },
  { name: '768px-iPad', width: 768, height: 1024 },
  { name: '1280px-Desktop', width: 1280, height: 800 },
];

const MOCK_USER = {
  id: 'usr_audit123',
  email: 'audit@duosync.app',
  display_name: 'Kavya',
  workspace_id: 'ws_audit123',
  default_slot: 'partner1',
  onboarding_completed: true,
};

const MOCK_WORKSPACE_STATE = {
  workspace: {
    id: 'ws_audit123',
    owner_uid: 'usr_audit123',
    pairing_code: '482910',
    currency: '₹',
    partner1_name: 'Kavya',
    partner1_role: 'Her Daily Vitals',
    partner1_weight_unit: 'kg',
    partner1_target_weight: 52,
    partner1_start_weight: 56,
    partner1_steps_goal: 10000,
    partner1_sleep_goal_minutes: 480,
    partner1_water_goal_ml: 2500,
    partner1_fitness_app: 'manual',
    partner2_name: 'Dev',
    partner2_role: 'His Daily Vitals',
    partner2_weight_unit: 'kg',
    partner2_target_weight: 72,
    partner2_start_weight: 76,
    partner2_steps_goal: 12000,
    partner2_sleep_goal_minutes: 450,
    partner2_water_goal_ml: 3000,
    partner2_fitness_app: 'manual',
    onboarding_completed: true,
    skincare_categories: ['Cleanser', 'Toner', 'Serum', 'Moisturizer', 'Sunscreen'],
    haircare_categories: ['Shampoo', 'Conditioner', 'Hair Mask', 'Scalp Oil'],
    bodycare_categories: ['Body Wash', 'Body Lotion', 'Body Scrub'],
    product_ids: [],
  },
  members: [{ user_id: 'usr_audit123', role: 'owner' }],
  healthLogs: [
    {
      id: 'hl_today',
      workspace_id: 'ws_audit123',
      profile_slot: 'partner1',
      date: '2026-11-20',
      weight: 53.4,
      steps: 8420,
      sleep_minutes: 450,
      water_ml: 2100,
      note: 'Long morning walk together and hydration goal on track!',
    },
    {
      id: 'hl_partner_today',
      workspace_id: 'ws_audit123',
      profile_slot: 'partner2',
      date: '2026-11-20',
      weight: 73.8,
      steps: 10450,
      sleep_minutes: 480,
      water_ml: 2600,
      note: 'Gym workout completed.',
    },
  ],
  careProducts: [
    {
      id: 'prod_1',
      workspace_id: 'ws_audit123',
      segment: 'skincare',
      sub_category: 'Serum',
      name: 'Niacinamide 10% + Zinc 1% High-Strength Mineral Blemish Formula',
      brand: 'The Ordinary',
      profile_slot: 'partner1',
      quantity: 2,
      price_paid: 600,
      original_price: 750,
      sale_info: 'Festive Flash Deal 20% Off',
      status: 'in_use',
      schedule_type: 'weekly',
      scheduled_days: ['wednesday', 'friday', 'sunday'],
      routine_time: 'both',
      ordered_date: '2026-10-12',
      opened_date: '2026-10-15',
      expiry_date: '2027-10-15',
      notes: 'Apply morning and night before heavier moisturizers.',
    },
    {
      id: 'prod_2',
      workspace_id: 'ws_audit123',
      segment: 'skincare',
      sub_category: 'Sunscreen',
      name: 'Relief Sun : Rice + Probiotics SPF50+ PA++++ Organic Sunscreen',
      brand: 'Beauty of Joseon',
      profile_slot: 'shared',
      quantity: 1,
      price_paid: 850,
      original_price: 1050,
      sale_info: 'Bundle Deal',
      status: 'in_use',
      schedule_type: 'daily',
      scheduled_days: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'],
      routine_time: 'am',
      ordered_date: '2026-10-01',
      opened_date: '2026-10-05',
      expiry_date: '2027-04-01',
      notes: 'Shared sunscreen tube on the bathroom counter.',
    },
  ],
  routineCompletions: [],
  wardrobeItems: [
    {
      id: 'ward_1',
      workspace_id: 'ws_audit123',
      name: 'Relaxed Fit Heavyweight Cotton Linen Blend Overshirt',
      category: 'Tops',
      brand: 'Zara Studio',
      color: 'Off-White',
      size: 'Medium',
      season: 'All Season',
      occasion: 'Casual',
      profile_slot: 'partner1',
      notes: 'Versatile layer over basic tees or knitwear',
    },
    {
      id: 'ward_2',
      workspace_id: 'ws_audit123',
      name: 'Relaxed Tailored Straight-Leg Pleated Trousers',
      category: 'Bottoms',
      brand: 'Uniqlo U',
      color: 'Navy',
      size: '30/30',
      season: 'Autumn',
      occasion: 'Work',
      profile_slot: 'partner1',
      notes: 'Pleated drape, pairs with white sneakers or loafers',
    },
  ],
  outfits: [],
};

async function setupRequestMocking(page: Page) {
  await page.setRequestInterception(true);

  page.on('request', (req) => {
    const url = req.url();

    if (url.includes('/api/auth/me')) {
      req.respond({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ user: MOCK_USER }),
      });
      return;
    }

    if (url.includes('/api/sync/workspace')) {
      req.respond({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(MOCK_WORKSPACE_STATE),
      });
      return;
    }

    if (url.includes('/api/mutate/')) {
      req.respond({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ success: true, timestamp: Date.now(), id: 'mut_123' }),
      });
      return;
    }

    req.continue();
  });
}

async function startServer(): Promise<{ proc: ChildProcess; url: string }> {
  return new Promise((resolve, reject) => {
    const proc = spawn('npx', ['vite', 'preview', '--port', '4173', '--host', '127.0.0.1'], {
      shell: true,
      stdio: ['ignore', 'pipe', 'pipe'],
      cwd: process.cwd(),
    });

    let resolved = false;
    proc.stdout?.on('data', (data) => {
      const str = data.toString();
      if (str.includes('4173')) {
        if (!resolved) {
          resolved = true;
          resolve({ proc, url: 'http://127.0.0.1:4173' });
        }
      }
    });

    setTimeout(() => {
      if (!resolved) {
        resolved = true;
        resolve({ proc, url: 'http://127.0.0.1:4173' });
      }
    }, 3500);

    proc.on('error', (err) => {
      if (!resolved) reject(err);
    });
  });
}

async function runComprehensiveAudit() {
  console.log('🚀 Starting Vite preview server...');
  const { proc: serverProc, url: serverUrl } = await startServer();
  console.log(`📡 Preview server online at ${serverUrl}`);

  console.log(`🌐 Launching Edge from ${EDGE_PATH}...`);
  const browser = await puppeteer.launch({
    executablePath: EDGE_PATH,
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-gpu'],
  });

  const page = await browser.newPage();
  await setupRequestMocking(page);

  const verificationMatrix: Record<string, any> = {};

  try {
    // 1. Audit Auth Screen across viewports
    console.log('\n--- PHASE 1: AUTH SCREEN VIEWPORT AUDIT ---');
    for (const vp of VIEWPORTS) {
      await page.setViewport({ width: vp.width, height: vp.height, hasTouch: vp.width <= 768 });
      await page.goto(serverUrl, { waitUntil: 'networkidle0' });
      // Clear token to see auth screen
      await page.evaluate(() => {
        try { localStorage.removeItem('duosync_auth_token'); } catch {}
      });
      await new Promise((r) => setTimeout(r, 400));

      const overflow = await page.evaluate(() => {
        return {
          scrollWidth: document.documentElement.scrollWidth,
          innerWidth: window.innerWidth,
          overflow: document.documentElement.scrollWidth > window.innerWidth,
        };
      });

      console.log(`Auth Screen (${vp.name}): ${overflow.overflow ? '❌ OVERFLOW' : '✅ CLEAN'} (${overflow.scrollWidth}px / ${overflow.innerWidth}px)`);
      if (vp.width === 320 || vp.width === 390) {
        await page.screenshot({ path: path.join(SCREENSHOT_DIR, `${vp.name}-auth.png`) });
      }
    }

    // 2. Set token to view main authenticated dashboard
    console.log('\n--- PHASE 2: AUTHENTICATED DASHBOARD AUDIT ---');
    await page.goto(serverUrl, { waitUntil: 'networkidle0' });
    // Pre-set token in localStorage
    await page.evaluate(() => {
      try { localStorage.setItem('duosync_auth_token', 'mock_jwt_token_123'); } catch {}
    });

    for (const vp of VIEWPORTS) {
      await page.setViewport({ width: vp.width, height: vp.height, hasTouch: vp.width <= 768 });
      await page.goto(serverUrl, { waitUntil: 'networkidle0' });
      await new Promise((r) => setTimeout(r, 600));

      const dashboardOverflow = await page.evaluate(() => {
        const sw = document.documentElement.scrollWidth;
        const iw = window.innerWidth;
        const overElements: string[] = [];
        document.querySelectorAll('*').forEach((el) => {
          const r = el.getBoundingClientRect();
          if (r.right > iw + 0.5) {
            overElements.push(`${el.tagName.toLowerCase()}.${el.className.toString().slice(0, 30)} (right: ${Math.round(r.right)})`);
          }
        });
        return {
          scrollWidth: sw,
          innerWidth: iw,
          overflow: sw > iw,
          overElementsCount: overElements.length,
          overElements: overElements.slice(0, 3),
        };
      });

      console.log(`Health Dashboard (${vp.name}): ${dashboardOverflow.overflow ? '❌ OVERFLOW' : '✅ CLEAN'} (${dashboardOverflow.scrollWidth}px / ${dashboardOverflow.innerWidth}px)`);
      verificationMatrix[`Health-${vp.name}`] = dashboardOverflow;

      if (vp.width === 320 || vp.width === 390 || vp.width === 1280) {
        await page.screenshot({ path: path.join(SCREENSHOT_DIR, `${vp.name}-health-dashboard.png`) });
      }
    }

    // 3. Test Navigation tabs (Skin and Wardrobe) and Modals at 320px & 390px
    console.log('\n--- PHASE 3: INTERACTIVE SCREENSHOTS & MODALS ---');
    for (const testWidth of [320, 390]) {
      await page.setViewport({ width: testWidth, height: 750, hasTouch: true });
      await page.goto(serverUrl, { waitUntil: 'networkidle0' });
      await new Promise((r) => setTimeout(r, 500));

      // Switch to Skin Care tab via bottom nav or top pill
      const navButtons = await page.$$('nav button, [aria-label="Mobile Navigation Bar"] button');
      // Click Skin tab (second button)
      if (navButtons.length >= 3) {
        await navButtons[1].click();
        await new Promise((r) => setTimeout(r, 500));
        await page.screenshot({ path: path.join(SCREENSHOT_DIR, `${testWidth}px-skin-dashboard.png`) });
        console.log(`📸 Captured ${testWidth}px-skin-dashboard.png`);

        // Check overflow on Skin Dashboard
        const skinOverflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth);
        console.log(`   Skin Dashboard (${testWidth}px): ${skinOverflow ? '❌ Overflow' : '✅ Clean fit'}`);
        verificationMatrix[`Skin-${testWidth}px`] = { overflow: skinOverflow };

        // Click Wardrobe tab (third button)
        await navButtons[2].click();
        await new Promise((r) => setTimeout(r, 500));
        await page.screenshot({ path: path.join(SCREENSHOT_DIR, `${testWidth}px-wardrobe-dashboard.png`) });
        console.log(`📸 Captured ${testWidth}px-wardrobe-dashboard.png`);

        // Check overflow on Wardrobe Dashboard
        const wardrobeOverflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth);
        console.log(`   Wardrobe Dashboard (${testWidth}px): ${wardrobeOverflow ? '❌ Overflow' : '✅ Clean fit'}`);
        verificationMatrix[`Wardrobe-${testWidth}px`] = { overflow: wardrobeOverflow };

        // Return to Health tab
        await navButtons[0].click();
        await new Promise((r) => setTimeout(r, 500));
      }

      // Open Partner Connection Modal
      const partnerBtn = await page.$('header button[title="Partner Connection & Profiles"], header button');
      if (partnerBtn) {
        await partnerBtn.click();
        await new Promise((r) => setTimeout(r, 500));
        await page.screenshot({ path: path.join(SCREENSHOT_DIR, `${testWidth}px-modal-partner.png`) });
        console.log(`📸 Captured ${testWidth}px-modal-partner.png`);

        const modalOverflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth);
        console.log(`   Partner Modal (${testWidth}px): ${modalOverflow ? '❌ Overflow' : '✅ Clean fit'}`);
        verificationMatrix[`PartnerModal-${testWidth}px`] = { overflow: modalOverflow };

        // Close partner modal
        const closeBtn = await page.$('button[aria-label="Close modal"]');
        if (closeBtn) await closeBtn.click();
        await new Promise((r) => setTimeout(r, 400));
      }
    }

    const auditDir = path.resolve('docs', 'audit');
    if (!fs.existsSync(auditDir)) {
      fs.mkdirSync(auditDir, { recursive: true });
    }
    const reportPath = path.resolve(auditDir, 'audit-verification-matrix.json');
    fs.writeFileSync(reportPath, JSON.stringify(verificationMatrix, null, 2));
    console.log(`\n🎉 Verification matrix written to ${reportPath}`);

  } finally {
    await browser.close();
    serverProc.kill();
    console.log('🏁 Audit finished and server stopped.');
  }
}

runComprehensiveAudit().catch((err) => {
  console.error('Audit run error:', err);
  process.exit(1);
});
