-- ADR 0008: interview and offer emails. Recruiters confirm each one; the
-- sender attaches a calendar invite for interview emails, and stale
-- invitations or offers are cancelled before delivery.
alter table public.communications add column interview_id uuid;
alter table public.communications add constraint communications_interview_fk
  foreign key (agency_id, interview_id) references public.interviews(agency_id, id) on delete restrict;
grant select(interview_id) on public.communications to authenticated;

create or replace function public.queue_candidate_message(p_agency_id uuid,p_application_id uuid,p_key uuid,p_payload jsonb,p_request_id text)
returns uuid language plpgsql security definer set search_path='' as $$
declare a public.applications; c public.candidates; existing public.communications; identifier uuid; v_interview uuid;
begin
  if auth.uid() is null or not private.can_review_application(p_agency_id,p_application_id) then raise exception 'permission_denied' using errcode='42501'; end if;
  select * into a from public.applications where agency_id=p_agency_id and id=p_application_id for update;
  if p_key is null then raise exception 'invalid_message'; end if;
  select * into existing from public.communications where agency_id=p_agency_id and idempotency_key='candidate:'||p_key::text;
  if found then
    if existing.application_id<>p_application_id or existing.sender_user_id is distinct from auth.uid() or existing.subject<>p_payload->>'subject' or existing.body<>p_payload->>'body' or existing.message_type<>p_payload->>'kind' then raise exception 'idempotency_conflict'; end if;
    return existing.id;
  end if;
  select * into c from public.candidates where id=a.candidate_id and agency_id=p_agency_id;
  if c.email_suppressed then raise exception 'candidate_email_suppressed'; end if;
  if jsonb_typeof(p_payload) is distinct from 'object' or p_payload->>'kind' is null or p_payload->>'subject' is null or p_payload->>'body' is null
    or p_payload->>'kind' not in ('custom','missing_information','status_update','rejection','interview_invitation','interview_update','offer')
    or char_length(btrim(p_payload->>'subject')) not between 1 and 200 or char_length(btrim(p_payload->>'body')) not between 1 and 10000
    or p_payload->>'subject' ~ '[\r\n]' then raise exception 'invalid_message'; end if;
  if p_payload->>'kind'='rejection' and (a.status<>'rejected' or (p_payload->>'confirmed')::boolean is not true) then raise exception 'rejection_requires_review'; end if;
  if a.status in ('placed','rejected','withdrawn') and p_payload->>'kind'='missing_information' then raise exception 'application_not_eligible'; end if;
  -- Interview emails carry their interview so the sender can attach a calendar invite.
  if p_payload->>'kind' in ('interview_invitation','interview_update') then
    v_interview:=nullif(p_payload->>'interviewId','')::uuid;
    if v_interview is null or not exists(select 1 from public.interviews i where i.agency_id=p_agency_id and i.application_id=p_application_id and i.id=v_interview
      and ((p_payload->>'kind'='interview_invitation' and i.status='scheduled') or (p_payload->>'kind'='interview_update' and i.status='cancelled'))) then
      raise exception 'application_not_eligible';
    end if;
  end if;
  if p_payload->>'kind'='offer' and not exists(select 1 from public.offers o where o.agency_id=p_agency_id and o.application_id=p_application_id and o.status='extended') then
    raise exception 'application_not_eligible';
  end if;
  if (select count(*) from public.communications where agency_id=p_agency_id and application_id=p_application_id and created_at>now()-interval '1 hour' and subject is not null)>=10 then raise exception 'message_rate_limited'; end if;
  insert into public.communications(agency_id,application_id,sender_user_id,recipient_email,message_type,related_entity_type,related_entity_id,idempotency_key,subject,body,reply_to,interview_id)
    select p_agency_id,p_application_id,auth.uid(),c.email,p_payload->>'kind','application',p_application_id,'candidate:'||p_key::text,
      btrim(p_payload->>'subject'),btrim(p_payload->>'body'),contact_email,v_interview from public.agencies where id=p_agency_id returning id into identifier;
  insert into public.activity_events(agency_id,actor_user_id,event_type,entity_type,entity_id,request_id,metadata)
    values(p_agency_id,auth.uid(),'communication.requested','application',p_application_id,p_request_id,jsonb_build_object('communicationId',identifier,'kind',p_payload->>'kind'));
  return identifier;
end $$;
create or replace function public.claim_candidate_message() returns setof public.communications language plpgsql security invoker set search_path='' as $$
begin
  update public.communications m set status='cancelled',failure_code='access_or_eligibility_changed',lease_token=null,lease_until=null
    from public.applications a join public.candidates c on c.id=a.candidate_id join public.jobs j on j.id=a.job_id
    where m.application_id=a.id and m.subject is not null and (m.status='pending' or (m.status='sending' and m.lease_until<now()))
    and (c.email_suppressed or not exists(select 1 from public.agencies ag where ag.id=m.agency_id and ag.status='active')
      or (m.sender_user_id is not null and not private.screening_actor_can_review(m.agency_id,a.id,m.sender_user_id))
      or (m.message_type='missing_information' and (a.status in ('placed','rejected','withdrawn') or j.status<>'open'))
      or (m.message_type='rejection' and a.status<>'rejected')
      or (m.message_type='interview_invitation' and not exists(select 1 from public.interviews i where i.id=m.interview_id and i.status='scheduled'))
      or (m.message_type='offer' and not exists(select 1 from public.offers o where o.agency_id=m.agency_id and o.application_id=a.id and o.status='extended')));
  update public.communications set status='failed',failure_code='attempts_exhausted',lease_token=null,lease_until=null
    where subject is not null and (status='pending' or (status='sending' and lease_until<now())) and (attempt_count>=3 or created_at<now()-interval '23 hours');
  return query with next_message as (select id from public.communications where subject is not null and attempt_count<3 and available_at<=now()
    and (status='pending' or (status='sending' and lease_until<now())) order by available_at,created_at,id for update skip locked limit 1)
  update public.communications m set status='sending',attempt_count=m.attempt_count+1,lease_token=gen_random_uuid(),lease_until=now()+interval '5 minutes'
    from next_message n where m.id=n.id returning m.*;
end $$;
