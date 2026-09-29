create extension if not exists pgcrypto;

create table if not exists public.vouchers (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  reward text not null,
  status text not null default 'active' check (status in ('active','used','expired','cancelled')),
  expires_at timestamptz not null,
  created_at timestamptz not null default now(),
  used_at timestamptz,
  used_by text
);

create index if not exists vouchers_code_idx on public.vouchers(code);
alter table public.vouchers enable row level security;

create policy "public can verify vouchers"
on public.vouchers for select
to anon, authenticated
using (true);

-- Production insert/update/delete should be performed by a trusted Edge Function.
