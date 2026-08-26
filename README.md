<p align="center">
  <img src="https://img.shields.io/badge/SeaSon-Ship%20Management%20System-7c3aed?style=for-the-badge&logo=data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAyNCAyNCI+PHBhdGggZD0iTTIgMjAgTDEyIDQgTDIyIDIwIiBzdHJva2U9IndoaXRlIiBmaWxsPSJub25lIiBzdHJva2Utd2lkdGg9IjIiLz48L3N2Zz4=" />
</p>

<h1 align="center">🌊 SeaSon — The Son of Sea</h1>

<p align="center">
  <strong>Enterprise Maritime Fleet Management Platform</strong><br/>
  Real-time GPS tracking · Auto Preventive Maintenance · Smart Inventory · Compliance Monitoring
</p>

---

## Tech Stack

| Layer | Technology |
|-------|------------|
| **Backend** | NestJS 10, TypeScript, Prisma ORM, PostgreSQL |
| **Scheduler** | `@nestjs/schedule` (Cron Jobs) |
| **Frontend** | Next.js 14 (App Router), React 18, TypeScript |
| **Styling** | Tailwind CSS (Purple theme) |
| **Map** | Leaflet + react-leaflet (dynamic import, SSR-safe) |
| **State** | Zustand |
| **HTTP** | Axios |

---

## Prerequisites

- **Node.js** v18+ (v22 recommended)
- **PostgreSQL** 14+ running locally
- **npm** 9+

---

## Project Structure

```
SeaSon/
├── backend/                  # NestJS API
│   ├── prisma/
│   │   └── schema.prisma     # Full DB schema
│   └── src/
│       ├── main.ts
│       ├── app.module.ts
│       ├── prisma/           # PrismaService (global)
│       ├── vessels/          # Fleet CRUD
│       ├── telemetry/        # GPS data + seeder
│       ├── work-orders/      # WO management
│       ├── spareparts/       # Inventory + auto-PR
│       ├── compliance/       # Certificates + alerts
│       ├── cron/             # 🔧 Automation engine
│       └── seed/             # Initial DB data
│
└── frontend/                 # Next.js 14 App
    ├── app/
    │   ├── page.tsx          # Landing portal
    │   ├── layout.tsx        # Root layout + sidebar
    │   ├── dashboard/        # Executive dashboard
    │   ├── fleet/            # Live GPS map
    │   ├── work-orders/      # WO management
    │   ├── inventory/        # Spareparts + PRs
    │   └── compliance/       # Certificates + alerts
    ├── components/
    │   └── Sidebar.tsx
    ├── store/                # Zustand stores
    │   ├── telemetry.store.ts
    │   └── workorders.store.ts
    └── lib/
        └── api.ts            # Typed Axios API layer
```

---

## 🚀 Quick Start

### Step 1 — Setup PostgreSQL

Create the database:
```sql
CREATE DATABASE season_db;
```

### Step 2 — Backend Setup

```bash
cd backend

# Copy env file and set your DB credentials
copy .env.example .env
# Edit .env: DATABASE_URL="postgresql://USER:PASSWORD@localhost:5432/season_db"

# Install dependencies (already done)
npm install

# Generate Prisma client & run migrations
npm run prisma:generate
npm run prisma:migrate

# Seed the database (3 vessels, spareparts, certificates, WOs)
npm run seed

# Start development server
npm run start:dev
```
Backend runs at: **http://localhost:4000/api**

### Step 3 — Frontend Setup

```bash
cd frontend

# Install dependencies (already done)
npm install

# Start dev server
npm run dev
```
Frontend runs at: **http://localhost:3000**

---

## 🗺️ Pages & Features

| Route | Page | Features |
|-------|------|----------|
| `/` | Landing Portal | Purple gradient gateway |
| `/dashboard` | Command Bridge | KPI cards, alerts feed, WO stats |
| `/fleet` | Fleet Tracker | Live Leaflet map, vessel sidebar, 30s polling |
| `/work-orders` | Work Orders | Dropdown filter, status update, sparepart deduction |
| `/inventory` | Inventory & Parts | Stock bars, low-stock alerts, PR management |
| `/compliance` | Compliance Tracker | Certificate countdown, 30-day expiry alerts |

---

## ⚙️ Cron Jobs (Automation Engine)

| Schedule | Job | Description |
|----------|-----|-------------|
| Every **1 min** | GPS Telemetry Seeder | Seeds dummy lat/lng + increments run_hours |
| Every **1 hour** | PM Engine | Checks run_hours vs PM thresholds → auto-creates WO |
| Daily **08:00** | Cert Expiry Check | Finds certs expiring ≤30 days → logs Alert |
| Every **6 hrs** | Low Stock Check | Logs vessels with stock below minimum |

---

## 🔌 API Endpoints

### Vessels
- `GET /api/vessels` — List all vessels
- `GET /api/vessels/stats` — Fleet statistics
- `GET /api/vessels/:id` — Vessel detail

### Telemetry
- `GET /api/telemetry/live` — Current GPS of all vessels ✨
- `GET /api/telemetry/history/:vesselId` — GPS history

### Work Orders
- `GET /api/work-orders?status=PENDING` — Filtered list (dropdown)
- `POST /api/work-orders` — Create WO
- `PATCH /api/work-orders/:id/status` — Update status + deduct spareparts

### Spareparts
- `GET /api/spareparts` — Inventory list
- `GET /api/spareparts/low-stock` — Below minimum items
- `POST /api/spareparts/:id/deduct` — Deduct stock → auto-PR if low ⚡
- `GET /api/spareparts/purchase-requests` — All PRs
- `PATCH /api/spareparts/purchase-requests/:id/status` — Update PR

### Compliance
- `GET /api/compliance/certificates` — All certificates
- `GET /api/compliance/alerts` — System alerts
- `GET /api/compliance/stats` — Expiry breakdown
- `PATCH /api/compliance/alerts/:id/read` — Mark alert read

---

## 🗄️ Database Models

```
Vessel ──┬── Telemetry
         ├── MaintenanceSchedule ──── WorkOrder
         ├── WorkOrder ─────────────── WorkOrderSparepart ── Sparepart ── PurchaseRequest
         └── VesselCertificate

Alert (system log)
```

---

## Design System

- **Base color**: Deep purple `#0a0514` background
- **Brand**: Violet `#7c3aed` / Purple `#4c1d95`
- **Accent**: Ocean blue `#0ea5e9`
- **Cards**: Glassmorphism with `backdrop-filter: blur(16px)`
- **Status filters**: Dropdown selectors only (no toggle buttons)
- **Font**: Inter (Google Fonts)
- **Animations**: Fade-in on page load, skeleton loading states

---

## Seed Data Summary

After running `npm run seed`:

| Entity | Count | Details |
|--------|-------|---------|
| Vessels | 3 | MV Majestic Dawn, MV Ocean Pioneer, MT Horizon Star |
| Maintenance Schedules | 7 | Various PM intervals (250–1000 hrs) |
| Spareparts | 7 | With varied stock levels (some pre-low) |
| Certificates | 8 | Mix of valid/expiring/expired |
| Work Orders | 4 | Mix of PENDING/IN_PROGRESS/COMPLETED |
| Alerts | 3 | Pre-seeded warnings |
