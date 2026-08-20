-- =====================================================================
-- 0002_update_sale_sync.sql
-- =====================================================================
-- Mismo bug que ya se corrigió en 0001 para crear/borrar ventas, pero
-- en EDITAR: si editas una venta "por_pantalla" (cambias la cuenta, los
-- perfiles asignados, o el tipo de venta), el flujo activo
-- (useSales.ts -> updateSale) solo hacía un UPDATE plano sobre la fila
-- de `sales` y nunca liberaba el perfil viejo ni ocupaba el nuevo. Con
-- uso normal, esto también desincroniza `accounts.profiles` /
-- `accounts.used_screens` del estado real.
--
-- Para no duplicar la lógica de "liberar perfiles" / "ocupar perfiles"
-- entre crear/borrar/editar, se extrae a 2 funciones auxiliares
-- (_release_sale_profiles / _occupy_sale_profiles) y de paso se
-- reescriben create_sale_with_sync y delete_sale_with_sync de 0001 para
-- usarlas (CREATE OR REPLACE, mismo comportamiento, menos código
-- duplicado).
--
-- CÓMO APLICAR: correr DESPUÉS de 0001_transactional_rpcs.sql, en el
-- SQL Editor de Supabase. Ídem: probar primero en staging.
-- =====================================================================

-- ---------------------------------------------------------------------
-- Helper: libera de vuelta los perfiles que una venta tenía ocupados.
-- ---------------------------------------------------------------------
create or replace function public._release_sale_profiles(
  p_account_id uuid, p_user_id uuid, p_sale_type text, p_screens_count int, p_assigned_profiles jsonb
) returns void
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_profiles jsonb;
  v_status text;
  v_new_profiles jsonb;
  v_new_used int;
  v_idx int;
  v_sp jsonb;
begin
  select profiles, status into v_profiles, v_status
  from public.accounts
  where id = p_account_id and user_id = p_user_id
  for update;

  if not found then
    return;
  end if;

  v_new_profiles := coalesce(v_profiles, '[]'::jsonb);

  if p_sale_type = 'cuenta_completa' then
    select jsonb_agg(jsonb_build_object('name', 'Disponible', 'pin', ''))
    into v_new_profiles
    from jsonb_array_elements(v_new_profiles);
    v_new_used := 0;
    if v_status in ('vendida', 'alquilada') then
      v_status := 'activa';
    end if;
  else
    for v_sp in select * from jsonb_array_elements(coalesce(p_assigned_profiles, '[]'::jsonb))
    loop
      for v_idx in 0 .. jsonb_array_length(v_new_profiles) - 1
      loop
        if (v_new_profiles -> v_idx ->> 'name') = (v_sp->>'name')
           and (v_new_profiles -> v_idx ->> 'pin') = (v_sp->>'pin') then
          v_new_profiles := jsonb_set(
            v_new_profiles, array[v_idx::text],
            jsonb_build_object('name', 'Disponible', 'pin', '')
          );
        end if;
      end loop;
    end loop;

    select count(*) into v_new_used
    from jsonb_array_elements(v_new_profiles) p
    where (p->>'name') is not null and lower(p->>'name') <> 'disponible' and (p->>'name') <> '';
  end if;

  update public.accounts
  set profiles = v_new_profiles, used_screens = v_new_used, status = coalesce(v_status, status)
  where id = p_account_id and user_id = p_user_id;
end;
$$;

grant execute on function public._release_sale_profiles(uuid, uuid, text, int, jsonb) to authenticated;

-- ---------------------------------------------------------------------
-- Helper: ocupa los perfiles que una venta necesita.
-- ---------------------------------------------------------------------
create or replace function public._occupy_sale_profiles(
  p_account_id uuid, p_user_id uuid, p_assigned_profiles jsonb
) returns void
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_profiles jsonb;
  v_new_profiles jsonb;
  v_new_used int;
  v_idx int;
  v_profile jsonb;
  v_slot_found boolean;
begin
  select profiles into v_profiles
  from public.accounts
  where id = p_account_id and user_id = p_user_id
  for update;

  if not found then
    return;
  end if;

  v_new_profiles := coalesce(v_profiles, '[]'::jsonb);

  for v_profile in select * from jsonb_array_elements(coalesce(p_assigned_profiles, '[]'::jsonb))
  loop
    v_slot_found := false;
    for v_idx in 0 .. jsonb_array_length(v_new_profiles) - 1
    loop
      if not v_slot_found and (
        (v_new_profiles -> v_idx ->> 'name') is null
        or lower(v_new_profiles -> v_idx ->> 'name') = 'disponible'
        or (v_new_profiles -> v_idx ->> 'name') = ''
      ) then
        v_new_profiles := jsonb_set(
          v_new_profiles, array[v_idx::text],
          jsonb_build_object('name', v_profile->>'name', 'pin', v_profile->>'pin')
        );
        v_slot_found := true;
      end if;
    end loop;
  end loop;

  select count(*) into v_new_used
  from jsonb_array_elements(v_new_profiles) p
  where (p->>'name') is not null and lower(p->>'name') <> 'disponible' and (p->>'name') <> '';

  update public.accounts
  set profiles = v_new_profiles, used_screens = v_new_used
  where id = p_account_id and user_id = p_user_id;
end;
$$;

grant execute on function public._occupy_sale_profiles(uuid, uuid, jsonb) to authenticated;

-- ---------------------------------------------------------------------
-- update_sale_with_sync: edita la venta y resincroniza la cuenta —
-- libera lo que la versión ANTERIOR de la venta ocupaba, y ocupa lo que
-- la versión NUEVA necesita (funciona aunque cambie de cuenta, de tipo
-- de venta, o de perfiles asignados).
-- ---------------------------------------------------------------------
create or replace function public.update_sale_with_sync(p_sale jsonb)
returns void
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_sale_id uuid;
  v_old_account_id uuid;
  v_old_sale_type text;
  v_old_screens_count int;
  v_old_assigned jsonb;
  v_new_account_id uuid;
  v_new_sale_type text;
  v_new_assigned jsonb;
begin
  if v_user_id is null then
    raise exception 'No autenticado';
  end if;

  v_sale_id := (p_sale->>'id')::uuid;

  select account_id, sale_type, screens_count, assigned_profiles
  into v_old_account_id, v_old_sale_type, v_old_screens_count, v_old_assigned
  from public.sales
  where id = v_sale_id and user_id = v_user_id;

  if not found then
    raise exception 'Venta no encontrada';
  end if;

  -- 1) Libera lo que ocupaba la versión ANTERIOR de la venta.
  if v_old_account_id is not null then
    perform public._release_sale_profiles(v_old_account_id, v_user_id, v_old_sale_type, v_old_screens_count, v_old_assigned);
  end if;

  v_new_account_id := nullif(p_sale->>'account_id', '')::uuid;
  v_new_sale_type := p_sale->>'sale_type';
  v_new_assigned := coalesce(p_sale->'assigned_profiles', '[]'::jsonb);

  -- 2) Aplica los datos nuevos a la venta.
  update public.sales set
    client_id = nullif(p_sale->>'client_id', '')::uuid,
    account_id = v_new_account_id,
    service_name = p_sale->>'service_name',
    sale_type = v_new_sale_type,
    amount = (p_sale->>'amount')::numeric,
    date = (p_sale->>'date')::timestamptz,
    expiry_date = (p_sale->>'expiry_date')::timestamptz,
    screens_count = coalesce((p_sale->>'screens_count')::int, 1),
    assigned_profiles = v_new_assigned,
    exchange_rate = coalesce((p_sale->>'exchange_rate')::numeric, 1),
    is_partial = coalesce((p_sale->>'is_partial')::boolean, false),
    initial_payment = coalesce((p_sale->>'initial_payment')::numeric, 0),
    invited_email = nullif(p_sale->>'invited_email', ''),
    invited_password = nullif(p_sale->>'invited_password', ''),
    reseller_id = nullif(p_sale->>'reseller_id', '')::uuid,
    notes = nullif(p_sale->>'notes', '')
  where id = v_sale_id and user_id = v_user_id;

  -- 3) Ocupa lo que necesita la versión NUEVA.
  if v_new_sale_type = 'por_pantalla' and v_new_account_id is not null then
    perform public._occupy_sale_profiles(v_new_account_id, v_user_id, v_new_assigned);
  end if;
end;
$$;

grant execute on function public.update_sale_with_sync(jsonb) to authenticated;
