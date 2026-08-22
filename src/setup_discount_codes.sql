-- =====================================================================
-- SETUP: discount_codes — códigos de descuento del panel de plataforma
-- =====================================================================
-- Ejecutar UNA VEZ en el SQL Editor de Supabase, DESPUÉS de haber
-- corrido setup_user_roles.sql (esta tabla depende de has_role()).
-- Idempotente: se puede correr varias veces sin romper nada.
--
-- Modelo: un código da un beneficio (días extra, % de descuento, o un
-- descuento fijo) que el ADMIN aplica manualmente al activar o renovar
-- la suscripción de un negocio desde el panel de plataforma
-- (https://tu-dominio.vercel.app/admin). No hay checkout automático en
-- esta app todavía, así que no hace falta validación pública del código
-- — solo el admin lo usa, por eso el acceso queda restringido 100% a
-- usuarios con rol 'admin'.
-- =====================================================================

-- 1) Tipo de descuento
do $$ begin
  if not exists (select 1 from pg_type where typname = 'discount_type') then
    create type public.discount_type as enum ('percent', 'fixed_days', 'fixed_amount');
  end if;
end $$;

-- 2) Tabla discount_codes
create table if not exists public.discount_codes (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  discount_type public.discount_type not null,
  -- percent: 1-100 (%) · fixed_days: días a sumar · fixed_amount: monto fijo
  value numeric not null check (value > 0),
  max_uses integer,                          -- null = ilimitado
  uses_count integer not null default 0,
  is_active boolean not null default true,
  expires_at timestamptz,                    -- null = sin vencimiento
  note text,                                 -- para qué/quién es el código (uso interno del admin)
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now()
);

create index if not exists discount_codes_code_idx on public.discount_codes (code);

-- 3) Historial de canjes (qué negocio usó qué código y cuándo)
create table if not exists public.discount_code_redemptions (
  id uuid primary key default gen_random_uuid(),
  discount_code_id uuid references public.discount_codes(id) on delete cascade not null,
  user_id uuid references auth.users(id) on delete cascade not null,
  redeemed_at timestamptz not null default now(),
  redeemed_by_admin uuid references auth.users(id)
);

-- 4) Grants
grant select, insert, update, delete on public.discount_codes to authenticated;
grant select, insert on public.discount_code_redemptions to authenticated;
grant all on public.discount_codes, public.discount_code_redemptions to service_role;

-- 5) RLS — solo admins pueden ver o tocar esto, desde ningún lado más.
alter table public.discount_codes enable row level security;
alter table public.discount_code_redemptions enable row level security;

drop policy if exists "Solo admins gestionan códigos" on public.discount_codes;
create policy "Solo admins gestionan códigos"
on public.discount_codes for all
to authenticated
using (public.has_role(auth.uid(), 'admin'))
with check (public.has_role(auth.uid(), 'admin'));

drop policy if exists "Solo admins ven canjes" on public.discount_code_redemptions;
create policy "Solo admins ven canjes"
on public.discount_code_redemptions for all
to authenticated
using (public.has_role(auth.uid(), 'admin'))
with check (public.has_role(auth.uid(), 'admin'));
