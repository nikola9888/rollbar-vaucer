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

create table if not exists public.admin_users (
  user_id uuid primary key references auth.users(id) on delete cascade
);

alter table public.vouchers enable row level security;
alter table public.admin_users enable row level security;

revoke all on public.vouchers from anon, authenticated;
revoke all on public.admin_users from anon, authenticated;

create or replace function public.is_admin()
returns boolean
language sql security definer set search_path = public stable
as $$
  select exists (select 1 from public.admin_users where user_id = auth.uid());
$$;

create or replace function public.verify_voucher(p_code text)
returns table(code text, reward text, status text, expires_at timestamptz)
language plpgsql security definer set search_path = public
as $$
begin
  return query
  select v.code, v.reward,
    case when v.status = 'active' and v.expires_at < now() then 'expired' else v.status end,
    v.expires_at
  from public.vouchers v
  where upper(v.code) = upper(trim(p_code))
  limit 1;
end;
$$;

create or replace function public.create_voucher(p_reward text, p_days integer)
returns public.vouchers
language plpgsql security definer set search_path = public
as $$
declare v public.vouchers; new_code text;
begin
  if not public.is_admin() then raise exception 'NOT_ADMIN'; end if;
  if trim(coalesce(p_reward,'')) = '' then raise exception 'REWARD_REQUIRED'; end if;
  if p_days < 1 or p_days > 3650 then raise exception 'INVALID_DAYS'; end if;
  loop
    new_code := 'ROLL-' || upper(substr(encode(gen_random_bytes(6), 'hex'), 1, 6));
    exit when not exists (select 1 from public.vouchers where code = new_code);
  end loop;
  insert into public.vouchers(code,reward,expires_at)
  values(new_code,trim(p_reward),now() + make_interval(days => p_days))
  returning * into v;
  return v;
end;
$$;

create or replace function public.list_vouchers()
returns setof public.vouchers
language sql security definer set search_path = public stable
as $$
  select * from public.vouchers where public.is_admin() order by created_at desc;
$$;

create or replace function public.use_voucher(p_code text)
returns public.vouchers
language plpgsql security definer set search_path = public
as $$
declare v public.vouchers;
begin
  if not public.is_admin() then raise exception 'NOT_ADMIN'; end if;
  update public.vouchers
  set status = 'used', used_at = now(), used_by = auth.uid()::text
  where upper(code) = upper(trim(p_code))
    and status = 'active'
    and expires_at >= now()
  returning * into v;
  if v.id is null then raise exception 'VOUCHER_NOT_ACTIVE'; end if;
  return v;
end;
$$;

grant execute on function public.verify_voucher(text) to anon, authenticated;
grant execute on function public.is_admin() to anon, authenticated;
grant execute on function public.create_voucher(text,integer) to authenticated;
grant execute on function public.list_vouchers() to authenticated;
grant execute on function public.use_voucher(text) to authenticated;

-- Nakon kreiranja tvog Auth korisnika, ubaci njegov UUID:
-- insert into public.admin_users(user_id) values ('OVDE_UUID');
