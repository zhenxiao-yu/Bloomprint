-- Bloomprint billing schema (run in the Supabase SQL editor or via the CLI).
-- Subscription/usage rows are written ONLY by the server (service role); users can read their own.

create table if not exists public.billing_customers (
  user_id uuid primary key references auth.users(id) on delete cascade,
  stripe_customer_id text not null unique,
  created_at timestamptz not null default now()
);

create table if not exists public.subscriptions (
  user_id uuid primary key references auth.users(id) on delete cascade,
  stripe_customer_id text,
  stripe_subscription_id text unique,
  plan_key text not null default 'free',
  status text not null default 'inactive',
  current_period_end timestamptz,
  cancel_at_period_end boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.usage_counters (
  user_id uuid not null references auth.users(id) on delete cascade,
  period_key text not null,
  metric text not null,
  value integer not null default 0,
  updated_at timestamptz not null default now(),
  primary key (user_id, period_key, metric)
);

alter table public.billing_customers enable row level security;
alter table public.subscriptions enable row level security;
alter table public.usage_counters enable row level security;

-- Read-only for the owning user. No insert/update/delete policies → only the service role
-- (which bypasses RLS) can write these rows from the server.
drop policy if exists "own billing_customers" on public.billing_customers;
create policy "own billing_customers" on public.billing_customers
  for select using (auth.uid() = user_id);

drop policy if exists "own subscriptions" on public.subscriptions;
create policy "own subscriptions" on public.subscriptions
  for select using (auth.uid() = user_id);

drop policy if exists "own usage_counters" on public.usage_counters;
create policy "own usage_counters" on public.usage_counters
  for select using (auth.uid() = user_id);
