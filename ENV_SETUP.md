# DuoSync — Environment Variables & Production Setup Guide

Welcome to the comprehensive environment setup guide for **DuoSync** (also deployed as **DuoPulse**). This guide walks you through every configuration variable, where to get it, how to set it up locally and on Vercel, and how to verify that each service works properly.

---

## Table of Contents

1. [Quick Start & Overview](#1-quick-start--overview)
2. [Complete Environment Variable Directory](#2-complete-environment-variable-directory)
   - [DATABASE_URL (Mandatory)](#database_url-mandatory)
   - [JWT_SECRET (Mandatory)](#jwt_secret-mandatory)
   - [ADMIN_SECRET (Optional / Recommended)](#admin_secret-optional--recommended)
   - [SUPABASE_URL & SUPABASE_SERVICE_ROLE_KEY (Optional)](#supabase_url--supabase_service_role_key-optional)
   - [CLOUDINARY_CLOUD_NAME & CLOUDINARY_UPLOAD_PRESET (Optional)](#cloudinary_cloud_name--cloudinary_upload_preset-optional)
3. [Step-by-Step Service Setup](#3-step-by-step-service-setup)
   - [Step A: Neon Serverless PostgreSQL](#step-a-neon-serverless-postgresql)
   - [Step B: Local Environment Configuration (.env)](#step-b-local-environment-configuration-env)
   - [Step C: Vercel Production Deployment Environment Variables](#step-c-vercel-production-deployment-environment-variables)
4. [Verification & Health Checks](#4-verification--health-checks)
5. [Troubleshooting & Common Pitfalls](#5-troubleshooting--common-pitfalls)

---

## 1. Quick Start & Overview

DuoSync uses a unified serverless architecture powered by:
- **Neon Serverless PostgreSQL**: Stores users, workspaces, health logs, skincare routines, and wardrobe fits.
- **Express Serverless Handler (`api/index.ts`)**: Secure backend mounted as a single Vercel function routing all `/api/*` endpoints.
- **Persistent Password Authentication**: Uses `bcryptjs` and long-lived JWTs saved in browser storage (`localStorage`) so partners stay logged in without repeated prompts.
- **Cloud Photo Upload Adapter**: Supports direct CDN uploads via Supabase Storage or Cloudinary, with automatic fallback so wardrobe additions never stall.

### Environment Security Rules:
- **Server Secrets**: `DATABASE_URL`, `JWT_SECRET`, `ADMIN_SECRET`, and `SUPABASE_SERVICE_ROLE_KEY` must **NEVER** have the `VITE_` prefix. This prevents Vite from compiling them into public client-side JavaScript bundles.
- **Git Protection**: Real credentials must never be committed. `.env` and `.env.local` are strictly ignored by `.gitignore`. Only `.env.example` is committed to the repository.

---

## 2. Complete Environment Variable Directory

### `DATABASE_URL` (Mandatory)
| Property | Detail |
| :--- | :--- |
| **Status** | **MANDATORY** (Local & Production) |
| **Service** | Neon Serverless PostgreSQL |
| **Used In** | `server/db.ts`, `scripts/init-neon-db.ts`, `scripts/reset-neon-db.ts` |
| **Controls** | Connection pool for all queries, mutations, auth checks, and partner sync heartbeats. |
| **Where to Configure** | Local: `.env` \| Production: Vercel Project Settings > Environment Variables |
| **Format** | `postgresql://[USER]:[PASSWORD]@[ENDPOINT].c-[REGION].aws.neon.tech/[DBNAME]?sslmode=require&channel_binding=require` |
| **Where to Obtain** | Neon Console (`https://console.neon.tech`) > Select Project > **Dashboard** > **Connection Details** > Select **Pooled connection** and **PostgreSQL**. Copy the connection string. |
| **Common Mistake** | Missing `?sslmode=require` or using an unpooled connection string in high-frequency serverless environments. |

---

### `JWT_SECRET` (Mandatory)
| Property | Detail |
| :--- | :--- |
| **Status** | **MANDATORY** for Production (Recommended for Local) |
| **Service** | Authentication Token Signing (`jsonwebtoken`) |
| **Used In** | `server/auth.ts`, `server/db.ts` |
| **Controls** | Cryptographic signature of session tokens. Tokens keep users permanently authenticated across device restarts and browser refreshes until explicit logout. |
| **Where to Configure** | Local: `.env` \| Production: Vercel Project Settings > Environment Variables |
| **Format** | A random string of at least 32 alphanumeric characters. |
| **Example** | `duosync_prod_jwt_9f83a84b12c7e098d1a3b4e6729` |
| **How to Generate** | Run in your terminal: `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"` |
| **Common Mistake** | Using a short or easily guessable string in production. Changing this in production will invalidate existing logged-in sessions, requiring users to log in once again. |

---

### `ADMIN_SECRET` (Optional / Recommended)
| Property | Detail |
| :--- | :--- |
| **Status** | **OPTIONAL** (Defaults to `'duosync-reset-2026'` if not set) |
| **Service** | Administrative Database Maintenance |
| **Used In** | `server/admin.ts` |
| **Controls** | Protects the `POST /api/admin/reset` endpoint, which performs a complete cascading wipe of all user and workspace data for fresh setup. |
| **Where to Configure** | Local: `.env` \| Production: Vercel Project Settings > Environment Variables |
| **Format** | Alphanumeric secret token. |
| **Where to Obtain** | Create any secure password/passphrase of your choice. |
| **Common Mistake** | Leaving this unset or publicly exposing it. |

---

### `SUPABASE_URL` & `SUPABASE_SERVICE_ROLE_KEY` (Optional)
| Property | Detail |
| :--- | :--- |
| **Status** | **OPTIONAL** (Only needed if using Supabase Storage for wardrobe photos) |
| **Service** | Supabase Storage (Bucket: `wardrobe-images`) |
| **Used In** | `server/upload.ts` |
| **Controls** | Direct CDN photo storage for outfits and clothing items. If omitted, the app automatically falls back to Cloudinary or optimized data URLs so image uploads never fail. |
| **Where to Configure** | Local: `.env` \| Production: Vercel Project Settings > Environment Variables |
| **Format** | `SUPABASE_URL`: `https://[project-ref].supabase.co`<br>`SUPABASE_SERVICE_ROLE_KEY`: `eyJhbGciOi...` |
| **Where to Obtain** | Supabase Dashboard > Project Settings > **API** > Copy **Project URL** and `service_role` secret key. |
| **Common Mistake** | Using the client-side `anon` public key instead of the `service_role` key on the server, which can cause permission errors if bucket RLS is strict. |

---

### `CLOUDINARY_CLOUD_NAME` & `CLOUDINARY_UPLOAD_PRESET` (Optional)
| Property | Detail |
| :--- | :--- |
| **Status** | **OPTIONAL** (Alternative photo storage provider) |
| **Service** | Cloudinary CDN |
| **Used In** | `server/upload.ts` |
| **Controls** | Alternative CDN hosting for wardrobe clothing images. |
| **Where to Configure** | Local: `.env` \| Production: Vercel Project Settings > Environment Variables |
| **Where to Obtain** | Cloudinary Dashboard > Settings > Upload > Add unsigned upload preset. |

---

## 3. Step-by-Step Service Setup

### Step A: Neon Serverless PostgreSQL

1. **Sign in or Create an Account**:
   - Go to [https://neon.tech](https://neon.tech) and log in.
2. **Create a Project**:
   - Project Name: `DuoSync` (or choose your existing project).
   - Region: Choose the region nearest to your users (e.g. `US East (Ohio) us-east-2` or `AWS Frankfurt eu-central-1`).
   - PostgreSQL version: 16 (default).
3. **Copy the Connection String**:
   - In the Project Dashboard, look for **Connection Details**.
   - Check the **Pooled connection** checkbox (recommended for serverless).
   - Copy the string format `postgresql://neondb_owner:....@ep-....c-8.aws.neon.tech/neondb?sslmode=require`.
4. **Apply Schema Migrations**:
   - The DuoSync schema contains 9 tables (`users`, `workspaces`, `workspace_members`, `pairing_codes`, `health_logs`, `care_products`, `routine_completions`, `wardrobe_items`, `outfits`).
   - Run in your local terminal:
     ```bash
     npm run db:init
     ```
   - This executes `scripts/init-neon-db.ts` and applies all tables, primary keys, foreign keys, and indexes idempotently.

---

### Step B: Local Environment Configuration (`.env`)

1. In the project root folder `c:\Users\Admin\Desktop\DuoSync`, ensure a `.env` file exists.
2. Populate `.env` with your credentials:
   ```env
   # ==============================================================================
   # DuoSync Local Environment Configuration
   # ==============================================================================

   # 1. Neon PostgreSQL Database Connection (Replace with your actual Neon pooled string)
   DATABASE_URL="postgresql://neondb_owner:YOUR_PASSWORD@ep-YOUR-PROJECT.us-east-2.aws.neon.tech/neondb?sslmode=require&channel_binding=require"

   # 2. JWT Secret for Auth Token Hashing
   JWT_SECRET="duosync-secure-local-jwt-token-key-2026-xyz"

   # 3. Administrative Reset Key (Optional)
   ADMIN_SECRET="duosync-reset-2026"

   # 4. Optional Cloud Photo Storage
   # SUPABASE_URL="https://your-project.supabase.co"
   # SUPABASE_SERVICE_ROLE_KEY="your-service-role-key"
   ```
3. Test local startup:
   ```bash
   npm run dev
   ```
4. Open `http://localhost:3000/api` in your browser. You should see:
   ```json
   {
     "app": "DuoSync API",
     "status": "online",
     "version": "2.0.0",
     "backend": "Neon PostgreSQL"
   }
   ```

---

### Step C: Vercel Production Deployment Environment Variables

To fix HTTP 500 errors and ensure production functions smoothly on Vercel:

1. Open your Vercel Dashboard at [https://vercel.com](https://vercel.com).
2. Select your DuoSync project (`duopulse18` or `DuoSync`).
3. Click on the **Settings** tab at the top.
4. In the left navigation, click **Environment Variables**.
5. Add the following variables:

| Key | Value | Environments |
| :--- | :--- | :--- |
| `DATABASE_URL` | Your Neon pooled connection string | **Production**, **Preview**, **Development** |
| `JWT_SECRET` | A secure 32+ character random secret string | **Production**, **Preview**, **Development** |
| `ADMIN_SECRET` | Your custom admin reset secret | **Production**, **Preview**, **Development** |

> [!IMPORTANT]
> Whenever you add or change an environment variable in Vercel, you **MUST trigger a Redeployment** for the serverless functions to pick up the new values.
> 
> Go to **Deployments** > Click the three dots `...` on the latest deployment > Click **Redeploy** (ensure "Use existing Build Cache" is unchecked if making configuration changes).

---

## 4. Verification & Health Checks

Once deployed or running locally, verify your setup using these direct endpoints:

### 1. API Status Endpoint
- **URL**: `GET https://duopulse18.vercel.app/api` (or `http://localhost:3000/api`)
- **Expected Status**: `200 OK`
- **Expected Body**:
  ```json
  {
    "app": "DuoSync API",
    "status": "online",
    "version": "2.0.0",
    "backend": "Neon PostgreSQL",
    "timestamp": "2026-11-19T12:00:00.000Z"
  }
  ```

### 2. Database Health & Table Counts
- **URL**: `GET https://duopulse18.vercel.app/api/admin/health` (or `http://localhost:3000/api/admin/health`)
- **Expected Status**: `200 OK`
- **Expected Body**:
  ```json
  {
    "status": "healthy",
    "database": "neondb",
    "serverTime": "2026-11-19T12:00:00.000Z",
    "counts": {
      "users": 0,
      "workspaces": 0
    }
  }
  ```
  If `counts.users` and `counts.workspaces` return numbers without errors, Neon PostgreSQL is connected and operational.

### 3. Authentication Test
- Open `https://duopulse18.vercel.app`.
- Click **Need an account? Sign Up**.
- Enter your email and password.
- You will be immediately routed to the DuoSync dashboard and your session will persist across page refreshes.

---

## 5. Troubleshooting & Common Pitfalls

### Issue 1: HTTP 500 `FUNCTION_INVOCATION_FAILED` on Vercel
- **Root Cause 1**: `DATABASE_URL` was not saved in Vercel Project Settings > Environment Variables, causing the database connection to throw.
  - **Solution**: Add `DATABASE_URL` in Vercel Settings and redeploy.
- **Root Cause 2**: Unhandled routing or missing `.js` extensions in ESM server files.
  - **Solution**: Already resolved in the current architecture. All modular routes are located in `server/` with explicit `.js` imports, and `api/index.ts` is the single unified serverless entrypoint.

### Issue 2: `Cannot find module './auth' or './db'`
- **Root Cause**: Node.js ESM (`"type": "module"` in `package.json`) requires explicit file extensions when importing relative modules.
  - **Solution**: All server-side imports use `.js` extensions (e.g. `import { getDb } from './db.js';`).

### Issue 3: Session Prompts for Login on Every Page Refresh
- **Root Cause**: Auth token was not persisted in `localStorage` or `getMe()` failed.
  - **Solution**: DuoSync automatically stores the long-lived JWT in `localStorage` under `duosync_auth_token`. Upon refresh, `App.tsx` calls `GET /api/auth/me` to instantly restore the session.

### Issue 4: Partner Mutations Don't Update Automatically
- **Root Cause**: Network offline or tab sleeping.
  - **Solution**: DuoSync features a background heartbeat poll every 3 seconds (`GET /api/sync/poll`). It also attaches listeners to `visibilitychange` and `focus`, fetching fresh updates the moment a partner opens or switches back to the app.
