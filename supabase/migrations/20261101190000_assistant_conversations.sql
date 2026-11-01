-- ADR 0007: saved Recruta bot chats. Each chat belongs to one member of one
-- workspace; nobody else (managers included) can read it. Chats are personal
-- working notes, so their owner may delete them; messages go with the chat.

create table public.assistant_conversations (
  id uuid primary key,
  agency_id uuid not null,
  user_id uuid not null,
  title text not null check (char_length(btrim(title)) between 1 and 120),
  created_at timestamptz not null default clock_timestamp(),
  updated_at timestamptz not null default clock_timestamp(),
  unique (agency_id, id),
  foreign key (agency_id, user_id) references public.agency_memberships(agency_id, user_id) on delete cascade
);
create index assistant_conversations_recent_idx
  on public.assistant_conversations(agency_id, user_id, updated_at desc, id desc);

create table public.assistant_messages (
  id uuid primary key,
  agency_id uuid not null,
  conversation_id uuid not null,
  role text not null check (role in ('user','assistant')),
  content text not null check (char_length(content) between 1 and 20000),
  actions jsonb not null default '[]'::jsonb check (jsonb_typeof(actions) = 'array'),
  links jsonb not null default '[]'::jsonb check (jsonb_typeof(links) = 'array'),
  -- Summaries of the lookups behind a reply (tool, label, result, timing); no raw data.
  trace jsonb not null default '[]'::jsonb check (jsonb_typeof(trace) = 'array'),
  duration_ms integer check (duration_ms is null or duration_ms >= 0),
  created_at timestamptz not null default clock_timestamp(),
  foreign key (agency_id, conversation_id) references public.assistant_conversations(agency_id, id) on delete cascade
);
create index assistant_messages_conversation_idx
  on public.assistant_messages(agency_id, conversation_id, created_at, id);

alter table public.assistant_conversations enable row level security;
alter table public.assistant_messages enable row level security;

create policy assistant_conversations_owner on public.assistant_conversations for all to authenticated
  using (user_id = (select auth.uid()) and private.is_active_agency_member(agency_id))
  with check (user_id = (select auth.uid()) and private.is_active_agency_member(agency_id));

create policy assistant_messages_owner on public.assistant_messages for all to authenticated
  using (exists (
    select 1 from public.assistant_conversations c
    where c.agency_id = assistant_messages.agency_id and c.id = assistant_messages.conversation_id
      and c.user_id = (select auth.uid()) and private.is_active_agency_member(c.agency_id)))
  with check (exists (
    select 1 from public.assistant_conversations c
    where c.agency_id = assistant_messages.agency_id and c.id = assistant_messages.conversation_id
      and c.user_id = (select auth.uid()) and private.is_active_agency_member(c.agency_id)));

revoke all on public.assistant_conversations, public.assistant_messages from public, anon, authenticated;
grant select, insert, delete on public.assistant_conversations to authenticated;
grant update (title, updated_at) on public.assistant_conversations to authenticated;
-- Messages are append-only for their owner.
grant select, insert on public.assistant_messages to authenticated;
grant all on public.assistant_conversations, public.assistant_messages to service_role;
