# DuoPulse Landing Page Design System & Motion Tokens

A minimal, graphic-first mobile landing page built for **DuoPulse** (Apple Fitness meets Oura meets Linear).

---

## 🎨 Color Palette & Visual System

All colors are applied via inline gradients, CSS variables, and Tailwind utility classes.

| Token | Hex Value | Purpose |
| :--- | :--- | :--- |
| **Canvas Background** | `#07070A` | Deep, near-black neutral base |
| **Card Surface** | `#101016` (90% opacity) | Subtle glass blur surface with `border-white/[0.08]` |
| **Primary Accent Gradient** | `#FF5C8A` → `#FFB86B` | Rose to Amber (Partner 1, Primary CTAs) |
| **Secondary Partner Ring** | `#A78BFA` → `#38BDF8` | Violet to Sky (Partner 2, secondary indicators) |
| **Activity Ring: Steps** | `#FF5C8A` | Rose accent |
| **Activity Ring: Water** | `#38BDF8` | Crisp sky blue |
| **Activity Ring: Sleep** | `#34D399` | Calming mint green |
| **Ambient Radial Glow** | `#FF5C8A` (9%), `#A78BFA` (11%) | Drifting soft atmospheric backdrop |

### 🛠 Tweaking Colors
- **To change the primary CTA gradient**: Edit `from-[#FF5C8A] to-[#FFB86B]` in [`Hero.tsx`](file:///c:/Users/Admin/Desktop/DuoSync/src/components/landing/Hero.tsx) and [`StickyCTA.tsx`](file:///c:/Users/Admin/Desktop/DuoSync/src/components/landing/StickyCTA.tsx).
- **To change the partner ring colors**: Modify the SVG `<linearGradient id="roseAmberGrad">` and `<linearGradient id="violetSkyGrad">` in [`RingPair.tsx`](file:///c:/Users/Admin/Desktop/DuoSync/src/components/landing/RingPair.tsx).
- **To adjust background glow intensity**: In [`LandingPage.tsx`](file:///c:/Users/Admin/Desktop/DuoSync/src/components/landing/LandingPage.tsx), change `opacity-[0.09]` and `opacity-[0.11]` on the ambient glow divs.

---

## ⏱ Motion & Animation Tokens

Powered by Framer Motion (`motion/react`) running at 60fps on GPU transforms and opacities only.

| Animation | Duration | Easing / Curve | Description |
| :--- | :--- | :--- | :--- |
| **Page Load Stagger** | `700ms` | `[0.22, 1, 0.36, 1]` | Staggered 12px rise + fade with 60ms delay between elements |
| **Ring Draw Entrance** | `1.2s` | `[0.22, 1, 0.36, 1]` | SVG `strokeDashoffset` transition from full circumference |
| **Ring Idle Breathing** | `4.0s` loop | `[0.4, 0, 0.2, 1]` | Synchronized heartbeat pulse (`scale: [1, 1.025, 1]`) |
| **Traveling Dot** | `3.6s` loop | `easeInOut` | Connected pulse dot traveling between Partner 1 and Partner 2 |
| **Carousel Transition**| `300ms` | CSS `transition-all` | Active card scales to `1.0` (100% opacity), inactive scales to `0.92` (45% opacity) |
| **Scroll Parallax** | Dynamic | `0.18x` to `0.2x` speed | Smooth ambient glow displacement as user scrolls |
| **Button Tap Feedback**| Instant | `scale: 0.97` | Haptic micro-scale on tap/press |

### ♿ Accessibility & Reduced Motion
Every component uses `useReducedMotion()`. When a user enables "Reduce Motion" in their OS settings:
- Breathing and traveling pulse loops are disabled.
- Parallax background shifts are neutralised.
- Staggers and rises default to clean, non-disorienting crossfades.

---

## 📱 Component Architecture

```
src/components/landing/
├── LandingPage.tsx       # Main page container, ambient parallax glow, auth modal
├── Hero.tsx              # Minimal wordmark, light headline, RingPair, primary CTA
├── RingPair.tsx          # Dual overlapping SVG activity rings + traveling pulse dot
├── FeatureCarousel.tsx   # Scroll-snap 3-card showcase (Rings, Routine, Closet)
├── SyncSection.tsx       # "Two phones. One rhythm." scroll-linked silhouettes
├── StickyCTA.tsx         # Bottom bar appearing once Hero scrolls out
└── README.md             # This design system reference
```
