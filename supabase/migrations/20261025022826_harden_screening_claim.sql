create or replace function public.claim_screening_run()
returns setof public.screening_runs language plpgsql security invoker set search_path='' as $$
declare r public.screening_runs;
begin
  for r in select s.* from public.screening_runs s join public.applications a on a.id=s.application_id
    where s.status in ('queued','running') and (s.status='queued' or s.lease_until<now())
    and (s.attempts>=3 or a.status in ('placed','rejected','withdrawn')
      or not exists(select 1 from public.jobs j where j.id=a.job_id and j.status='open')
      or not private.screening_actor_can_review(s.agency_id,s.application_id,s.requested_by))
    limit 100 for update of s skip locked loop
    update public.screening_runs set status=case when r.attempts>=3 then 'failed' else 'cancelled' end,
      failure_code=case when r.attempts>=3 then 'attempts_exhausted' else 'access_or_eligibility_changed' end,
      lease_token=null,lease_until=null,finished_at=clock_timestamp() where id=r.id;
    update public.applications set processing_status='failed' where id=r.application_id;
    insert into public.activity_events(agency_id,event_type,entity_type,entity_id,request_id,metadata)
      values(r.agency_id,'application.processing_failed','application',r.application_id,r.request_id,jsonb_build_object('runId',r.id,'code','access_or_attempts_exhausted'));
  end loop;
  return query with next_run as (
    select s.id from public.screening_runs s
      join public.applications a on a.id=s.application_id
      join public.jobs j on j.id=a.job_id and j.agency_id=a.agency_id
    where s.attempts<3 and a.status not in ('placed','rejected','withdrawn') and j.status='open'
      and private.screening_actor_can_review(s.agency_id,s.application_id,s.requested_by)
      and ((s.status='queued' and s.available_at<=now()) or (s.status='running' and s.lease_until<now()))
      order by s.available_at,s.created_at,s.id for update of s skip locked limit 1
  ), claimed as (
    update public.screening_runs s set status='running',attempts=s.attempts+1,lease_token=gen_random_uuid(),
      lease_until=clock_timestamp()+interval '5 minutes',started_at=coalesce(s.started_at,clock_timestamp()),failure_code=null
      from next_run n where s.id=n.id returning s.*
  ), app as (
    update public.applications a set processing_status='extracting' from claimed c where a.id=c.application_id returning a.id
  ) select c.* from claimed c;
end;
$$;
revoke all on function public.claim_screening_run() from public,anon,authenticated;
grant execute on function public.claim_screening_run() to service_role;
