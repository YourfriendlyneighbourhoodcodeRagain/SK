-- Cryptographic, append-only handoff ledger. This migration preserves all
-- existing records: rows created before this migration remain ledger_version 0.
create extension if not exists pgcrypto;

alter table public.batch_handoffs
  add column if not exists location text,
  add column if not exists prev_hash text,
  add column if not exists current_hash text,
  add column if not exists ledger_version integer not null default 0;

alter table public.batch_handoffs
  add constraint batch_handoffs_ledger_version_check check (ledger_version in (0, 1));

create index if not exists batch_handoffs_ledger_order_idx
  on public.batch_handoffs (batch_id, created_at desc, id desc)
  where ledger_version = 1;

-- Both SQL and src/lib/ledger-core.ts use this exact base64 field order.
create or replace function public.handoff_canonical_payload(
  p_batch_id uuid, p_actor_id uuid, p_stage text, p_location text,
  p_notes text, p_created_at timestamptz, p_prev_hash text
) returns text language sql immutable strict as $$
  select concat_ws('|',
    'batch_id=' || encode(convert_to(p_batch_id::text, 'UTF8'), 'base64'),
    'actor_id=' || encode(convert_to(p_actor_id::text, 'UTF8'), 'base64'),
    'stage=' || encode(convert_to(p_stage, 'UTF8'), 'base64'),
    'location=' || encode(convert_to(p_location, 'UTF8'), 'base64'),
    'notes=' || encode(convert_to(p_notes, 'UTF8'), 'base64'),
    'created_at=' || encode(convert_to(to_char(p_created_at at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"'), 'UTF8'), 'base64'),
    'prev_hash=' || encode(convert_to(p_prev_hash, 'UTF8'), 'base64')
  );
$$;

create or replace function public.record_batch_handoff(
  p_batch_id uuid,
  p_stage text,
  p_location text default null,
  p_notes text default null,
  p_assigned_distributor_name text default null,
  p_assigned_retailer_name text default null,
  p_quantity_kg numeric default null
) returns public.batch_handoffs
language plpgsql security definer set search_path = public, extensions as $$
declare
  v_actor_id uuid := auth.uid();
  v_role public.user_role;
  v_location text;
  v_prev_hash text := 'SK_LEDGER_GENESIS_V1';
  v_created_at timestamptz := date_trunc('milliseconds', clock_timestamp());
  v_current_hash text;
  v_row public.batch_handoffs;
begin
  if v_actor_id is null then raise exception 'Authentication is required'; end if;
  select role, location into v_role, v_location from public.profiles where id = v_actor_id;
  if v_role not in ('farmer', 'aggregator', 'distributor', 'retailer') then raise exception 'This role cannot record a supply-chain handoff'; end if;
  if p_stage not in ('harvest', 'aggregation', 'logistics', 'retail') then raise exception 'Invalid handoff stage'; end if;
  if (v_role = 'farmer' and p_stage <> 'harvest')
     or (v_role = 'retailer' and p_stage <> 'retail')
     or (v_role = 'distributor' and p_stage <> 'logistics')
     or (v_role = 'aggregator' and p_stage not in ('aggregation', 'logistics')) then
    raise exception 'Role % cannot record stage %', v_role, p_stage;
  end if;

  -- Locks the batch row, serializing concurrent appends for this batch.
  perform 1 from public.batches where id = p_batch_id for update;
  if not found then raise exception 'Batch not found'; end if;
  select current_hash into v_prev_hash from public.batch_handoffs
    where batch_id = p_batch_id and ledger_version = 1
    order by created_at desc, id desc limit 1;
  v_prev_hash := coalesce(v_prev_hash, 'SK_LEDGER_GENESIS_V1');
  v_location := coalesce(p_location, v_location, '');
  v_current_hash := encode(digest(convert_to(public.handoff_canonical_payload(
    p_batch_id, v_actor_id, p_stage, v_location, coalesce(p_notes, ''), v_created_at, v_prev_hash
  ), 'UTF8'), 'sha256'), 'hex');

  insert into public.batch_handoffs (
    batch_id, handler_id, stage, location, notes, assigned_distributor_name,
    assigned_retailer_name, quantity_kg, prev_hash, current_hash, ledger_version, created_at
  ) values (
    p_batch_id, v_actor_id, p_stage, v_location, p_notes, p_assigned_distributor_name,
    p_assigned_retailer_name, p_quantity_kg, v_prev_hash, v_current_hash, 1, v_created_at
  ) returning * into v_row;
  return v_row;
end;
$$;

alter table public.batch_handoffs enable row level security;
revoke insert, update, delete on public.batch_handoffs from anon, authenticated;
grant execute on function public.record_batch_handoff(uuid, text, text, text, text, text, numeric) to authenticated;

drop policy if exists "Read handoffs for traceability" on public.batch_handoffs;
create policy "Read handoffs for traceability" on public.batch_handoffs for select using (true);

-- No UPDATE or DELETE policies are created: ledger rows are append-only.
