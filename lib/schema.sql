-- ─────────────────────────────────────────────────────────────────────────────
-- Nithrox Store — Supabase schema migration
-- Run in: Supabase Dashboard > SQL Editor
-- ─────────────────────────────────────────────────────────────────────────────

-- Enable UUID generation
create extension if not exists "pgcrypto";

-- ── profiles ─────────────────────────────────────────────────────────────────
create table if not exists profiles (
  id          uuid primary key references auth.users(id) on delete cascade,
  email       text not null,
  name        text,
  phone       text,
  company     text,
  role        text not null default 'client',
  created_at  timestamptz not null default now()
);

alter table profiles enable row level security;

create policy "Users can read own profile"
  on profiles for select
  using (auth.uid() = id);

create policy "Users can insert own profile"
  on profiles for insert
  with check (auth.uid() = id);

create policy "Users can update own profile"
  on profiles for update
  using (auth.uid() = id);

-- ── orders ───────────────────────────────────────────────────────────────────
create table if not exists orders (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid references profiles(id) on delete set null,
  plan_id         text,
  plan_name       text,
  items           jsonb,
  total_pen       numeric(10, 2),
  status          text not null default 'pending',   -- pending | paid | active | cancelled
  payment_method  text,
  payment_id      text,
  signature_url   text,
  notes           text,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

alter table orders enable row level security;

create policy "Users can read own orders"
  on orders for select
  using (auth.uid() = user_id);

create policy "Users can insert own orders"
  on orders for insert
  with check (auth.uid() = user_id or user_id is null);

-- Auto-update updated_at
create or replace function update_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger orders_updated_at
  before update on orders
  for each row execute function update_updated_at();

-- ── store_orders (admin sync copy) ───────────────────────────────────────────
create table if not exists store_orders (
  id              uuid primary key default gen_random_uuid(),
  order_id        uuid references orders(id) on delete cascade,
  user_id         uuid references profiles(id) on delete set null,
  plan_id         text,
  plan_name       text,
  total_pen       numeric(10, 2),
  status          text not null default 'pending',
  payment_method  text,
  created_at      timestamptz not null default now()
);

alter table store_orders enable row level security;

create policy "Admins can read store_orders"
  on store_orders for select
  using (
    exists (
      select 1 from profiles p where p.id = auth.uid() and p.role = 'admin'
    )
  );

create policy "Service role can insert store_orders"
  on store_orders for insert
  with check (true);  -- controlled by API route using service key

-- ── store_config ──────────────────────────────────────────────────────────────
create table if not exists store_config (
  id          text primary key,      -- e.g. 'plans', 'addons', 'contract_template'
  value       jsonb not null default '{}',
  updated_at  timestamptz not null default now()
);

alter table store_config enable row level security;

create policy "Admins can manage store_config"
  on store_config for all
  using (
    exists (
      select 1 from profiles p where p.id = auth.uid() and p.role = 'admin'
    )
  );

create policy "Anyone can read store_config"
  on store_config for select
  using (true);

-- ── contract_templates ────────────────────────────────────────────────────────
create table if not exists contract_templates (
  id          uuid primary key default gen_random_uuid(),
  content     text not null,
  version     integer not null default 1,
  active      boolean not null default false,
  lang        text not null default 'es',
  created_at  timestamptz not null default now()
);

alter table contract_templates enable row level security;

create policy "Anyone can read active contract templates"
  on contract_templates for select
  using (active = true);

create policy "Admins can manage contract templates"
  on contract_templates for all
  using (
    exists (
      select 1 from profiles p where p.id = auth.uid() and p.role = 'admin'
    )
  );

-- ── domain_orders ─────────────────────────────────────────────────────────────
create table if not exists domain_orders (
  id              uuid primary key default gen_random_uuid(),
  order_id        uuid references orders(id) on delete cascade,
  domain          text not null,
  tld             text,
  status          text not null default 'pending',  -- pending | registered | failed
  twentyi_id      text,    -- 20i package id
  realtime_id     text,    -- Realtime Register order id
  created_at      timestamptz not null default now()
);

alter table domain_orders enable row level security;

create policy "Users can read own domain_orders"
  on domain_orders for select
  using (
    exists (
      select 1 from orders o where o.id = domain_orders.order_id and o.user_id = auth.uid()
    )
  );

create policy "Service role can manage domain_orders"
  on domain_orders for all
  using (true);  -- controlled via API routes

-- ── hosting_orders ────────────────────────────────────────────────────────────
create table if not exists hosting_orders (
  id                  uuid primary key default gen_random_uuid(),
  order_id            uuid references orders(id) on delete cascade,
  tier                text not null,
  twentyi_package_id  text,
  status              text not null default 'pending',  -- pending | active | failed
  created_at          timestamptz not null default now()
);

alter table hosting_orders enable row level security;

create policy "Users can read own hosting_orders"
  on hosting_orders for select
  using (
    exists (
      select 1 from orders o where o.id = hosting_orders.order_id and o.user_id = auth.uid()
    )
  );

create policy "Service role can manage hosting_orders"
  on hosting_orders for all
  using (true);  -- controlled via API routes

-- ── Indexes ───────────────────────────────────────────────────────────────────
create index if not exists idx_orders_user_id        on orders(user_id);
create index if not exists idx_orders_status         on orders(status);
create index if not exists idx_domain_orders_order   on domain_orders(order_id);
create index if not exists idx_hosting_orders_order  on hosting_orders(order_id);
create index if not exists idx_store_orders_order    on store_orders(order_id);
