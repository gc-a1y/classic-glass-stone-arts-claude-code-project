-- Classic Glass & Stone Arts — Initial Schema
-- Run this in your Supabase SQL editor

-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- ============================================================
-- CLIENTS
-- ============================================================
create table if not exists clients (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  email text,
  phone text,
  address text,
  archived boolean default false,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- ============================================================
-- ESTIMATES
-- ============================================================
create table if not exists estimates (
  id uuid primary key default uuid_generate_v4(),
  client_id uuid references clients(id) on delete set null,
  line_items jsonb not null default '[]',
  subtotal numeric(12,2) not null default 0,
  tax numeric(12,2) not null default 0,
  tax_rate numeric(5,2) not null default 6,
  labor numeric(12,2) not null default 0,
  total numeric(12,2) not null default 0,
  margin numeric(5,2) not null default 0,
  status text not null default 'draft'
    check (status in ('draft','sent','accepted','rejected','converted')),
  notes text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- ============================================================
-- INVOICES
-- ============================================================
create table if not exists invoices (
  id uuid primary key default uuid_generate_v4(),
  estimate_id uuid references estimates(id) on delete set null,
  client_id uuid references clients(id) on delete set null,
  invoice_number text not null unique,
  line_items jsonb not null default '[]',
  subtotal numeric(12,2) not null default 0,
  tax numeric(12,2) not null default 0,
  tax_rate numeric(5,2) not null default 6,
  total numeric(12,2) not null default 0,
  amount_paid numeric(12,2) not null default 0,
  status text not null default 'draft'
    check (status in ('draft','sent','partially_paid','paid','overdue')),
  due_date date not null,
  paid_at timestamptz,
  payment_method text check (payment_method in ('ach','card','check')),
  notes text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- ============================================================
-- PAYMENTS
-- ============================================================
create table if not exists payments (
  id uuid primary key default uuid_generate_v4(),
  invoice_id uuid references invoices(id) on delete cascade,
  amount numeric(12,2) not null,
  method text not null check (method in ('ach','card','check')),
  stripe_payment_intent_id text unique,
  status text not null default 'pending'
    check (status in ('pending','processing','succeeded','failed')),
  created_at timestamptz default now()
);

-- ============================================================
-- LEADS
-- ============================================================
create table if not exists leads (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  email text,
  phone text,
  project_description text,
  source text default 'website'
    check (source in ('website','referral','phone','bella_ai','other')),
  created_at timestamptz default now()
);

-- ============================================================
-- CHAT SESSIONS
-- ============================================================
create table if not exists chat_sessions (
  id text primary key,
  lead_id uuid references leads(id) on delete set null,
  messages jsonb not null default '[]',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- ============================================================
-- SETTINGS
-- ============================================================
create table if not exists settings (
  id uuid primary key default uuid_generate_v4(),
  key text not null unique,
  value text not null default '',
  updated_at timestamptz default now()
);

-- Insert default settings
insert into settings (key, value) values
  ('business_name', 'Classic Glass & Stone Arts'),
  ('business_address', ''),
  ('business_phone', ''),
  ('business_email', ''),
  ('tax_rate', '6'),
  ('bella_enabled', 'true'),
  ('check_instructions', 'Please make check payable to Classic Glass & Stone Arts and mail to the address above. Include your invoice number in the memo line.'),
  ('sendgrid_from_email', '')
on conflict (key) do nothing;

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================

-- Enable RLS on all tables
alter table clients enable row level security;
alter table estimates enable row level security;
alter table invoices enable row level security;
alter table payments enable row level security;
alter table leads enable row level security;
alter table chat_sessions enable row level security;
alter table settings enable row level security;

-- Admin (authenticated) users can do anything
create policy "authenticated_all_clients" on clients for all to authenticated using (true) with check (true);
create policy "authenticated_all_estimates" on estimates for all to authenticated using (true) with check (true);
create policy "authenticated_all_invoices" on invoices for all to authenticated using (true) with check (true);
create policy "authenticated_all_payments" on payments for all to authenticated using (true) with check (true);
create policy "authenticated_all_leads" on leads for all to authenticated using (true) with check (true);
create policy "authenticated_all_chat_sessions" on chat_sessions for all to authenticated using (true) with check (true);
create policy "authenticated_all_settings" on settings for all to authenticated using (true) with check (true);

-- Public can read invoices by ID (for payment page)
create policy "public_read_invoices" on invoices for select to anon using (true);
-- Public can read clients associated with invoices (for payment page display)
create policy "public_read_clients" on clients for select to anon using (true);
-- Public can read settings (for payment page check instructions)
create policy "public_read_settings" on settings for select to anon using (true);
-- Public can insert leads (Bella AI captures)
create policy "public_insert_leads" on leads for insert to anon with check (true);
-- Public can upsert chat sessions
create policy "public_upsert_chat_sessions" on chat_sessions for all to anon using (true) with check (true);

-- ============================================================
-- INDEXES
-- ============================================================
create index if not exists idx_estimates_client_id on estimates(client_id);
create index if not exists idx_invoices_client_id on invoices(client_id);
create index if not exists idx_invoices_status on invoices(status);
create index if not exists idx_invoices_due_date on invoices(due_date);
create index if not exists idx_payments_invoice_id on payments(invoice_id);
create index if not exists idx_payments_stripe_intent on payments(stripe_payment_intent_id);
create index if not exists idx_leads_created_at on leads(created_at);
