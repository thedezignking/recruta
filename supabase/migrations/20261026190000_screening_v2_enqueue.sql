-- Apply only after the worker build supports both screening-v1 and screening-v2.
create or replace function private.request_application_screening(p_agency_id uuid,p_application_id uuid,p_document_id uuid,p_key uuid,p_model text,p_request_id text)
returns jsonb language plpgsql security definer set search_path='' as $$
declare a public.applications; d public.candidate_documents; r public.screening_runs;
  snapshot jsonb; fingerprint text;
begin
  if auth.uid() is null or not private.can_review_application(p_agency_id,p_application_id) then
    raise exception 'application_not_found';
  end if;
  -- Serialize per application; an active job cannot be duplicated by concurrent requests.
  select * into a from public.applications where agency_id=p_agency_id and id=p_application_id for update;
  perform pg_advisory_xact_lock(hashtextextended(p_agency_id::text||p_key::text,0));
  select s.* into r from private.screening_request_keys k join public.screening_runs s on s.id=k.run_id
    where k.agency_id=p_agency_id and k.key=p_key;
  if found then
    if r.application_id<>p_application_id or r.document_id<>p_document_id then raise exception 'idempotency_conflict'; end if;
    return jsonb_build_object('id',r.id,'status',r.status);
  end if;
  if a.status in ('placed','rejected','withdrawn') or not exists(select 1 from public.jobs where id=a.job_id and status='open') then
    raise exception 'screening_not_eligible';
  end if;
  select * into d from public.candidate_documents where agency_id=p_agency_id
    and application_id=p_application_id and candidate_id=a.candidate_id and id=p_document_id and document_type='resume';
  if not found then raise exception 'document_not_found'; end if;
  select * into r from public.screening_runs where application_id=p_application_id and status in ('queued','running');
  if found then
    if r.document_id<>p_document_id then raise exception 'screening_already_running'; end if;
    insert into private.screening_request_keys values(p_agency_id,p_key,r.id);
    return jsonb_build_object('id',r.id,'status',r.status);
  end if;
  if p_key is null or p_model is null or char_length(p_model) not between 1 and 100 or p_request_id is null or char_length(p_request_id)>200 then
    raise exception 'invalid_screening_request';
  end if;
  select jsonb_build_object(
    'job',jsonb_build_object('id',j.id,'title',j.title,'description',j.description),
    'document',jsonb_build_object('id',d.id,'file_name',d.file_name,'storage_path',d.storage_path,'content_type',d.content_type,'size_bytes',d.size_bytes),
    'requirements',coalesce((select jsonb_agg(jsonb_build_object('id',q.id,'label',q.label,'description',q.description,'requirement_type',q.requirement_type,'version',q.version) order by q.sort_order,q.id)
      from public.job_requirements q where q.agency_id=p_agency_id and q.job_id=a.job_id),'[]'::jsonb),
    'answers',coalesce((select jsonb_agg(jsonb_build_object('id',ans.id,'question',q.label,'answer',ans.answer) order by q.sort_order,ans.id)
      from public.application_answers ans join public.job_application_questions q on q.id=ans.question_id and q.agency_id=ans.agency_id
      where ans.agency_id=p_agency_id and ans.application_id=p_application_id),'[]'::jsonb)
  ) into snapshot from public.jobs j where j.id=a.job_id and j.agency_id=p_agency_id;
  if pg_column_size(snapshot)>250000 or jsonb_array_length(snapshot->'requirements')>100 or jsonb_array_length(snapshot->'answers')>100 then
    raise exception 'screening_input_too_large';
  end if;
  fingerprint:=md5(snapshot::text||p_model||'screening-v2/extraction-v1');
  select * into r from public.screening_runs where application_id=p_application_id and input_fingerprint=fingerprint and status='succeeded' order by created_at desc limit 1;
  if found then
    insert into private.screening_request_keys values(p_agency_id,p_key,r.id);
    return jsonb_build_object('id',r.id,'status',r.status);
  end if;
  if (select count(*) from public.screening_runs where agency_id=p_agency_id and created_at>now()-interval '1 hour')>=100
    or (select count(*) from public.screening_runs where application_id=p_application_id and created_at>now()-interval '1 day')>=5 then
    raise exception 'screening_rate_limited';
  end if;
  insert into public.screening_runs(agency_id,application_id,document_id,requested_by,request_id,idempotency_key,input_snapshot,input_fingerprint,model,prompt_version,extractor_version)
    values(p_agency_id,p_application_id,p_document_id,auth.uid(),p_request_id,p_key,snapshot,fingerprint,p_model,'screening-v2','extraction-v1') returning * into r;
  insert into private.screening_request_keys values(p_agency_id,p_key,r.id);
  update public.applications set processing_status='pending' where id=a.id;
  insert into public.activity_events(agency_id,actor_user_id,event_type,entity_type,entity_id,request_id,metadata)
    values(p_agency_id,auth.uid(),'application.processing_requested','application',a.id,p_request_id,jsonb_build_object('runId',r.id,'documentId',d.id));
  return jsonb_build_object('id',r.id,'status',r.status);
end;
$$;
notify pgrst,'reload schema';
-- Preserve invitations and access history when a manually opened job is retired.
