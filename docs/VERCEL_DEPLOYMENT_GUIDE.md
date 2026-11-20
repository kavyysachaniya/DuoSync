# DuoSync — Vercel Deployment & Mobile PWA Setup Guide

DuoSync is pre-configured with `/vercel.json` and `/public/manifest.json` so you can deploy it to **Vercel** in under 2 minutes and install it on both your phones as a native-like mobile app.

---

## Step 1: Deploy to Vercel

### Option A — Deploy via GitHub (Recommended for Automatic Updates)
1. Push this project repository to your **GitHub** account.
2. Go to [https://vercel.com/new](https://vercel.com/new) and sign in.
3. Click **Import** next to your DuoSync repository.
4. Confirm the detected settings (Vercel automatically reads `vercel.json`):
   - **Framework Preset**: `Vite`
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`
5. Click **Deploy**. Your live URL (e.g., `https://duosync18.vercel.app`) will be ready in ~45 seconds.

### Option B — Deploy Directly from Terminal (Vercel CLI)
Run the following command in the project root:
```bash
npx vercel --prod
```

---

## Step 2: Authorize Your Vercel Domain in Firebase (`duosync-35b75`)

Because DuoSync is 100% login-based with password authentication and JWTs:

1. Open [Firebase Console — `duosync-35b75` Authentication Settings](https://console.firebase.google.com/project/duosync-35b75/authentication/settings).
2. Under **Authorized domains**, click **Add domain** and paste your Vercel domain (for example: `your-app-name.vercel.app`).
3. *(Optional for Google Fit direct sync)*: In [Google Cloud Console → APIs & Services → Library (`duosync-35b75`)](https://console.cloud.google.com/apis/library?project=duosync-35b75), enable the **Fitness API** if you want one-tap Google Fit REST API pull in addition to manual/quick sync.

---

## Step 3: Install on Your Phones (Mobile-First Home Screen App)

- **On iPhone (iOS Safari)**: Open your `.vercel.app` link in Safari → tap the **Share** button → tap **Add to Home Screen**.
- **On Android (Chrome)**: Open your `.vercel.app` link in Chrome → tap the **3-dot menu** → tap **Install app** or **Add to Home screen**.
