-- =====================================================================
-- 0001_transactional_rpcs.sql
-- =====================================================================
-- Corrige dos problemas encontrados en auditoría:
--
-- 1) BUG FUNCIONAL EN PRODUCCIÓN: el flujo activo de "registrar venta"
--    (SaleModal -> DataContext.addSale -> useSales.ts) SOLO inserta la
--    fila en `sales`. La lógica que marca los perfiles de la cuenta como
--    ocupados y descuenta pantallas disponibles (`used_screens`,
--    `profiles`) quedó únicamente en un hook legacy (useSupabaseData.ts)
--    que ya no está conectado a la UI real. Lo mismo pasa al borrar una
--    venta: no se liberan los perfiles de vuelta.
--    Resultado: el inventario de pantallas/perfiles se desincroniza de
--    las ventas reales con el uso normal de la app.
--
-- 2) Antes, crear/borrar una venta hacía 3-4 llamadas HTTP secuenciales
--    desde el navegador (leer cuenta -> mutar -> guardar -> insertar
--    venta). Si el usuario perdía conexión a mitad de camino, quedaban
--    datos a medias. Ahora es una sola llamada RPC, ejecutada como una
--    transacción atómica dentro de Postgres.
--
-- CÓMO APLICAR: pegar este archivo completo en el SQL Editor de tu
-- proyecto de Supabase y ejecutarlo. Es idempotente (usa CREATE OR
-- REPLACE), se puede correr varias veces sin romper nada.
--
-- IMPORTANTE: pruébalo primero contra un proyecto de Supabase de
-- staging/desarrollo con datos de prueba, no directo en producción.
-- No tengo forma de ejecutar ni probar esto contra tu base real desde
-- este entorno (sin acceso a internet), así que va sin verificar contra
-- tus datos reales.
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1) create_sale_with_sync: inserta la venta y sincroniza la cuenta
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
    initial_payment, invited_email, invited_password, reseller_id, notes
  ) values (
    v_sale_id, v_user_id, nullif(p_sale->>'client_id','')::uuid, v_account_id,
    p_sale->>'service_name', v_sale_type, (p_sale->>'amount')::numeric,
    (p_sale->>'date')::timestamptz, (p_sale->>'expiry_date')::timestamptz,
    coalesce((p_sale->>'screens_count')::int, 1), v_assigned_profiles,
    coalesce((p_sale->>'exchange_rate')::numeric, 1),
    coalesce((p_sale->>'is_partial')::boolean, false),
    coalesce((p_sale->>'initial_payment')::numeric, 0),
    nullif(p_sale->>'invited_email',''), nullif(p_sale->>'invited_password',''),
    nullif(p_sale->>'reseller_id','')::uuid, nullif(p_sale->>'notes','')
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
-- 2) delete_sale_with_sync: borra la venta y libera perfiles/pantallas
-- ---------------------------------------------------------------------
create or replace function public.delete_sale_with_sync(p_sale_id uuid)
returns void
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_sale record;
  v_account_profiles jsonb;
  v_used_screens int;
  v_status text;
  v_new_profiles jsonb;
  v_new_used int;
  v_idx int;
  v_assigned jsonb;
  v_sp jsonb;
begin
  if v_user_id is null then
    raise exception 'No autenticado';
  end if;

  select id, account_id, sale_type, screens_count, assigned_profiles
  into v_sale
  from public.sales
  where id = p_sale_id and user_id = v_user_id;

  if not found then
    raise exception 'Venta no encontrada';
  end if;

  if v_sale.account_id is not null then
    select profiles, used_screens, status into v_account_profiles, v_used_screens, v_status
    from public.accounts
    where id = v_sale.account_id and user_id = v_user_id
    for update;

    if found then
      v_new_profiles := coalesce(v_account_profiles, '[]'::jsonb);
      v_new_used := greatest(0, coalesce(v_used_screens, 0) - coalesce(v_sale.screens_count, 1));

      if v_sale.sale_type = 'cuenta_completa' then
        -- Libera TODOS los perfiles de la cuenta.
        select jsonb_agg(jsonb_build_object('name', 'Disponible', 'pin', ''))
        into v_new_profiles
        from jsonb_array_elements(v_new_profiles);
        v_new_used := 0;
        if v_status in ('vendida', 'alquilada') then
          v_status := 'activa';
        end if;
      else
        -- Libera solo los perfiles que esta venta había ocupado.
        v_assigned := coalesce(v_sale.assigned_profiles, '[]'::jsonb);
        for v_sp in select * from jsonb_array_elements(v_assigned)
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
      where id = v_sale.account_id and user_id = v_user_id;
    end if;
  end if;

  delete from public.sales where id = p_sale_id and user_id = v_user_id;
end;
$$;

grant execute on function public.delete_sale_with_sync(uuid) to authenticated;

-- ---------------------------------------------------------------------
-- 3) execute_transfer: mueve saldo entre dos cuentas financieras en una
--    sola transacción (antes eran 4 llamadas HTTP separadas desde el
--    cliente: insertar movimiento salida, actualizar balance origen,
--    insertar movimiento entrada, actualizar balance destino).
-- ---------------------------------------------------------------------
create or replace function public.execute_transfer(
  p_origin_id uuid,
  p_dest_id uuid,
  p_amount numeric,
  p_rate numeric,
  p_description text
)
returns void
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_origin record;
  v_dest record;
  v_dest_amount numeric;
  v_strong_currencies text[] := array['USD', 'USDT', 'USDC', 'EUR'];
  v_is_origin_strong boolean;
  v_is_dest_strong boolean;
  v_date timestamptz := now();
begin
  if v_user_id is null then
    raise exception 'No autenticado';
  end if;

  select id, name, currency, balance into v_origin
  from public.financial_accounts
  where id = p_origin_id and user_id = v_user_id
  for update;

  select id, name, currency, balance into v_dest
  from public.financial_accounts
  where id = p_dest_id and user_id = v_user_id
  for update;

  if v_origin.id is null or v_dest.id is null then
    raise exception 'Cuenta financiera no encontrada';
  end if;

  v_dest_amount := p_amount;
  v_is_origin_strong := v_origin.currency = any(v_strong_currencies);
  v_is_dest_strong := v_dest.currency = any(v_strong_currencies);

  if v_origin.currency <> v_dest.currency then
    if v_is_origin_strong and not v_is_dest_strong then
      v_dest_amount := p_amount * p_rate;
    elsif not v_is_origin_strong and v_is_dest_strong and p_rate > 0 then
      v_dest_amount := p_amount / p_rate;
    end if;
  end if;
  v_dest_amount := round(v_dest_amount, 2);

  insert into public.movements (
    id, user_id, account_id, related_account_id, type, amount, currency,
    exchange_rate, usd_equivalent, date, description, payment_method
  ) values (
    gen_random_uuid(), v_user_id, p_origin_id, p_dest_id, 'transfer_out', p_amount,
    v_origin.currency, p_rate, p_amount, v_date,
    'Transferencia a ' || v_dest.name || ': ' || coalesce(p_description, ''), 'Transferencia'
  );

  insert into public.movements (
    id, user_id, account_id, related_account_id, type, amount, currency,
    exchange_rate, usd_equivalent, date, description, payment_method
  ) values (
    gen_random_uuid(), v_user_id, p_dest_id, p_origin_id, 'transfer_in', v_dest_amount,
    v_dest.currency, p_rate, p_amount, v_date,
    'Recibido de ' || v_origin.name || ': ' || coalesce(p_description, ''), 'Transferencia'
  );

  update public.financial_accounts set balance = balance - p_amount where id = p_origin_id and user_id = v_user_id;
  update public.financial_accounts set balance = balance + v_dest_amount where id = p_dest_id and user_id = v_user_id;
end;
$$;

grant execute on function public.execute_transfer(uuid, uuid, numeric, numeric, text) to authenticated;

-- ---------------------------------------------------------------------
-- 4) recalculate_account_balance: suma los movimientos EN EL SERVIDOR
--    en vez de traer todo el historial de movimientos al navegador para
--    sumarlo en JavaScript.
-- ---------------------------------------------------------------------
create or replace function public.recalculate_account_balance(p_account_id uuid)
returns numeric
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_balance numeric;
begin
  if v_user_id is null then
    raise exception 'No autenticado';
  end if;

  select coalesce(sum(
    case when type in ('funding', 'transfer_in') then amount else -amount end
  ), 0)
  into v_balance
  from public.movements
  where account_id = p_account_id and user_id = v_user_id;

  update public.financial_accounts
  set balance = v_balance
  where id = p_account_id and user_id = v_user_id;

  return v_balance;
end;
$$;

grant execute on function public.recalculate_account_balance(uuid) to authenticated;

-- ---------------------------------------------------------------------
-- 5) execute_single_movement: inserta UN movimiento y ajusta el balance
--    de la cuenta financiera en la misma transacción. Reemplaza el patrón
--    "insertar movimiento -> leer balance en el cliente -> actualizar
--    balance" (2 llamadas HTTP separadas, no atómicas) que usa
--    executeTransaction() para depósitos/retiros sueltos.
-- ---------------------------------------------------------------------
create or replace function public.execute_single_movement(p_movement jsonb)
returns jsonb
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_movement_id uuid;
  v_account_id uuid;
  v_type text;
  v_amount numeric;
  v_balance numeric;
begin
  if v_user_id is null then
    raise exception 'No autenticado';
  end if;

  v_movement_id := coalesce(nullif(p_movement->>'id','')::uuid, gen_random_uuid());
  v_account_id := (p_movement->>'account_id')::uuid;
  v_type := p_movement->>'type';
  v_amount := (p_movement->>'amount')::numeric;

  insert into public.movements (
    id, user_id, account_id, related_account_id, type, amount, currency,
    exchange_rate, usd_equivalent, date, description, payment_method
  ) values (
    v_movement_id, v_user_id, v_account_id, nullif(p_movement->>'related_account_id','')::uuid,
    v_type, v_amount, p_movement->>'currency',
    coalesce((p_movement->>'exchange_rate')::numeric, 1),
    coalesce((p_movement->>'usd_equivalent')::numeric, 0),
    (p_movement->>'date')::timestamptz, p_movement->>'description', p_movement->>'payment_method'
  );

  select balance into v_balance
  from public.financial_accounts
  where id = v_account_id and user_id = v_user_id
  for update;

  if found then
    if v_type in ('funding', 'transfer_in') then
      v_balance := v_balance + v_amount;
    else
      v_balance := v_balance - v_amount;
    end if;

    update public.financial_accounts
    set balance = v_balance
    where id = v_account_id and user_id = v_user_id;
  end if;

  return jsonb_build_object('id', v_movement_id, 'balance', v_balance);
end;
$$;

grant execute on function public.execute_single_movement(jsonb) to authenticated;

-- ---------------------------------------------------------------------
-- Índices recomendados (revisa primero si ya existen con \d en psql o
-- el tab "Indexes" del dashboard de Supabase antes de crearlos).
-- ---------------------------------------------------------------------
create index if not exists idx_sales_user_date on public.sales (user_id, date desc);
create index if not exists idx_movements_user_account on public.movements (user_id, account_id);
create index if not exists idx_accounts_user_status on public.accounts (user_id, status);
create index if not exists idx_clients_user_reseller on public.clients (user_id, reseller_id);
