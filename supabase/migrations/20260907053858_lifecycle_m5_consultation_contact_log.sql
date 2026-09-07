alter table public.consultation
  add column unit_id uuid,
  add column contact_type varchar,
  add column stage varchar,
  add column channel varchar,
  add column purpose varchar,
  add column structured_tags jsonb,
  add constraint consultation_unit_project_fkey
    foreign key (project_id, unit_id)
    references public.project_unit (project_id, unit_id)
    on delete restrict,
  add constraint consultation_contact_type_check
    check (
      contact_type is null
      or contact_type in ('CALL', 'CONSULTATION', 'MESSAGE', 'VISIT')
    ),
  add constraint consultation_stage_check
    check (
      stage is null
      or stage in (
        'PRE_SALES',
        'OPEN_SUBSCRIPTION',
        'SUBSCRIPTION_CONTRACT',
        'POST_CONTRACT',
        'PRE_INSPECTION',
        'MOVE_IN'
      )
    );

create index idx_consultation_project_unit_time
  on public.consultation (project_id, unit_id, consulted_at desc);

create index idx_consultation_project_counselor_time
  on public.consultation (project_id, counselor_id, consulted_at desc);

alter table public.contract_status_history
  add constraint contract_status_history_contact_project_fkey
    foreign key (contact_id, project_id)
    references public.consultation (id, project_id)
    on delete restrict;
