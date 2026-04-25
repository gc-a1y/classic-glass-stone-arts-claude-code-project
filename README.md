# Classic Glass & Stone Arts — Business Portal

A full-stack business management portal for Classic Glass & Stone Arts. Features AI receptionist (Bella), estimates, invoices, triple-option payment collection, client management, and analytics.

## Tech Stack

- **Frontend**: React + Vite + TypeScript + Tailwind CSS
- **Backend**: Node.js + Express (ESM)
- **Database & Auth**: Supabase (PostgreSQL + Auth)
- **Payments**: Stripe (ACH + Card)
- **AI**: Anthropic Claude API (`claude-sonnet-4-20250514`)
- **PDF**: Puppeteer
- **Email**: SendGrid
- **Charts**: Recharts

---

## Quick Start

### Prerequisites

- Node.js 18+
- A [Supabase](https://supabase.com) project
- A [Stripe](https://stripe.com) account
- An [Anthropic](https://console.anthropic.com) API key
- A [SendGrid](https://sendgrid.com) account (for email)

---

## 1. Database Setup (Supabase)

1. Create a new Supabase project at [app.supabase.com](https://app.supabase.com)
2. Go to **SQL Editor** → **New Query**
3. Paste and run the contents of `supabase/migrations/001_initial_schema.sql`
4. Go to **Authentication → Users** and create your admin user (email/password)

---

## 2. Environment Variables

### Frontend (`frontend/.env`)

Copy `frontend/.env.example` → `frontend/.env` and fill in:

```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your_anon_key
VITE_STRIPE_PUBLISHABLE_KEY=pk_live_...
VITE_API_URL=http://localhost:3001
```

### Backend (`backend/.env`)

Copy `backend/.env.example` → `backend/.env` and fill in:

```env
PORT=3001
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
STRIPE_SECRET_KEY=sk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...
ANTHROPIC_API_KEY=sk-ant-...
SENDGRID_API_KEY=SG....
SENDGRID_FROM_EMAIL=invoices@yourdomail.com
FRONTEND_URL=http://localhost:5173
```

---

## 3. Install & Run

```bash
# Install all dependencies
npm run install:all

# Run both frontend and backend concurrently
npm run dev
```

- Frontend: http://localhost:5173
- Backend API: http://localhost:3001

---

## 4. Stripe Webhook Setup

For automatic invoice status updates after payment:

1. Install Stripe CLI: `brew install stripe/stripe-cli/stripe`
2. Forward webhooks to your local backend:
   ```bash
   stripe listen --forward-to localhost:3001/api/webhooks/stripe
   ```
3. Copy the webhook secret shown and add it to `backend/.env` as `STRIPE_WEBHOOK_SECRET`

In production, add your live endpoint URL in your Stripe dashboard.

---

## 5. Deploying to Production

### Frontend

Build and deploy to Vercel/Netlify:

```bash
cd frontend
npm run build
# Deploy dist/ directory
```

Set environment variables in your hosting dashboard.

### Backend

Deploy to Railway, Render, or any Node.js host:

```bash
cd backend
npm start
```

Note: Puppeteer requires a headless Chrome environment. Use a Dockerfile or enable Chromium support on your host:

```dockerfile
FROM node:20-slim
RUN apt-get update && apt-get install -y \
  chromium \
  fonts-liberation \
  --no-install-recommends \
  && rm -rf /var/lib/apt/lists/*
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true
ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium
WORKDIR /app
COPY . .
RUN npm install
CMD ["npm", "start"]
```

---

## Features

### Dashboard
- MTD revenue, outstanding invoices, pending estimates, new leads
- 6-month revenue area chart
- Recent activity feed
- Quick action buttons

### AI Receptionist — Bella
- Floating chat widget on all portal pages
- Powered by Claude (`claude-sonnet-4-20250514`)
- Captures lead info (name, phone, email, project description)
- Auto-saves leads to Supabase
- Chat history persisted per session

### Estimate Builder
- Multi-line items: material type, description, qty, unit, unit price
- Auto-calculated subtotal, tax, labor, total
- Internal profit margin calculator
- Save draft → mark sent → convert to invoice in one click
- PDF export with branded dark theme
- Shareable client-facing link

### Invoice Generator
- Auto-populated from estimates or created manually
- Auto-generated invoice numbers (`INV-YYYY-####`)
- Status lifecycle: Draft → Sent → Partially Paid → Paid → Overdue
- Send via email (SendGrid)
- Payment button embedded in client-facing view
- PDF export

### Payment Collection
Three clearly labeled options on the client payment page:

| Option | Method | Fees |
|--------|--------|------|
| A — Bank Transfer | Stripe ACH | 0.8% (capped $5.00) — Free to client |
| B — Card | Stripe Card | 3% surcharge passed to client |
| C — Check | Manual | No fees |

Stripe webhooks automatically update invoice status upon payment.

### Client Management
- Search, filter, add, edit, archive clients
- Per-client view: contact info, invoice history, estimate history, total spent
- Import clients via CSV (`name,email,phone,address` columns)

### Analytics
- 12-month revenue bar chart
- Payment method breakdown pie chart (ACH vs Card vs Check)
- Top 5 clients by revenue
- Avg job size, collection rate KPIs

### Settings
- Business info (name, address, phone, email)
- Tax rate configuration
- Stripe + SendGrid status
- Bella AI toggle
- Check payment instructions

---

## Project Structure

```
classic-glass-stone-arts-claude-code-project/
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── layout/        # AppLayout, sidebar, mobile nav
│   │   │   ├── ui/            # Modal, Skeleton, StatusBadge, EmptyState
│   │   │   └── BellaWidget.tsx
│   │   ├── hooks/             # useAuth, useDashboard
│   │   ├── lib/               # supabase, api, utils
│   │   ├── pages/             # All page components
│   │   └── types/             # TypeScript types
│   ├── tailwind.config.js
│   └── vite.config.ts
├── backend/
│   └── src/
│       ├── routes/            # bella, payments, invoices, estimates, webhooks
│       ├── middleware/        # auth
│       └── lib/               # supabase, pdf (Puppeteer)
├── supabase/
│   └── migrations/
│       └── 001_initial_schema.sql
└── README.md
```

---

## Design System

| Token | Value |
|-------|-------|
| Background | `#0A0A0A` |
| Surface | `#111111` |
| Surface 2 | `#1A1A1A` |
| Gold accent | `#B8973A` |
| Border | `#2A2A2A` |
| Text primary | `#F5F5F5` |
| Text muted | `#888888` |
| Border radius (cards) | `12px` |
| Border radius (inputs) | `8px` |
| Gold glow | `0 0 20px rgba(184,151,58,0.15)` |

---

## License

Proprietary — Classic Glass & Stone Arts
