# DuoPulse — Coupled Daily Health & Personal Care Inventory Tracker

DuoPulse is a mobile-first, dark-themed personal care and daily health dashboard built for two partners to track their daily health vitals (Weight, Steps, Sleep, Water) and organize their Skincare, Haircare, and Bodycare inventory with real-time cross-device synchronization.

## User Review & Critical Decisions

> [!IMPORTANT]
> The following core product decisions have been aligned based on your preferences and will govern how the application is built upon approval:

- **Confirmed Decision 1 — Account Connection & Sync**: **Google Sign-In with a 6-digit partner pairing code** backed by Firebase Authentication and Cloud Firestore for real-time updates across both partners' devices.
- **Confirmed Decision 2 — Shared Profile Permissions**: **Full shared access** when switching between connected partner profiles, allowing either partner to view, log daily metrics, customize targets, and add or edit inventory products on both dashboards.
- **Confirmed Decision 3 — Health Rings & History**: **Live Today circular progress rings paired with a horizontal date selector, custom daily goal targets, and 7-day trend sparklines** for Weight, Steps, Sleep, and Water.
- **Design & Privacy Note**: As requested, product expiry and open dates are logged strictly for visual organization on your shared inventory cards—no push notifications or annoying alert popups will be triggered.

---

## 1. Overview & Core Concept

- **What It Does**: Combines two distinct daily rituals into a unified, Apple-inspired dark interface:
  1. **Health Dashboard**: Tracks daily **Weight**, **Steps** (end-of-day exact numerical input), **Total Sleep**, and **Water Intake**, each visualized with a smooth SVG circular progress indicator, customizable target goals, a horizontal date strip, and a 7-day trend view.
  2. **Skin & Care Inventory Dashboard**: Organizes products across three primary segments—**Skincare**, **Haircare**, and **Bodycare**—with customizable sub-categories (e.g., Cleanser, Moisturizer, Serum, Sunscreen, Shampoo, Body Oil) and detailed purchase/lifecycle tracking (Ordered Date, Opened Date, Expiry Date, Sale/Discount Tag, and Price Paid).
- **Target Audience / Persona**: You and your girlfriend accessing the app primarily on mobile phones (with full responsive multi-column expansion on desktop/tablet) to log end-of-day vitals and keep a transparent, organized record of personal care essentials and spending.
- **Key Value**: Eliminates scattered notes and spreadsheets by giving both partners an instant profile switcher in the header, real-time sync across devices, and complete customization over categories, goals, and product metadata.

---

## 2. User Experience & Visual Design

### Key User Flows

1. **Authentication & 6-Digit Partner Pairing**:
   - Sign in with Google in one tap.
   - Open the **Partner Link Modal** from the top profile switcher to either copy your unique 6-digit pairing code or enter your partner's 6-digit code.
   - Once linked, a sleek **Profile Switcher** in the header lets you toggle between your dashboard and her dashboard with instant transitions and full read/write permissions on either profile.
2. **Top Pilled Navigation (`Health` | `Skin`)**:
   - A centered, tactile segmented pill control at the top smoothly transitions between the **Health** dashboard and the **Skin** inventory workspace using spring-physics motion (`cubic-bezier(0.16, 1, 0.3, 1)`, $\le 200\text{ms}$ latency).
3. **Health Dashboard Flow**:
   - **Horizontal Date Scroller**: Quickly jump between **Today** and past dates (`M 01`, `T 02`, `W 03`...) while keeping a one-tap "Today" reset button.
   - **4 Circular Progress Cards (Weight, Steps, Sleep, Water)**:
     - **Weight**: Displays current daily weight (kg or lbs), target weight/delta progress ring, quick $\pm 0.1$ adjuster or direct number pad input, and a 7-day weight curve.
     - **Steps**: Displays the circular ring toward the daily step goal with a clean end-of-day real number input field (e.g., `8,420 steps`) and 7-day bar sparkline.
     - **Total Sleep**: Displays hours & minutes slept against the target sleep duration ring (e.g., `7h 45m / 8h 00m`) with quick log input.
     - **Water Intake**: Displays daily hydration in `ml` or `L` (or glasses) with a circular ring, one-tap increment buttons (`+250ml`, `+500ml`), and direct number entry.
   - **Custom Goal Drawer**: Tap the settings affordance on any Health card or profile menu to customize daily targets (target weight, step goal, sleep goal, water target, and preferred units).
4. **Skin, Hair & Body Care Inventory Flow**:
   - **Three Primary Segment Cards (`Skincare`, `Haircare`, `Bodycare`)**:
     - Displayed as three tactile macro-cards summarizing active product count, total routine investment, and sub-category breakdown, or selectable to filter the inventory board.
   - **Custom Sub-Categories**:
     - Comes pre-seeded with essentials (*Cleanser, Toner, Serum, Moisturizer, Sunscreen, Shampoo, Conditioner, Hair Mask, Body Wash, Body Lotion, Scrub*) plus a **`+ Add Sub-Category`** control so you can define custom product types at any time.
   - **Editable Product Cards**:
     - Each product card displays the Product Name, Brand, Sub-Category, Price Paid & Sale info (e.g., `$24.50 · 30% Off Nykaa Sale`), and clean unboxed lifecycle dates (`Ordered: 12 Oct 2026 · Opened: 18 Oct 2026 · Expires: 18 Oct 2027`).
     - Tap any card to edit its details, mark it as unopened/in-use/finished, or add a new product via a slide-up bottom sheet.

### Visual Identity & Theme

- **Aesthetic Direction**: Apple Health & iOS 18 Dark Mode minimalism—deep obsidian surfaces, crisp typographic hierarchy, luminous SVG progress rings, and zero visual clutter.
- **Color Palette & Mood (60-30-10 Dark Mode Discipline)**:
  - **60% Dominant Canvas (`--background`)**: Deep OLED Obsidian (`#090A0F` / `bg-zinc-950`) for effortless nighttime and mobile readability.
  - **30% Structural Surfaces (`--card` / `--surface`)**: Elevated Translucent Charcoal (`#12141C` / `bg-zinc-900/90`) with subtle hairline borders (`1px solid rgba(255,255,255,0.07)`) and `backdrop-blur-md`.
  - **10% Semantic Accent Budget**:
    - *Weight Ring*: Rose Quartz (`#F43F5E` / `rose-500`)
    - *Steps Ring*: Electric Emerald (`#10B981` / `emerald-500`)
    - *Sleep Ring*: Indigo Lavender (`#818CF8` / `indigo-400`)
    - *Water Ring*: Cyan Sky (`#38BDF8` / `sky-400`)
    - *Skin / Care Accents*: Warm Champagne Gold (`#F59E0B` / `amber-400`) & Soft Coral (`#FB7185`)
- **Typography & Hierarchy (2+1 Font Rule)**:
  - **Display & Headings**: `Plus Jakarta Sans` (SemiBold 600 / Bold 700, tight tracking `-0.02em`) for an Apple-like geometric neo-grotesque presence.
  - **Body & Labels**: `DM Sans` (Regular 400 / Medium 500) with dark-mode optical compensation (`tracking-[0.01em]`).
  - **Metrics, Dates & Prices**: `JetBrains Mono` with `tabular-nums` for aligned step counts, weights, prices, and dates.
- **Mobile Ergonomics & Spatial Math**:
  - **Touch Hitboxes**: All interactive buttons, ring triggers, profile toggles, and sub-category filters enforce a minimum $44 \times 44\text{px}$ tap area.
  - **15% Sticky Surface Cap**: The compact sticky top bar (housing the Profile Switcher and `Health | Skin` pilled segmented control) stays under $64\text{px}$ height, leaving $>85\%$ of the mobile viewport open for scrollable cards.
  - **Responsive Desktop Expansion**: While optimized for $375\text{px}\text{–}430\text{px}$ mobile screens, the layout cleanly expands to a balanced 2-column / 3-column bento grid (`max-w-6xl`) on tablet and desktop viewports.
  - **Zero-Pill Metadata Discipline**: Product dates (`Ordered · Opened · Expiry`) and sale notes are rendered as clean, unboxed typographic metadata rather than cluttered badge sandwiches.

---

## 3. Key Product Decisions & Trade-Offs

- **Decision 1: Cloud Firestore Real-Time Listeners (`onSnapshot`) + 6-Digit Pairing Code**
  - *Chosen Approach*: Each authenticated user has a profile document in Firestore and can generate or claim a 6-digit pairing code to link their `partnerUid`. Both connected UIDs are explicitly authorized in Firestore Security Rules to read and write each other's daily health logs, custom targets, and care inventory.
  - *Why*: Delivers true sub-second real-time sync across your phone and your girlfriend's phone without requiring you to share a single Google account password.
  - *Alternatives Considered*: LocalStorage (rejected—cannot sync across two phones) or unauthenticated room codes (rejected—less secure and loses account permanence).
- **Decision 2: End-of-Day Direct Input + Quick Adjusters for Health Rings**
  - *Chosen Approach*: Every Health card supports a direct numerical input for end-of-day logging (essential for exact step counts and scale weight) alongside optional one-tap quick increments for water and sleep.
  - *Why*: Matches your workflow of entering the exact real number at the end of the day while keeping the circular progress indicator reactive and satisfying.
- **Decision 3: Three Macro Segments (`Skincare`, `Haircare`, `Bodycare`) with Dynamic Sub-Categories**
  - *Chosen Approach*: The `Skin` view presents three top-level interactive macro cards for Skincare, Haircare, and Bodycare, each containing user-customizable sub-categories (Cleanser, Moisturizer, Serum, etc.) and rich product cards with full purchase/date metadata.
  - *Why*: Keeps routine essentials neatly structured even when managing dozens of open and backup products across two people.

---

## 4. Technical Architecture & Data Strategy *(Technical Reference)*

### Architecture & Component Diagram

```
┌────────────────────────────────────────────────────────────────────────────┐
│                        DuoPulse Client Application                         │
│                                                                            │
│  ┌──────────────────────────────────────────────────────────────────────┐  │
│  │ Sticky Top Header                                                    │  │
│  │  ├── Partner Profile Switcher (Me ⇄ Girlfriend + 6-Digit Link Modal) │  │
│  │  ├── Pilled Segmented Navbar: [  Health  |   Skin   ]                │  │
│  │  └── Customize Goals / Sub-Categories Trigger                        │  │
│  └──────────────────┬───────────────────────────────────┬───────────────┘  │
│                     │                                   │                  │
│                     ▼                                   ▼                  │
│  ┌─────────────────────────────────────┐ ┌──────────────────────────────┐  │
│  │ Health Dashboard View               │ │ Skin & Care Inventory View   │  │
│  │  ├── Horizontal Date Scroller       │ │  ├── 3 Primary Segment Cards │  │
│  │  │   (Today + Past Days Selector)   │ │  │   • Skincare Card         │  │
│  │  ├── 4 Circular Ring Vitals Grid    │ │  │   • Haircare Card         │  │
│  │  │   • Weight Ring + 7d Trend       │ │  │   • Bodycare Card         │  │
│  │  │   • Steps Ring (EOD Number Input)│ │  ├── Sub-Category Filter Bar │  │
│  │  │   • Sleep Ring (Hours/Mins Input)│ │  │   (Cleanser, Serum, +Add) │  │
│  │  │   • Water Ring (ml/L + Quick Tap)│ │  ├── Editable Product Cards  │  │
│  │  └── Daily Entry & Goal Editor Sheet│ │  │   (Ordered, Opened, Exp,  │  │
│  └──────────────────┬──────────────────┘ │  │    Sale Name, Price Paid) │  │
│                     │                    │  └── Add/Edit Product Sheet  │  │
│                     │                    └──────────────┬───────────────┘  │
└─────────────────────┼───────────────────────────────────┼──────────────────┘
                      │     Real-Time onSnapshot Sync     │
                      ▼                                   ▼
┌────────────────────────────────────────────────────────────────────────────┐
│               Firebase Authentication & Cloud Firestore                    │
│                                                                            │
│  • /users/{uid}              (Profile, DisplayName, PartnerUid, Goals,     │
│                               Custom Sub-Categories)                       │
│  • /pairingCodes/{code}      (6-Digit Code -> Owner UID mapping for link)  │
│  • /healthLogs/{logId}       (OwnerUid, Date YYYY-MM-DD, Weight, Steps,    │
│                               SleepMinutes, WaterMl, UpdatedBy)            │
│  • /careProducts/{productId} (OwnerUid, MainSegment, SubCategory, Name,    │
│                               Brand, OrderedDate, OpenedDate, ExpiryDate,  │
│                               SaleInfo, PricePaid, Currency, Status)       │
└────────────────────────────────────────────────────────────────────────────┘
```

### Data Model & State

1. **User Profile (`/users/{uid}`)**:
   - Stores `uid`, `displayName`, `avatarColor`, `partnerUid` (nullable), `partnerName`, `healthGoals` (`targetWeight`, `weightUnit`, `stepsGoal`, `sleepGoalMinutes`, `waterGoalMl`), and `customSubCategories` mapped by segment (`skincare`, `haircare`, `bodycare`).
2. **Partner Pairing Code (`/pairingCodes/{code}`)**:
   - Maps a 6-digit alphanumeric/numeric code to `ownerUid` and `ownerName` so the partner can link accounts bidirectionally in a single atomic transaction.
3. **Daily Health Log (`/healthLogs/{uid}_{YYYY-MM-DD}`)**:
   - Deterministic document ID per user per date so end-of-day updates overwrite cleanly in real time. Tracks `weight`, `steps`, `sleepMinutes`, `waterMl`, `notes`, and `updatedAt`.
4. **Care Product Item (`/careProducts/{productId}`)**:
   - Tracks `ownerUid`, `segment` (`skincare` | `haircare` | `bodycare`), `subCategory` (e.g., `Cleanser`, `Moisturizer`), `name`, `brand`, `pricePaid` (number), `currency` (customizable symbol e.g. `₹`, `$`, `€`), `saleName` (e.g., `"Pink Friday 25% Off"`), `orderedDate`, `openedDate`, `expiryDate`, and `status` (`active` | `unopened` | `finished`).

### Interactive Component & State Mapping

- **Active Profile Context (`activeProfileUid`)**: Defaults to the signed-in user (`auth.currentUser.uid`). Toggling the header Profile Switcher switches `activeProfileUid` to `partnerUid`, immediately re-binding the Firestore `onSnapshot` listeners to stream the selected partner's Health logs, goals, and Skin/Hair/Body inventory in real time.
- **Health Circular Ring Interaction**: Clicking any of the 4 circular progress cards opens a focused bottom-sheet editor pre-filled with the selected date's value (or allows direct inline end-of-day number entry on the card), immediately recalculating the SVG `stroke-dashoffset` percentage and updating the 7-day mini sparkline.
- **Skin Category & Product Editing**: Selecting one of the 3 macro cards (`Skincare`, `Haircare`, `Bodycare`) filters the product grid and displays the sub-category bar (`All`, `Cleanser`, `Moisturizer`, etc. + `+ New Type`). Clicking `+ Add Product` or tapping an existing product card opens the Product Editor Sheet with date pickers for Ordered, Opened, and Expiry dates plus Price Paid and Sale details.
