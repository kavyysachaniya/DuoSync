# DuoSync Landing Page Design System & Motion Tokens

A minimal, graphic-first mobile landing page built for **DuoSync** (Apple Fitness meets Oura meets Linear).

---

## 🎨 Strict Color Palette & Theme Tokens

All colors in the landing experience are strictly bound to `theme.ts`. No arbitrary hex values, green, teal, mint, pure red, or off-palette blues are permitted.

| Token | Hex / Value | Usage & Scope |
| :--- | :--- | :--- |
| `--bg` | `#07070A` | Deep, near-black neutral canvas background |
| `--surface` | `#0E0E13` | Cards, sticky containers, modal sheets |
| `--border` | `rgba(255, 255, 255, 0.08)` | 1px clean hairline borders |
| `--text` | `#F5F5F7` | Primary geometric sans typography |
| `--text-dim` | `rgba(245, 245, 247, 0.60)` | Subtitles, helper text, and secondary details |
| **Partner A (Warm)** | `#FF5C8A` → `#FFB86B` | Rose to Amber (Partner A rings, primary buttons, Hero ring) |
| **Partner B (Cool)** | `#5CB8FF` → `#8B7CFF` | Sky to Violet (Partner B rings, secondary accents) |

### Concentric Rings (Chapter 1)
Each concentric ring uses its base color transitioning to a lighter tint of itself:
- **Steps**: Rose (`#FF5C8A` → `#FFA6BF`)
- **Weight**: Amber (`#FFB86B` → `#FFD7A8`)
- **Water**: Sky (`#5CB8FF` → `#A3D7FF`)
- **Sleep**: Violet (`#8B7CFF` → `#BCB3FF`)

### Care Routine (Chapter 2)
Checkmarks cycle in order through the four palette colors: Rose, Amber, Sky, Violet. Rest days render as a dim dot at 15% white.

### Digital Closet (Chapter 3)
Outfit cards have a `--surface` (`#0E0E13`) body with 1px gradient borders:
- Card 1: Partner A gradient (Rose → Amber)
- Card 2: Partner B gradient (Sky → Violet)
- Card 3: Blend (Rose → Sky)

---

## 📜 Vertical Scroll-Reveal Mechanics

Replaces the horizontal carousel with vertical-only narrative chapters:
- **Vertical Scrub**: Each chapter is enclosed in a `~220vh` wrapper containing a sticky `top-0 h-[100svh]` viewport container.
- **Scroll Linking**: Driven by `useScroll({ target, offset: ['start start', 'end end'] })` and `useTransform`.
  - Chapter 1: 4 concentric rings draw 0% → 100% target; center number counts up in real-time.
  - Chapter 2: 7-day routine dots/checks pop in sequentially as the user scrubs.
  - Chapter 3: 3 outfit tiles fan out from a compact stack and settle into view.
- **Chapter Crossfade**: Exit scales to `0.96` and fades to `0`, while the incoming chapter rises `40px` and fades in.
- **Vertical Progress Indicator**: A sleek right-edge progress indicator (`ScrollProgress.tsx`) highlights the active chapter and allows smooth-scroll tapping.
- **Ambient Glow Shifts**: Dynamic radial background glows subtly crossfade dominant colors over `~800ms` as the user navigates between chapters.

---

## ⏱ Motion & Animation Tokens

Powered by Framer Motion (`motion/react`) running on GPU transforms and opacities only.

| Animation | Duration | Easing / Curve | Description |
| :--- | :--- | :--- | :--- |
| **Page Load Stagger** | `700ms` | `[0.22, 1, 0.36, 1]` | Staggered 12px rise + fade with 60ms delay between elements |
| **Ring Draw Entrance** | `1.2s` | `[0.22, 1, 0.36, 1]` | SVG `strokeDashoffset` transition from full circumference |
| **Ring Idle Breathing** | `4.0s` loop | `[0.4, 0, 0.2, 1]` | Synchronized heartbeat pulse (`scale: [1, 1.025, 1]`) |
| **Traveling Dot** | `3.6s` loop | `easeInOut` | Connected pulse dot traveling between Partner 1 and Partner 2 |
| **Ambient Glow Crossfade** | `800ms` | `easeInOut` | Seamless ambient background transition across chapter themes |
| **Button Tap Feedback** | Instant | `scale: 0.97` | Haptic micro-scale on tap/press |

### ♿ Accessibility & Reduced Motion
Every component uses `useReducedMotion()`. When a user enables "Reduce Motion":
- Continuous pulse and breathing loops are disabled.
- Parallax ambient shifts are frozen.
- Rings, checks, and cards immediately display their final settled states.

---

## 📱 Component Architecture

```
src/components/landing/
├── LandingPage.tsx       # Main page container, dynamic ambient crossfade, auth modal
├── theme.ts              # Strict design system tokens and color definitions
├── Hero.tsx              # Wordmark, light headline, RingPair, primary CTA
├── RingPair.tsx          # Dual overlapping SVG activity rings + traveling pulse dot
├── FeatureChapters.tsx   # ~220vh sticky vertical chapter orchestrator
├── ChapterRings.tsx      # Chapter 1: 4 concentric scrubbed SVG rings + center counter
├── ChapterRoutine.tsx    # Chapter 2: 7-day sequential checkmark grid
├── ChapterFits.tsx       # Chapter 3: Fanning outfit cards with gradient borders
├── ScrollProgress.tsx    # Thin right-edge vertical progress indicator
├── SyncSection.tsx       # "Two phones. One rhythm." scroll-linked silhouettes
├── StickyCTA.tsx         # Bottom bar appearing once Hero scrolls out
└── README.md             # This design system reference
```
