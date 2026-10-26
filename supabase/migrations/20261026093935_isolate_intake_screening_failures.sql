-- A screening preparation failure must not roll back an acknowledgement.
create or replace function public.prepare_application_intake(p_id uuid,p_lease uuid,p_model text)
returns jsonb language plpgsql security invoker set search_path='' as $$
declare t public.application_intake_tasks; a public.applications; c public.candidates; j public.jobs; ag public.agencies;
  settings public.agency_processing_settings; reviewer uuid; document uuid; prior_actor text; result jsonb;
begin
  select * into t from public.application_intake_tasks where id=p_id and status='running' and lease_token=p_lease and lease_until>now() for update;
  if not found then return jsonb_build_object('committed',false); end if;
  select * into a from public.applications where id=t.application_id;
  select * into j from public.jobs where id=a.job_id;
  select * into ag from public.agencies where id=t.agency_id;
  if ag.status<>'active' or j.status<>'open' or a.status in ('placed','rejected','withdrawn') then
    update public.application_intake_tasks set status='cancelled',lease_token=null,lease_until=null where id=t.id;
    return jsonb_build_object('committed',true,'cancelled',true);
  end if;
  select * into settings from public.agency_processing_settings where agency_id=t.agency_id;
  select * into c from public.candidates where id=a.candidate_id;
  if coalesce(settings.acknowledge_applications,true) and not c.email_suppressed then
    insert into public.communications(agency_id,application_id,recipient_email,message_type,related_entity_type,related_entity_id,idempotency_key,subject,body,reply_to)
      values(t.agency_id,a.id,c.email,'application_received','application',a.id,'application-received:'||a.id::text,
        'Application received: '||left(j.title,170),'Thanks, '||c.full_name||'. Your application for '||j.title||' has been received by '||ag.name||'. We will contact you by email if we need anything else.',ag.contact_email)
      on conflict(agency_id,idempotency_key) do nothing;
  end if;
  if settings.screening_enabled and settings.automatic_screening then
    prior_actor:=current_setting('request.jwt.claim.sub',true);
    begin
      if p_model is null then raise exception 'screening_not_configured'; end if;
      select m.user_id into reviewer from public.agency_memberships m where m.agency_id=t.agency_id and m.status='active'
        and private.screening_actor_can_review(t.agency_id,a.id,m.user_id)
        order by (m.user_id=a.owner_user_id) desc nulls last,case when m.role='owner' then 0 when m.role='administrator' then 1 else 2 end,m.user_id limit 1;
      select id into document from public.candidate_documents where agency_id=t.agency_id and application_id=a.id order by created_at desc,id desc limit 1;
      if reviewer is null or document is null then raise exception 'screening_reviewer_or_document_missing'; end if;
      perform set_config('request.jwt.claim.sub',reviewer::text,true);
      result:=private.request_application_screening(t.agency_id,a.id,document,t.id,p_model,'intake:'||t.id::text);
    exception when others then
      -- This subtransaction rolls back screening only; receipt remains queued.
      perform set_config('request.jwt.claim.sub',coalesce(prior_actor,''),true);
      perform public.fail_application_intake(t.id,p_lease);
      return jsonb_build_object('committed',true,'failed',true);
    end;
    perform set_config('request.jwt.claim.sub',coalesce(prior_actor,''),true);
  end if;
  update public.application_intake_tasks set status='done',lease_token=null,lease_until=null,failure_code=null where id=t.id;
  return jsonb_build_object('committed',true,'screening',result);
end $$;
revoke all on function public.prepare_application_intake(uuid,uuid,text) from public,anon,authenticated;
grant execute on function public.prepare_application_intake(uuid,uuid,text) to service_role;
