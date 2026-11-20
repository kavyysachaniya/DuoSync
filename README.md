# DuoSync — Coupled Health & Care Tracker

> A mobile-first, dark-themed tracker for couples to synchronize daily health vitals, coordinate skincare/haircare routines, and manage wardrobe fits in real time.

---

## 📱 Features

- **Health Dashboard**: Real-time dual circular progress rings for sleep, steps, water intake, and calories with 7-day trend metrics.
- **Care Routine (Skin / Hair / Body)**: Compact segment pill navigation, dynamic daily routine checklist with progress tracking, $2 \times 2$ product inventory grid, weekly schedule adherence indicators (`S M T W T F S`), and detailed product metadata sheets.
- **Wardrobe & Fits**: Personal and shared clothing catalog, outfit coordination, category filters, and photo uploads.
- **Partner Sync & Privacy**: Dual partner profiles with isolated personal routines, shared workspace synchronization, and custom product categories.
- **Zero Horizontal Overflow**: Fully verified mobile-first layout across viewports from $320\text{px}$ narrow devices to $1280\text{px}$ desktop.

---

## 🛠 Tech Stack

- **Frontend**: React 19, TypeScript, Vite, Tailwind CSS v4, Lucide Icons, Motion
- **Database**: Neon Serverless PostgreSQL (`@neondatabase/serverless`)
- **API & Server**: Express REST API (`/api/*`), JSON Web Tokens (`jsonwebtoken`), `bcryptjs`
- **Object Storage**: Supabase Storage / Cloudinary
- **Deployment**: Vercel Serverless Functions

---

## 🚀 Quick Start

### 1. Prerequisites
- **Node.js** v20+ recommended
- A free **[Neon PostgreSQL](https://neon.tech)** database

### 2. Installation
```bash
# Clone the repository
git clone https://github.com/kavyysachaniya/DuoSync.git
cd DuoSync

# Install dependencies
npm install
```

### 3. Environment Configuration
Copy the template and configure your connection strings:
```bash
cp .env.example .env
```
Key environment variables:
- `DATABASE_URL`: Your Neon PostgreSQL pooled connection string.
- `JWT_SECRET`: Random 32+ character string for token signing.
- `ADMIN_SECRET`: Optional secret for administrative reset endpoint.

### 4. Database Setup & Initialization
```bash
# Initialize PostgreSQL tables and default schema
npm run db:init
```

### 5. Run the Application
```bash
# Start local development server (port 3000)
npm run dev

# Run TypeScript type check
npm run lint

# Build for production
npm run build
```

---

## 📚 Documentation Index

Detailed documentation and guides are organized in the [`docs/`](docs/) directory:

- ⚙️ **[Environment Setup Guide](docs/ENV_SETUP.md)**: Full guide for Neon DB, JWT generation, and Supabase storage.
- 🚀 **[Vercel Deployment Guide](docs/VERCEL_DEPLOYMENT_GUIDE.md)**: Deploying DuoSync serverless on Vercel.
- 🔒 **[Security Specifications](docs/SECURITY_SPEC.md)**: Workspace authorization, JWT verification, and endpoint access controls.
- 📱 **[Mobile UI/UX Audit](docs/UI_AUDIT.md)**: Mobile audit matrix, viewport benchmarks, and layout standards.
- 📸 **[Screenshots & Visuals](docs/screenshots/)**: Device screenshots across all verified viewports.

---

## 📁 Project Structure

```
DuoSync/
├── api/                    # Serverless API route handlers
├── docs/                   # Documentation, setup guides & audit reports
│   ├── audit/              # Automated verification matrices
│   ├── screenshots/        # Viewport test captures
│   ├── ENV_SETUP.md
│   ├── SECURITY_SPEC.md
│   ├── UI_AUDIT.md
│   └── VERCEL_DEPLOYMENT_GUIDE.md
├── neon/                   # Neon PostgreSQL schemas and SQL migrations
├── public/                 # Static assets and icons
├── scripts/                # Database initialization and audit scripts
├── server/                 # Express backend middleware and routes
├── src/                    # React frontend application
│   ├── components/         # Dashboard views, modals, and navigation
│   ├── App.tsx             # Root application and routing
│   ├── index.css           # Global Tailwind CSS styles
│   ├── main.tsx            # React application entry point
│   ├── supabase.ts         # Supabase client and types
│   └── types.ts            # Shared domain interfaces and types
├── .env.example            # Environment variables template
├── package.json            # Node.js dependencies and scripts
├── tsconfig.json           # TypeScript configuration
├── vercel.json             # Vercel deployment routing
└── vite.config.ts          # Vite build configuration
```

---

## 📄 License
Private project. All rights reserved.
