# Gonok (গণক) — Offline-First Accounting ERP

A full-featured, offline-first accounting and business management system built for Bangladeshi small businesses. Works without internet, syncs across devices, and supports Bangla + English.

![Angular](https://img.shields.io/badge/Angular-21-red) ![Node](https://img.shields.io/badge/Node.js-20+-green) ![PouchDB](https://img.shields.io/badge/PouchDB-Offline--First-blue) ![Docker](https://img.shields.io/badge/Docker-Compose-2496ED) ![License](https://img.shields.io/badge/License-MIT-yellow)

---

## The Actual Full Stack

Not just "frontend + backend" — here's every layer of the production system:

| Layer | Technology | Status | Details |
|-------|-----------|--------|---------|
| **Frontend** | Angular 21 (2 apps) | Done | Main app (SPA + PWA) + Storefront micro-frontend at `/shop/` |
| **Database** | PostgreSQL 16 + CouchDB 3 | Done | PostgreSQL for auth, CouchDB for offline-sync business data |
| **Server** | Express.js + Node 20 | Done | REST API with TypeORM, JWT auth, phone+OTP login |
| **Networking** | Nginx + Caddy | Done | Nginx reverse proxy for routing, Caddy for automatic HTTPS |
| **Cloud Infrastructure** | AWS EC2 + Terraform | Done | t3.small in ap-south-1, IaC with `terraform/main.tf` |
| **CI/CD** | GitHub Actions | Done | Auto-deploy on push to main via SSH |
| **Security** | Helmet + CORS + Rate Limiting | Done | CSP headers, HSTS, auth rate limiting, input sanitization |
| **Containers** | Docker Compose (5 services) | Done | Caddy, Nginx/Web, API, PostgreSQL, CouchDB |
| **CDN** | — | Planned | Cloudflare (needs custom domain) |
| **Backup** | Automated daily cron | Done | pg_dump + CouchDB export, 7 daily + 4 weekly retention |

---

## Production Architecture

```
Internet
  │
  ▼
┌─────────────────────────────────────────────────────┐
│  Caddy (HTTPS via Let's Encrypt)                    │
│  - Auto-TLS for domain                              │
│  - HTTP → HTTPS redirect                            │
│  - Reverse proxy → nginx                            │
└─────────────┬───────────────────────────────────────┘
              ▼
┌─────────────────────────────────────────────────────┐
│  Nginx (web container, port 80 internal)            │
│  ┌──────────────┐  ┌──────────────┐                 │
│  │ /             │  │ /shop/*      │                 │
│  │ Main App      │  │ Storefront   │                 │
│  │ (Angular SPA) │  │ (Angular SPA)│                 │
│  └──────────────┘  └──────────────┘                 │
│  /api/*  → proxy to api:3333                        │
│  /couchdb/* → proxy to couchdb:5984                 │
└─────────────┬──────────────┬────────────────────────┘
              ▼              ▼
┌──────────────────┐  ┌──────────────┐
│  Express API     │  │  CouchDB     │
│  (port 3333)     │  │  (port 5984) │
│  - Auth (JWT)    │  │  - Per-user  │
│  - Storefront API│  │    databases │
│  - TypeORM       │  │  - PouchDB   │
└────────┬─────────┘  │    sync      │
         ▼            └──────────────┘
┌──────────────────┐
│  PostgreSQL      │
│  (port 5432)     │
│  - Users         │
│  - Businesses    │
│  - Business_users│
└──────────────────┘
```

---

## Infrastructure Deep Dive

### Frontend

Two independent Angular 21 apps sharing `@org/shared-types`:

| App | Route | Purpose | Stack |
|-----|-------|---------|-------|
| **Main App** | `/` | Full ERP — login required | Angular 21, @ngrx/signals, PouchDB, SCSS, PWA |
| **Storefront** | `/shop/{slug}` | Public product catalog — no auth | Angular 21, plain signals, HttpClient |

- **Standalone components** with new control flow (`@if`, `@for`, `@empty`)
- **Template-driven forms** with `[(ngModel)]`
- **@ngx-translate** for i18n (English + Bangla)
- **Service Worker** (PWA) with `/shop/**` excluded from `navigationUrls` to prevent interception

### Database

| Database | Purpose | Data Stored |
|----------|---------|-------------|
| **PostgreSQL 16** | Auth & tenancy | Users, businesses, business_users, roles |
| **CouchDB 3** | Business data (sync) | Products, parties, transactions, expenses, etc. |
| **PouchDB** (browser) | Offline storage | Mirror of CouchDB — works without internet |

- Per-user CouchDB databases: `gonok-{userUuid}`
- Document IDs: `{table_type}::{uuid}` (e.g., `product::abc-123`)
- Bidirectional live sync: PouchDB ↔ CouchDB
- 39 entity types (products, transactions, expenses, deliveries, CRM, etc.)

### Server (API)

Express.js REST API at `/api/v1`:

| Route Group | Auth | Endpoints |
|-------------|------|-----------|
| `/auth/*` | Public | register, login, verify-otp, refresh-token, logout |
| `/storefront/:slug/*` | Public | business info, products, categories |
| `/businesses/*` | JWT | CRUD businesses, user management |
| `/sync/credentials` | JWT | CouchDB sync credentials |

- **TypeORM** with PostgreSQL for relational data
- **nano** v11 for CouchDB reads (storefront API)
- **JWT** with access + refresh tokens
- **OTP-based auth** (dev OTP: `123456`)

### Networking

```
Client → Caddy (443/HTTPS) → Nginx (80/HTTP) → App/API/CouchDB
```

| Component | Role | Config File |
|-----------|------|-------------|
| **Caddy** | HTTPS termination, auto Let's Encrypt TLS | `Caddyfile` |
| **Nginx** | Static file serving, reverse proxy routing | `apps/web/nginx.conf` |

Nginx routes:
- `/` → Main Angular app (`index.html`)
- `/shop/*` → Storefront Angular app
- `/api/*` → Express API (port 3333)
- `/couchdb/*` → CouchDB (port 5984)

### Cloud Infrastructure

| Resource | Details |
|----------|---------|
| **Provider** | AWS (ap-south-1, Mumbai) |
| **Instance** | EC2 t3.small, Ubuntu 22.04 |
| **IP** | `13.234.68.147` |
| **Domain** | `13-234-68-147.sslip.io` (sslip.io for bare IP DNS) |
| **Ports** | 80, 443, 22 |
| **IaC** | `terraform/main.tf` (EC2 + security group) |
| **SSH** | `ssh -i ~/.ssh/gonok.pem ubuntu@13.234.68.147` |

### CI/CD

| Detail | Value |
|--------|-------|
| **Platform** | GitHub Actions |
| **Trigger** | Push to `main` or manual dispatch |
| **Pipeline** | Build & test (Node 20) → SSH deploy → `docker compose up --build` |
| **Config** | `.github/workflows/deploy.yml` |
| **Secrets** | `EC2_SSH_KEY`, `EC2_HOST`, `EC2_USER` |

### Security

| Protection | Implementation | Details |
|-----------|---------------|---------|
| **HTTPS** | Caddy + Let's Encrypt | Auto-TLS, HTTP→HTTPS redirect |
| **HSTS** | helmet.js | `max-age=31536000; includeSubDomains; preload` |
| **CSP** | helmet.js | `default-src 'self'`, blocks inline scripts, restricts sources |
| **X-Frame-Options** | helmet.js | `SAMEORIGIN` — prevents clickjacking |
| **X-Content-Type-Options** | helmet.js | `nosniff` — prevents MIME sniffing |
| **Referrer-Policy** | helmet.js | `no-referrer` — no data leakage |
| **CORS** | cors middleware | Locked to `https://{DOMAIN}` in production, open in dev |
| **Auth Rate Limiting** | express-rate-limit | Login/register: 10 req/15min per IP |
| **OTP Rate Limiting** | express-rate-limit | OTP verify: 5 req/15min per IP (prevents brute force) |
| **Storefront Rate Limiting** | express-rate-limit | 200 req/15min per IP |
| **Input Sanitization** | Custom middleware | All request body/query `<>` tags stripped (XSS prevention) |
| **Body Size Limit** | express.json | 1MB max JSON payload |
| **JWT Auth** | jsonwebtoken + bcryptjs | Access tokens (1h) + hashed refresh tokens (7d) |

### Containers

5-service Docker Compose stack (`docker-compose.prod.yml`, project name: `gonok`):

| Service | Image | Ports | Purpose |
|---------|-------|-------|---------|
| `caddy` | `caddy:2-alpine` | 80, 443 (public) | HTTPS termination |
| `web` | `gonok-web` (nginx) | 80 (internal) | Main app + storefront static files |
| `api` | `gonok-api` (Node) | 3333 (internal) | Express REST API |
| `postgres` | `postgres:16-alpine` | 5432 (internal) | Auth database |
| `couchdb` | `couchdb:3` | 5984 (internal) | Sync database |

Persistent volumes: `gonok_pgdata`, `gonok_couchdata`, `caddy_data`, `caddy_config`

> `name: gonok` in compose file ensures consistent volume names across deployments.

### Backup

| Detail | Value |
|--------|-------|
| **Schedule** | Daily at 3:00 AM (cron) |
| **PostgreSQL** | `pg_dump` → gzipped `.sql.gz` via `docker exec` |
| **CouchDB** | All user databases → `_all_docs` with docs → gzipped JSON → tar archive |
| **Retention** | 7 daily + 4 weekly (Sunday copies), auto-rotated |
| **Storage** | `/backups/gonok/daily/` and `/backups/gonok/weekly/` on EC2 |
| **Restore** | `bash scripts/restore.sh [date] [pg\|couch\|all]` |
| **Log** | `/var/log/gonok-backup.log` |
| **Setup** | `bash scripts/setup-backup-cron.sh` (run once on server) |

### CDN (Planned)

Currently serving static assets directly from nginx on EC2. Plan:
1. Buy a custom domain (e.g., `gonok.app`)
2. Add to Cloudflare (free tier)
3. Point DNS → Cloudflare → EC2
4. Auto-caches JS/CSS/images at 300+ global edge locations
5. Bonus: DDoS protection + analytics

---

## Features (31 Modules)

### Core Accounting
- **Sales & Purchase** — Full invoicing with items, quantities, prices, discounts
- **Sales & Purchase Returns** — Process returns with automatic stock adjustment
- **Payment In / Out** — Track receivables and payables
- **Expenses** — Categorized tracking (Cash, bKash, Nagad, Bank, Cheque)
- **Recurring Expenses** — Auto-generate rent, utilities, subscriptions (daily/weekly/monthly/yearly)
- **Due List** — All outstanding balances at a glance
- **Cash Adjustment** — Manual cash register corrections
- **Bank Accounts** — Track bank balances and transactions

### Point of Sale (POS)
- Split-screen: product grid + cart
- Multiple payment methods (Cash, bKash, Nagad, Cheque)
- Hold & recall sales
- Receipt printing
- Keyboard shortcuts (F2 pay, F4 hold, F11 fullscreen)

### Inventory & Procurement
- **Products** — Catalog with categories, units, pricing (purchase/sales/MRP)
- **Purchase Orders** — PO creation with credit terms, status tracking, GRN
- **Stock Transfers** — Move inventory between branches
- **Reorder Alerts** — Low stock notifications with reorder levels
- **Real-time stock** — Adjusted by sales/purchases/returns/transfers

### Sales Pipeline
- **Quotations** — Create estimates, status workflow (Draft → Sent → Accepted), convert to sale
- **Deliveries** — Challans with status tracking (Pending → Dispatched → Delivered), printable slips

### CRM
- **Interactions** — Log calls, emails, meetings, visits per customer
- **Pipeline** — Deal stage management from lead to close
- **Follow-ups** — Track upcoming and overdue follow-ups
- **Notes** — Quick notes attached to parties

### Logistics
- **Vehicles** — Fleet management
- **Trips** — Route planning with stops
- **Delivery tracking** — End-to-end shipment visibility

### People
- **Parties** — Customer/supplier management with groups and balance tracking
- **Payroll** — Employee management, monthly salary sheets, bonus/deduction/advance
- **Users & Roles** — Owner, Admin, Staff, Viewer

### Reports (6 types)
- Sales Report, Purchase Report, Daybook
- Party Statement, Stock Summary, Aging Report (receivable + payable)

### Storefront (Public Catalog)
- **Public product catalog** at `/shop/{slug}` — no login required
- Business header with logo, name, contact
- Product grid with search, category filter, pagination
- Product detail page with images, pricing, stock status
- Premium dark-gradient UI design
- Rate limited (200 req/15min/IP)

### Administration
- **Multi-business** — Manage multiple businesses from one account
- **Multi-branch** — Branch-level organization
- **Settings** — Item, party, transaction, export, storefront config (5 tabs)
- **Import** — Bulk import from Excel
- **Backup & Restore** — Export/import full business data (JSON)
- **Activity Log** — Audit trail of all actions
- **Tasks** — Task management with status tracking
- **Global Search** — Cmd+K to search products, parties, transactions, pages
- **Bilingual UI** — English + Bangla (বাংলা) via @ngx-translate

---

## Quick Start

### Prerequisites
- **Node.js** 20+
- **Docker** and **Docker Compose**

### 1. Clone and install

```bash
git clone https://github.com/arafatomer66/Gonok-Accounting.git
cd Gonok-Accounting
npm install
```

### 2. Start databases

```bash
docker compose up -d
```

This starts PostgreSQL (port 5433) and CouchDB (port 5984).

### 3. Start the apps

```bash
npx nx serve api          # API on port 3333
npx nx serve web          # Main app on port 4200
npx nx serve storefront   # Storefront on port 4300
```

### 4. Login

1. Open **http://localhost:4200**
2. Register with any phone number
3. Enter OTP **`123456`** (dev mode)
4. Create a business and start using

---

## Production Deployment

### Deploy to EC2

```bash
# SSH into server
ssh -i ~/.ssh/gonok.pem ubuntu@13.234.68.147

# Clone and configure
git clone https://github.com/arafatomer66/Gonok-Accounting.git
cd Gonok-Accounting
cp .env.prod.example .env.prod
# Edit .env.prod — update passwords and secrets

# First run (creates database tables)
# Set DB_SYNC=true in .env.prod, then:
docker compose -f docker-compose.prod.yml up -d --build

# Initialize CouchDB
source .env.prod && bash scripts/init-couchdb.sh

# Setup automated backups
bash scripts/setup-backup-cron.sh

# Verify
curl -k https://13-234-68-147.sslip.io/api/health
```

### Docker Commands

| Command | Description |
|---------|-------------|
| `docker compose -f docker-compose.prod.yml up -d --build` | Build and start all 5 services |
| `docker compose -f docker-compose.prod.yml logs api -f` | Tail API logs |
| `docker compose -f docker-compose.prod.yml ps` | Check service status |
| `docker compose -f docker-compose.prod.yml down` | Stop all services |

### Backup Commands

| Command | Description |
|---------|-------------|
| `bash scripts/backup.sh` | Run backup manually |
| `bash scripts/restore.sh` | Restore latest backup (interactive) |
| `bash scripts/restore.sh 2026-04-25_0300` | Restore specific date |
| `bash scripts/restore.sh 2026-04-25_0300 pg` | Restore PostgreSQL only |
| `bash scripts/restore.sh 2026-04-25_0300 couch` | Restore CouchDB only |

---

## Project Structure

```
apps/
  web/                → Main Angular app (PWA, offline-first)
  storefront/         → Public storefront micro-frontend
  api/                → Express.js REST API
libs/
  shared-types/       → Shared TypeScript interfaces, enums, models
cypress/              → E2E tests (9 specs, 59 tests)
scripts/
  backup.sh           → Automated backup script
  restore.sh          → Backup restore script
  setup-backup-cron.sh → Cron job installer
  init-couchdb.sh     → CouchDB initialization
terraform/
  main.tf             → AWS EC2 infrastructure as code
docker-compose.yml        → Development databases
docker-compose.prod.yml   → Production stack (5 services)
Caddyfile                 → HTTPS reverse proxy config
.github/workflows/        → CI/CD pipeline
```

---

## Common Commands

| Command | Description |
|---------|-------------|
| `npx nx serve api` | Start API (port 3333) |
| `npx nx serve web` | Start main app (port 4200) |
| `npx nx serve storefront` | Start storefront (port 4300) |
| `npx nx build web` | Production build (main app) |
| `npx nx build storefront` | Production build (storefront) |
| `npx nx build api` | Production build (API) |
| `npx cypress run --browser chrome` | Run e2e tests |
| `docker compose up -d` | Start dev databases |
| `npx nx reset` | Clear Nx build cache |

---

## Documentation

| Doc | Description |
|-----|-------------|
| [CLAUDE.md](CLAUDE.md) | Full project guide — architecture, patterns, stores, deployment |
| [docs/FEATURES.md](docs/FEATURES.md) | Detailed feature guide for all 31 modules |
| [docs/ROADMAP.md](docs/ROADMAP.md) | Feature roadmap with competitive analysis |

---

## License

MIT
