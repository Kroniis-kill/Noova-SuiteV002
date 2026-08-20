-- =====================================================================
-- SETUP: user_roles + has_role() — fuente de verdad para privilegios
-- =====================================================================
-- Ejecutar UNA VEZ en el SQL Editor de Supabase. Idempotente: se puede
-- correr varias veces sin romper nada.
--
-- Reemplaza la validación legacy basada en `app_admins.email` por un
-- modelo seguro con tabla `user_roles` + función security definer
-- `has_role(uuid, app_role)` que el cliente nunca puede falsificar.
-- =====================================================================

-- 1) Enum de roles
do $$ begin
  if not exists (select 1 from pg_type where typname = 'app_role') then
    create type public.app_role as enum ('admin', 'moderator', 'user');
  end if;
end $$;

-- 2) Tabla user_roles
create table if not exists public.user_roles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  role public.app_role not null,
  created_at timestamptz not null default now(),
  unique (user_id, role)
);

-- 3) Grants para el Data API (no se concede a anon: solo lectura autenticada)
grant select on public.user_roles to authenticated;
grant all on public.user_roles to service_role;

-- 4) RLS
alter table public.user_roles enable row level security;

drop policy if exists "Usuarios ven sus propios roles" on public.user_roles;
create policy "Usuarios ven sus propios roles"
on public.user_roles for select
to authenticated
using (auth.uid() = user_id);

-- Solo service_role / SQL editor pueden escribir (no policy de insert/update/delete
-- para clientes → bloqueo total a privilege escalation desde el frontend).

-- 5) Función security definer (la única forma segura de validar roles desde RLS)
create or replace function public.has_role(_user_id uuid, _role public.app_role)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.user_roles
    where user_id = _user_id and role = _role
  )
$$;

grant execute on function public.has_role(uuid, public.app_role) to authenticated, anon;

-- 6) Migración de datos: copiar admins existentes desde app_admins (si existe)
do $$
begin
  if exists (select 1 from information_schema.tables
             where table_schema = 'public' and table_name = 'app_admins') then
    insert into public.user_roles (user_id, role)
    select a.id, 'admin'::public.app_role
    from public.app_admins a
    where a.id is not null
    on conflict (user_id, role) do nothing;
  end if;
end $$;
