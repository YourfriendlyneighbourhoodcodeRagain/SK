-- Handoff Blockchain Anchors Table for Polygon Amoy
create table if not exists public.handoff_blockchain_anchors (
  id uuid primary key default gen_random_uuid(),
  handoff_id uuid references public.batch_handoffs(id) on delete cascade,
  tx_hash text not null,
  committed_hash text not null,
  network text not null default 'polygon-amoy',
  created_at timestamptz default now()
);

create index if not exists handoff_blockchain_anchors_handoff_id_idx
  on public.handoff_blockchain_anchors(handoff_id);

alter table public.handoff_blockchain_anchors enable row level security;

drop policy if exists "Read blockchain anchors" on public.handoff_blockchain_anchors;
create policy "Read blockchain anchors" on public.handoff_blockchain_anchors for select using (true);

drop policy if exists "Insert blockchain anchors" on public.handoff_blockchain_anchors;
create policy "Insert blockchain anchors" on public.handoff_blockchain_anchors for insert with check (true);
