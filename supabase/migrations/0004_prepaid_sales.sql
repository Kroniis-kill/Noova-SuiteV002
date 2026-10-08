-- =====================================================================
-- 0004: Planes prepagados (el cliente ya pagó; tú renuevas la cuenta)
--
-- expiry_date  = "Pagado hasta"  (lo que se cobra al cliente)
-- renewal_date = próxima fecha en que TÚ debes renovar la cuenta
-- renew_every_months = cada cuántos meses se repite esa renovación
--
-- Las columnas son opcionales: las ventas existentes quedan igual
-- (is_prepaid = false). Ejecutar completo en el SQL Editor de Supabase.
-- =====================================================================

alter table public.sales
  add column if not exists is_prepaid boolean not null default false,
  add column if not exists renewal_date timestamptz,
  add column if not exists renew_every_months int;

-- Índice parcial: solo indexa las ventas prepagadas
create index if not exists sales_prepaid_renewal_idx
  on public.sales (user_id, renewal_date)
  where is_prepaid;

-- ---------------------------------------------------------------------
-- create_sale_with_sync (0001) + los 3 campos nuevos
-- ---------------------------------------------------------------------
create or replace function public.create_sale_with_sync(p_sale jsonb)
returns jsonb
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_sale_id uuid;
  v_account_id uuid;
  v_sale_type text;
  v_assigned_profiles jsonb;
  v_account_profiles jsonb;
  v_new_profiles jsonb;
  v_new_used int;
  v_profile jsonb;
  v_idx int;
  v_slot_found boolean;
begin
  if v_user_id is null then
    raise exception 'No autenticado';
  end if;

  v_sale_id := coalesce(nullif(p_sale->>'id', '')::uuid, gen_random_uuid());
  v_account_id := nullif(p_sale->>'account_id', '')::uuid;
  v_sale_type := p_sale->>'sale_type';
  v_assigned_profiles := coalesce(p_sale->'assigned_profiles', '[]'::jsonb);

  insert into public.sales (
    id, user_id, client_id, account_id, service_name, sale_type, amount, date,
    expiry_date, screens_count, assigned_profiles, exchange_rate, is_partial,
    initial_payment, invited_email, invited_password, reseller_id, notes,
    is_prepaid, renewal_date, renew_every_months
  ) values (
    v_sale_id, v_user_id, nullif(p_sale->>'client_id','')::uuid, v_account_id,
    p_sale->>'service_name', v_sale_type, (p_sale->>'amount')::numeric,
    (p_sale->>'date')::timestamptz, (p_sale->>'expiry_date')::timestamptz,
    coalesce((p_sale->>'screens_count')::int, 1), v_assigned_profiles,
    coalesce((p_sale->>'exchange_rate')::numeric, 1),
    coalesce((p_sale->>'is_partial')::boolean, false),
    coalesce((p_sale->>'initial_payment')::numeric, 0),
    nullif(p_sale->>'invited_email',''), nullif(p_sale->>'invited_password',''),
    nullif(p_sale->>'reseller_id','')::uuid, nullif(p_sale->>'notes',''),
    coalesce((p_sale->>'is_prepaid')::boolean, false),
    nullif(p_sale->>'renewal_date','')::timestamptz,
    nullif(p_sale->>'renew_every_months','')::int
  );

  -- Solo las ventas "por_pantalla" ocupan un perfil específico de la cuenta.
  if v_sale_type = 'por_pantalla' and v_account_id is not null then
    -- FOR UPDATE: bloquea la fila mientras dura la transacción, para que
    -- dos ventas simultáneas sobre la misma cuenta no pisen el mismo slot.
    select profiles into v_account_profiles
    from public.accounts
    where id = v_account_id and user_id = v_user_id
    for update;

    if found then
      v_new_profiles := coalesce(v_account_profiles, '[]'::jsonb);

      for v_profile in select * from jsonb_array_elements(v_assigned_profiles)
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
      where id = v_account_id and user_id = v_user_id;
    end if;
  end if;

  return jsonb_build_object('id', v_sale_id);
end;
$$;

grant execute on function public.create_sale_with_sync(jsonb) to authenticated;

-- ---------------------------------------------------------------------
-- update_sale_with_sync (0002) + los 3 campos nuevos
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
    notes = nullif(p_sale->>'notes', ''),
    is_prepaid = coalesce((p_sale->>'is_prepaid')::boolean, false),
    renewal_date = nullif(p_sale->>'renewal_date', '')::timestamptz,
    renew_every_months = nullif(p_sale->>'renew_every_months', '')::int
  where id = v_sale_id and user_id = v_user_id;

  -- 3) Ocupa lo que necesita la versión NUEVA.
  if v_new_sale_type = 'por_pantalla' and v_new_account_id is not null then
    perform public._occupy_sale_profiles(v_new_account_id, v_user_id, v_new_assigned);
  end if;
end;
$$;

grant execute on function public.update_sale_with_sync(jsonb) to authenticated;
