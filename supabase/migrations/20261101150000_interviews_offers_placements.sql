-- ADR 0008: interviews, offers and placements.
-- Reviewers read these through can_review_application. Every write goes
-- through private.manage_pipeline so stage changes, the job's openings and
-- audit history stay consistent.

create table public.interviews (
  id uuid primary key,
  agency_id uuid not null,
  application_id uuid not null,
  round integer not null check (round between 1 and 20),
  title text not null check (char_length(btrim(title)) between 1 and 120),
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  timezone text not null check (char_length(timezone) between 1 and 64),
  format text not null check (format in ('video','phone','in_person')),
  location text check (location is null or char_length(location) <= 500),
  interviewer_ids uuid[] not null default '{}',
  guests text check (guests is null or char_length(guests) <= 500),
  status text not null default 'scheduled' check (status in ('scheduled','completed','cancelled','no_show')),
  outcome text check (outcome in ('advance','hold','decline')),
  outcome_note text check (outcome_note is null or char_length(outcome_note) <= 2000),
  cancel_reason text check (cancel_reason is null or char_length(cancel_reason) <= 2000),
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default clock_timestamp(),
  updated_at timestamptz not null default clock_timestamp(),
  check (ends_at > starts_at),
  check ((status = 'completed') = (outcome is not null)),
  unique (agency_id, id),
  foreign key (agency_id, application_id) references public.applications(agency_id, id) on delete restrict
);
create index interviews_application_idx on public.interviews(agency_id, application_id, starts_at desc);
create index interviews_upcoming_idx on public.interviews(agency_id, starts_at) where status = 'scheduled';

create table public.offers (
  id uuid primary key,
  agency_id uuid not null,
  application_id uuid not null,
  status text not null default 'draft' check (status in ('draft','extended','accepted','declined','withdrawn','expired')),
  salary_amount numeric(14,2) check (salary_amount is null or salary_amount >= 0),
  currency char(3),
  salary_period text check (salary_period in ('hourly','daily','weekly','monthly','annually')),
  start_date date,
  expires_at date,
  notes text check (notes is null or char_length(notes) <= 2000),
  decision_reason text check (decision_reason is null or char_length(decision_reason) <= 2000),
  extended_at timestamptz,
  decided_at timestamptz,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default clock_timestamp(),
  updated_at timestamptz not null default clock_timestamp(),
  check (status <> 'accepted' or start_date is not null),
  unique (agency_id, id),
  foreign key (agency_id, application_id) references public.applications(agency_id, id) on delete restrict
);
-- One live offer per application; closed offers stay for history.
create unique index offers_one_live_idx on public.offers(agency_id, application_id)
  where status in ('draft','extended','accepted');

create table public.placements (
  id uuid primary key,
  agency_id uuid not null,
  application_id uuid not null,
  job_id uuid not null,
  offer_id uuid not null,
  opening_number integer not null check (opening_number >= 1),
  start_date date not null,
  status text not null default 'pending_start' check (status in ('pending_start','started','fell_through')),
  fell_through_reason text check (fell_through_reason is null or char_length(fell_through_reason) <= 2000),
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default clock_timestamp(),
  updated_at timestamptz not null default clock_timestamp(),
  check ((status = 'fell_through') = (fell_through_reason is not null)),
  unique (agency_id, id),
  foreign key (agency_id, application_id) references public.applications(agency_id, id) on delete restrict,
  foreign key (agency_id, job_id) references public.jobs(agency_id, id) on delete restrict,
  foreign key (agency_id, offer_id) references public.offers(agency_id, id) on delete restrict
);
-- An opening and an application can each hold only one active placement.
create unique index placements_active_opening_idx on public.placements(agency_id, job_id, opening_number)
  where status <> 'fell_through';
create unique index placements_active_application_idx on public.placements(agency_id, application_id)
  where status <> 'fell_through';

-- Fees are commercial data: owners and administrators only.
create table public.placement_fees (
  placement_id uuid primary key,
  agency_id uuid not null,
  amount numeric(14,2) not null check (amount >= 0),
  currency char(3) not null,
  updated_at timestamptz not null default clock_timestamp(),
  foreign key (agency_id, placement_id) references public.placements(agency_id, id) on delete restrict
);

alter table public.interviews enable row level security;
alter table public.offers enable row level security;
alter table public.placements enable row level security;
alter table public.placement_fees enable row level security;
create policy interviews_read on public.interviews for select to authenticated
  using (private.can_review_application(agency_id, application_id));
create policy offers_read on public.offers for select to authenticated
  using (private.can_review_application(agency_id, application_id));
create policy placements_read on public.placements for select to authenticated
  using (private.can_review_application(agency_id, application_id));
create policy placement_fees_read on public.placement_fees for select to authenticated
  using (private.has_agency_role(agency_id, array['owner','administrator']));
revoke all on public.interviews, public.offers, public.placements, public.placement_fees from public, anon, authenticated;
grant select on public.interviews, public.offers, public.placements, public.placement_fees to authenticated;
grant all on public.interviews, public.offers, public.placements, public.placement_fees to service_role;

create or replace function private.pipeline_text(p_value text, p_max integer)
returns text language sql immutable set search_path = '' as $$
  select case when p_value is null or btrim(p_value) = '' then null
    when char_length(btrim(p_value)) > p_max then null
    else btrim(p_value) end
$$;

create or replace function private.manage_pipeline(
  p_agency_id uuid, p_application_id uuid, p_action text, p_payload jsonb,
  p_expected_updated_at timestamptz, p_request_id text
) returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  v_app public.applications;
  v_job public.jobs;
  v_interview public.interviews;
  v_offer public.offers;
  v_placement public.placements;
  v_id uuid := nullif(p_payload->>'id', '')::uuid;
  v_reason text := private.pipeline_text(p_payload->>'reason', 2000);
  v_event text;
  v_meta jsonb := '{}'::jsonb;
  v_opening integer;
  v_active integer;
  v_to text;
  v_ids uuid[];
begin
  if auth.uid() is null then raise exception 'authentication_required'; end if;
  if not private.can_review_application(p_agency_id, p_application_id) then raise exception 'application_not_found'; end if;
  if v_id is null then raise exception 'invalid_pipeline_request'; end if;
  select * into v_app from public.applications where agency_id = p_agency_id and id = p_application_id for update;
  if v_app.id is null then raise exception 'application_not_found'; end if;

  -- Interviews never change the application, so they need no version check.
  if p_action = 'schedule_interview' then
    if exists (select 1 from public.interviews where id = v_id) then
      if not exists (select 1 from public.interviews where id = v_id and agency_id = p_agency_id and application_id = p_application_id) then
        raise exception 'idempotency_conflict';
      end if;
      return jsonb_build_object('id', v_id, 'replayed', true);
    end if;
    if v_app.status not in ('shortlisted','client_review','interview','offer') then raise exception 'pipeline_not_eligible'; end if;
    select coalesce(array_agg(distinct t.v::uuid), '{}') into v_ids
      from jsonb_array_elements_text(coalesce(p_payload->'interviewerIds', '[]'::jsonb)) as t(v);
    if exists (
      select 1 from unnest(v_ids) as i(user_id)
      where not exists (select 1 from public.agency_memberships m where m.agency_id = p_agency_id and m.user_id = i.user_id and m.status = 'active')
    ) then raise exception 'invalid_interviewer'; end if;
    insert into public.interviews(id, agency_id, application_id, round, title, starts_at, ends_at, timezone, format, location, interviewer_ids, guests, created_by)
    values (
      v_id, p_agency_id, p_application_id,
      coalesce((select max(round) from public.interviews where agency_id = p_agency_id and application_id = p_application_id), 0) + 1,
      coalesce(private.pipeline_text(p_payload->>'title', 120), 'Interview'),
      (p_payload->>'startsAt')::timestamptz, (p_payload->>'endsAt')::timestamptz,
      coalesce(private.pipeline_text(p_payload->>'timezone', 64), 'UTC'),
      p_payload->>'format', private.pipeline_text(p_payload->>'location', 500), v_ids,
      private.pipeline_text(p_payload->>'guests', 500), auth.uid()
    ) returning * into v_interview;
    v_event := 'interview.scheduled';
    v_meta := jsonb_build_object('interviewId', v_id, 'round', v_interview.round, 'startsAt', v_interview.starts_at);

  elsif p_action in ('reschedule_interview','cancel_interview','complete_interview','no_show_interview') then
    select * into v_interview from public.interviews
      where id = v_id and agency_id = p_agency_id and application_id = p_application_id for update;
    if v_interview.id is null then raise exception 'interview_not_found'; end if;
    if v_interview.status <> 'scheduled' then raise exception 'interview_closed'; end if;
    if p_action = 'reschedule_interview' then
      update public.interviews set
        starts_at = (p_payload->>'startsAt')::timestamptz,
        ends_at = (p_payload->>'endsAt')::timestamptz,
        location = coalesce(private.pipeline_text(p_payload->>'location', 500), location),
        updated_at = clock_timestamp()
      where id = v_id returning * into v_interview;
      v_event := 'interview.rescheduled';
      v_meta := jsonb_build_object('interviewId', v_id, 'startsAt', v_interview.starts_at);
    elsif p_action = 'cancel_interview' then
      if char_length(coalesce(v_reason, '')) < 5 then raise exception 'pipeline_reason_required'; end if;
      update public.interviews set status = 'cancelled', cancel_reason = v_reason, updated_at = clock_timestamp() where id = v_id;
      v_event := 'interview.cancelled';
      v_meta := jsonb_build_object('interviewId', v_id, 'reason', v_reason);
    elsif p_action = 'no_show_interview' then
      update public.interviews set status = 'no_show', updated_at = clock_timestamp() where id = v_id;
      v_event := 'interview.no_show';
      v_meta := jsonb_build_object('interviewId', v_id);
    else
      if p_payload->>'outcome' not in ('advance','hold','decline') then raise exception 'invalid_pipeline_request'; end if;
      if char_length(coalesce(private.pipeline_text(p_payload->>'note', 2000), '')) < 5 then raise exception 'pipeline_reason_required'; end if;
      update public.interviews set status = 'completed', outcome = p_payload->>'outcome',
        outcome_note = private.pipeline_text(p_payload->>'note', 2000), updated_at = clock_timestamp()
      where id = v_id;
      v_event := 'interview.completed';
      v_meta := jsonb_build_object('interviewId', v_id, 'outcome', p_payload->>'outcome', 'reason', private.pipeline_text(p_payload->>'note', 2000));
    end if;

  elsif p_action = 'save_offer' then
    select * into v_offer from public.offers where id = v_id for update;
    if v_offer.id is not null and (v_offer.agency_id <> p_agency_id or v_offer.application_id <> p_application_id) then
      raise exception 'idempotency_conflict';
    end if;
    if v_offer.id is not null and v_offer.status not in ('draft','extended') then raise exception 'offer_closed'; end if;
    if v_app.status not in ('interview','offer') then raise exception 'pipeline_not_eligible'; end if;
    if v_offer.id is null then
      insert into public.offers(id, agency_id, application_id, salary_amount, currency, salary_period, start_date, expires_at, notes, created_by)
      values (v_id, p_agency_id, p_application_id,
        nullif(p_payload->>'salaryAmount', '')::numeric, upper(nullif(p_payload->>'currency', '')),
        nullif(p_payload->>'salaryPeriod', ''), nullif(p_payload->>'startDate', '')::date,
        nullif(p_payload->>'expiresAt', '')::date, private.pipeline_text(p_payload->>'notes', 2000), auth.uid());
      v_event := 'offer.drafted';
    else
      update public.offers set
        salary_amount = nullif(p_payload->>'salaryAmount', '')::numeric,
        currency = upper(nullif(p_payload->>'currency', '')),
        salary_period = nullif(p_payload->>'salaryPeriod', ''),
        start_date = nullif(p_payload->>'startDate', '')::date,
        expires_at = nullif(p_payload->>'expiresAt', '')::date,
        notes = private.pipeline_text(p_payload->>'notes', 2000),
        updated_at = clock_timestamp()
      where id = v_id;
      v_event := 'offer.updated';
    end if;
    v_meta := jsonb_build_object('offerId', v_id);

  elsif p_action = 'extend_offer' then
    if p_expected_updated_at is null or v_app.updated_at <> p_expected_updated_at then raise exception 'application_changed'; end if;
    select * into v_offer from public.offers where id = v_id and agency_id = p_agency_id and application_id = p_application_id for update;
    if v_offer.id is null then raise exception 'offer_not_found'; end if;
    if v_offer.status <> 'draft' then raise exception 'offer_closed'; end if;
    if v_app.status not in ('interview','offer') then raise exception 'pipeline_not_eligible'; end if;
    update public.offers set status = 'extended', extended_at = clock_timestamp(), updated_at = clock_timestamp() where id = v_id;
    if v_app.status <> 'offer' then
      update public.applications set status = 'offer', updated_at = clock_timestamp() where id = p_application_id returning * into v_app;
      insert into public.activity_events(agency_id, actor_user_id, event_type, entity_type, entity_id, request_id, metadata)
      values (p_agency_id, auth.uid(), 'application.status_changed', 'application', p_application_id, p_request_id,
        jsonb_build_object('from', 'interview', 'to', 'offer', 'reason', 'Offer extended'));
    end if;
    v_event := 'offer.extended';
    v_meta := jsonb_build_object('offerId', v_id);

  elsif p_action = 'decide_offer' then
    select * into v_offer from public.offers where id = v_id and agency_id = p_agency_id and application_id = p_application_id for update;
    if v_offer.id is null then raise exception 'offer_not_found'; end if;
    v_to := p_payload->>'decision';
    if not ((v_offer.status = 'extended' and v_to in ('accepted','declined','withdrawn','expired'))
      or (v_offer.status = 'draft' and v_to = 'withdrawn')) then raise exception 'invalid_offer_transition'; end if;
    if v_to <> 'accepted' and char_length(coalesce(v_reason, '')) < 5 then raise exception 'pipeline_reason_required'; end if;
    update public.offers set status = v_to, decision_reason = v_reason, decided_at = clock_timestamp(),
      start_date = coalesce(nullif(p_payload->>'startDate', '')::date, start_date), updated_at = clock_timestamp()
    where id = v_id returning * into v_offer;
    v_event := 'offer.' || v_to;
    v_meta := jsonb_build_object('offerId', v_id, 'reason', v_reason);

  elsif p_action = 'record_placement' then
    if p_expected_updated_at is null or v_app.updated_at <> p_expected_updated_at then raise exception 'application_changed'; end if;
    if exists (select 1 from public.placements where id = v_id) then raise exception 'idempotency_conflict'; end if;
    select * into v_offer from public.offers where id = nullif(p_payload->>'offerId', '')::uuid
      and agency_id = p_agency_id and application_id = p_application_id;
    if v_offer.id is null or v_offer.status <> 'accepted' then raise exception 'offer_not_accepted'; end if;
    if v_app.status <> 'offer' then raise exception 'pipeline_not_eligible'; end if;
    select * into v_job from public.jobs where agency_id = p_agency_id and id = v_app.job_id for update;
    select min(n) into v_opening from generate_series(1, v_job.positions_required) as s(n)
      where not exists (select 1 from public.placements p where p.agency_id = p_agency_id and p.job_id = v_job.id
        and p.opening_number = n and p.status <> 'fell_through');
    if v_opening is null then raise exception 'job_openings_filled'; end if;
    insert into public.placements(id, agency_id, application_id, job_id, offer_id, opening_number, start_date, created_by)
    values (v_id, p_agency_id, p_application_id, v_job.id, v_offer.id, v_opening,
      coalesce(nullif(p_payload->>'startDate', '')::date, v_offer.start_date), auth.uid())
    returning * into v_placement;
    if nullif(p_payload->>'feeAmount', '') is not null then
      if not private.has_agency_role(p_agency_id, array['owner','administrator']) then raise exception 'permission_denied'; end if;
      insert into public.placement_fees(placement_id, agency_id, amount, currency)
      values (v_id, p_agency_id, (p_payload->>'feeAmount')::numeric, upper(coalesce(nullif(p_payload->>'feeCurrency', ''), v_offer.currency)));
    end if;
    update public.applications set status = 'placed', updated_at = clock_timestamp() where id = p_application_id returning * into v_app;
    insert into public.activity_events(agency_id, actor_user_id, event_type, entity_type, entity_id, request_id, metadata)
    values (p_agency_id, auth.uid(), 'application.status_changed', 'application', p_application_id, p_request_id,
      jsonb_build_object('from', 'offer', 'to', 'placed', 'reason', 'Placement recorded'));
    select count(*) into v_active from public.placements where agency_id = p_agency_id and job_id = v_job.id and status <> 'fell_through';
    if v_active >= v_job.positions_required and v_job.status in ('open','on_hold') then
      update public.jobs set status = 'filled', accepting_applications = false, updated_at = now() where id = v_job.id;
      insert into public.activity_events(agency_id, actor_user_id, event_type, entity_type, entity_id, request_id, metadata)
      values (p_agency_id, auth.uid(), 'job.status_changed', 'job', v_job.id, p_request_id, jsonb_build_object('to', 'filled', 'reason', 'All openings placed'));
    end if;
    v_event := 'placement.recorded';
    v_meta := jsonb_build_object('placementId', v_id, 'opening', v_opening, 'startDate', v_placement.start_date);

  elsif p_action in ('start_placement','placement_fell_through') then
    if p_action = 'placement_fell_through' and (p_expected_updated_at is null or v_app.updated_at <> p_expected_updated_at) then
      raise exception 'application_changed';
    end if;
    select * into v_placement from public.placements where id = v_id and agency_id = p_agency_id and application_id = p_application_id for update;
    if v_placement.id is null then raise exception 'placement_not_found'; end if;
    if p_action = 'start_placement' then
      if v_placement.status <> 'pending_start' then raise exception 'invalid_placement_transition'; end if;
      update public.placements set status = 'started', updated_at = clock_timestamp() where id = v_id;
      v_event := 'placement.started';
      v_meta := jsonb_build_object('placementId', v_id);
    else
      if v_placement.status = 'fell_through' then raise exception 'invalid_placement_transition'; end if;
      if char_length(coalesce(v_reason, '')) < 5 then raise exception 'pipeline_reason_required'; end if;
      v_to := coalesce(nullif(p_payload->>'returnTo', ''), 'withdrawn');
      if v_to not in ('offer','withdrawn') then raise exception 'invalid_pipeline_request'; end if;
      update public.placements set status = 'fell_through', fell_through_reason = v_reason, updated_at = clock_timestamp() where id = v_id;
      update public.applications set status = v_to, updated_at = clock_timestamp() where id = p_application_id returning * into v_app;
      insert into public.activity_events(agency_id, actor_user_id, event_type, entity_type, entity_id, request_id, metadata)
      values (p_agency_id, auth.uid(), 'application.status_changed', 'application', p_application_id, p_request_id,
        jsonb_build_object('from', 'placed', 'to', v_to, 'reason', v_reason));
      select * into v_job from public.jobs where agency_id = p_agency_id and id = v_placement.job_id for update;
      if v_job.status = 'filled' then
        update public.jobs set status = 'open', updated_at = now() where id = v_job.id;
        insert into public.activity_events(agency_id, actor_user_id, event_type, entity_type, entity_id, request_id, metadata)
        values (p_agency_id, auth.uid(), 'job.status_changed', 'job', v_job.id, p_request_id, jsonb_build_object('to', 'open', 'reason', 'A placement fell through'));
      end if;
      v_event := 'placement.fell_through';
      v_meta := jsonb_build_object('placementId', v_id, 'reason', v_reason);
    end if;
  else
    raise exception 'invalid_pipeline_request';
  end if;

  insert into public.activity_events(agency_id, actor_user_id, event_type, entity_type, entity_id, request_id, metadata)
  values (p_agency_id, auth.uid(), v_event, 'application', p_application_id, p_request_id, v_meta);
  return jsonb_build_object('id', v_id, 'applicationStatus', v_app.status, 'applicationUpdatedAt', v_app.updated_at);
end;
$$;
revoke all on function private.manage_pipeline(uuid,uuid,text,jsonb,timestamptz,text) from public, anon;
grant execute on function private.manage_pipeline(uuid,uuid,text,jsonb,timestamptz,text) to authenticated;
revoke all on function private.pipeline_text(text,integer) from public, anon;
grant execute on function private.pipeline_text(text,integer) to authenticated;

create or replace function public.manage_pipeline(
  p_agency_id uuid, p_application_id uuid, p_action text, p_payload jsonb,
  p_expected_updated_at timestamptz default null, p_request_id text default null
) returns jsonb language sql security invoker set search_path = '' as $$
  select private.manage_pipeline(p_agency_id, p_application_id, p_action, p_payload, p_expected_updated_at, p_request_id);
$$;
revoke all on function public.manage_pipeline(uuid,uuid,text,jsonb,timestamptz,text) from public, anon;
grant execute on function public.manage_pipeline(uuid,uuid,text,jsonb,timestamptz,text) to authenticated;
