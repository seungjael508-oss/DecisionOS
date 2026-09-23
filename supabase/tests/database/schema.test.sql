begin;

select no_plan();

-- Out-of-scope v1.2 tables must not exist in Phase 1.
select hasnt_table('public'::name, 'import_batch'::name, 'import_batch is out of Phase 1');
select hasnt_table('public'::name, 'import_row_conflict'::name, 'import_row_conflict is out of Phase 1');

-- Enums
select has_enum('public'::name, 'organization_status'::name, 'organization_status enum exists');
select enum_has_labels('public'::name, 'organization_status'::name, array['ACTIVE', 'INACTIVE']::text[]);

select has_enum('public'::name, 'project_status'::name, 'project_status enum exists');
select enum_has_labels('public'::name, 'project_status'::name, array['ACTIVE', 'CLOSED']::text[]);

select has_enum('public'::name, 'project_member_role'::name, 'project_member_role enum exists');
-- CLIENT_MANAGER는 20260921010000_client_manager_role_enum.sql에서 추가된 값이다.
select enum_has_labels('public'::name, 'project_member_role'::name, array['COUNSELOR', 'TEAM_LEAD', 'PROJECT_ADMIN', 'CLIENT_MANAGER']::text[]);

select has_enum('public'::name, 'customer_status'::name, 'customer_status enum exists');
select enum_has_labels('public'::name, 'customer_status'::name, array['ACTIVE', 'ARCHIVED']::text[]);

select has_enum('public'::name, 'customer_grade'::name, 'customer_grade enum exists');
select enum_has_labels('public'::name, 'customer_grade'::name, array['A', 'B', 'C']::text[]);

select has_enum('public'::name, 'consultation_ai_status'::name, 'consultation_ai_status enum exists');
select enum_has_labels('public'::name, 'consultation_ai_status'::name, array['PENDING', 'COMPLETED', 'FAILED', 'LOW_CONFIDENCE']::text[]);

select has_enum('public'::name, 'consultation_density_level'::name, 'consultation_density_level enum exists');
select enum_has_labels('public'::name, 'consultation_density_level'::name, array['SIMPLE_INQUIRY', 'INTEREST', 'SUBSTANTIVE', 'ACTION']::text[]);

-- organization
select has_table('public'::name, 'organization'::name);
select has_pk('public'::name, 'organization'::name);
select has_column('public'::name, 'organization'::name, 'id'::name, 'organization.id exists');
select col_type_is('public'::name, 'organization'::name, 'id'::name, 'uuid');
select col_not_null('public'::name, 'organization'::name, 'id'::name);
select col_has_default('public'::name, 'organization'::name, 'id'::name, 'organization.id has default');
select col_default_is('public'::name, 'organization'::name, 'id'::name, 'gen_random_uuid()', 'organization.id default');
select col_is_pk('public'::name, 'organization'::name, 'id'::name);

select has_column('public'::name, 'organization'::name, 'name'::name, 'organization.name exists');
select col_type_is('public'::name, 'organization'::name, 'name'::name, 'character varying(200)');
select col_not_null('public'::name, 'organization'::name, 'name'::name);

select has_column('public'::name, 'organization'::name, 'status'::name, 'organization.status exists');
select col_type_is('public'::name, 'organization'::name, 'status'::name, 'organization_status');
select col_not_null('public'::name, 'organization'::name, 'status'::name);
select col_has_default('public'::name, 'organization'::name, 'status'::name, 'organization.status has default');
select col_default_is('public'::name, 'organization'::name, 'status'::name, 'ACTIVE', 'organization.status default');

select has_column('public'::name, 'organization'::name, 'created_at'::name, 'organization.created_at exists');
select col_type_is('public'::name, 'organization'::name, 'created_at'::name, 'timestamp with time zone');
select col_not_null('public'::name, 'organization'::name, 'created_at'::name);
select col_default_is('public'::name, 'organization'::name, 'created_at'::name, 'now()', 'organization.created_at default');

select has_column('public'::name, 'organization'::name, 'updated_at'::name, 'organization.updated_at exists');
select col_type_is('public'::name, 'organization'::name, 'updated_at'::name, 'timestamp with time zone');
select col_not_null('public'::name, 'organization'::name, 'updated_at'::name);
select col_default_is('public'::name, 'organization'::name, 'updated_at'::name, 'now()', 'organization.updated_at default');
select has_check('public'::name, 'organization'::name, 'organization has a check constraint');

-- project
select has_table('public'::name, 'project'::name);
select has_pk('public'::name, 'project'::name);
select hasnt_column('public'::name, 'project'::name, 'project_id'::name, 'project must not have a project_id column');
select has_column('public'::name, 'project'::name, 'id'::name, 'project.id exists');
select col_type_is('public'::name, 'project'::name, 'id'::name, 'uuid');
select col_not_null('public'::name, 'project'::name, 'id'::name);
select col_default_is('public'::name, 'project'::name, 'id'::name, 'gen_random_uuid()', 'project.id default');
select col_is_pk('public'::name, 'project'::name, 'id'::name);

select has_column('public'::name, 'project'::name, 'organization_id'::name, 'project.organization_id exists');
select col_type_is('public'::name, 'project'::name, 'organization_id'::name, 'uuid');
select col_not_null('public'::name, 'project'::name, 'organization_id'::name);
select col_is_fk('public'::name, 'project'::name, 'organization_id'::name, 'project.organization_id is fk');
select fk_ok('public'::name, 'project'::name, 'organization_id'::name, 'public'::name, 'organization'::name, 'id'::name);

select has_column('public'::name, 'project'::name, 'name'::name, 'project.name exists');
select col_type_is('public'::name, 'project'::name, 'name'::name, 'character varying(200)');
select col_not_null('public'::name, 'project'::name, 'name'::name);

select has_column('public'::name, 'project'::name, 'timezone'::name, 'project.timezone exists');
select col_type_is('public'::name, 'project'::name, 'timezone'::name, 'character varying(50)');
select col_not_null('public'::name, 'project'::name, 'timezone'::name);
select col_default_is('public'::name, 'project'::name, 'timezone'::name, 'Asia/Seoul', 'project.timezone default');

select has_column('public'::name, 'project'::name, 'status'::name, 'project.status exists');
select col_type_is('public'::name, 'project'::name, 'status'::name, 'project_status');
select col_not_null('public'::name, 'project'::name, 'status'::name);
select col_default_is('public'::name, 'project'::name, 'status'::name, 'ACTIVE', 'project.status default');

select has_column('public'::name, 'project'::name, 'created_at'::name, 'project.created_at exists');
select col_type_is('public'::name, 'project'::name, 'created_at'::name, 'timestamp with time zone');
select col_not_null('public'::name, 'project'::name, 'created_at'::name);
select col_default_is('public'::name, 'project'::name, 'created_at'::name, 'now()', 'project.created_at default');

select has_column('public'::name, 'project'::name, 'updated_at'::name, 'project.updated_at exists');
select col_type_is('public'::name, 'project'::name, 'updated_at'::name, 'timestamp with time zone');
select col_not_null('public'::name, 'project'::name, 'updated_at'::name);
select col_default_is('public'::name, 'project'::name, 'updated_at'::name, 'now()', 'project.updated_at default');
select has_index('public'::name, 'project'::name, 'idx_project_org'::name, array['organization_id']::name[]);
select has_check('public'::name, 'project'::name, 'project has a check constraint');

-- project_member
select has_table('public'::name, 'project_member'::name);
select has_pk('public'::name, 'project_member'::name);
select has_column('public'::name, 'project_member'::name, 'id'::name, 'project_member.id exists');
select col_type_is('public'::name, 'project_member'::name, 'id'::name, 'uuid');
select col_not_null('public'::name, 'project_member'::name, 'id'::name);
select col_default_is('public'::name, 'project_member'::name, 'id'::name, 'gen_random_uuid()', 'project_member.id default');
select col_is_pk('public'::name, 'project_member'::name, 'id'::name);

select has_column('public'::name, 'project_member'::name, 'project_id'::name, 'project_member.project_id exists');
select col_type_is('public'::name, 'project_member'::name, 'project_id'::name, 'uuid');
select col_not_null('public'::name, 'project_member'::name, 'project_id'::name);
select fk_ok('public'::name, 'project_member'::name, 'project_id'::name, 'public'::name, 'project'::name, 'id'::name);

select has_column('public'::name, 'project_member'::name, 'user_id'::name, 'project_member.user_id exists');
select col_type_is('public'::name, 'project_member'::name, 'user_id'::name, 'uuid');
select col_not_null('public'::name, 'project_member'::name, 'user_id'::name);
select fk_ok('public'::name, 'project_member'::name, 'user_id'::name, 'auth'::name, 'users'::name, 'id'::name);

select has_column('public'::name, 'project_member'::name, 'role'::name, 'project_member.role exists');
select col_type_is('public'::name, 'project_member'::name, 'role'::name, 'project_member_role');
select col_not_null('public'::name, 'project_member'::name, 'role'::name);

select has_column('public'::name, 'project_member'::name, 'active'::name, 'project_member.active exists');
select col_type_is('public'::name, 'project_member'::name, 'active'::name, 'boolean');
select col_not_null('public'::name, 'project_member'::name, 'active'::name);
select col_default_is('public'::name, 'project_member'::name, 'active'::name, true, 'project_member.active default');

select has_column('public'::name, 'project_member'::name, 'created_at'::name, 'project_member.created_at exists');
select col_type_is('public'::name, 'project_member'::name, 'created_at'::name, 'timestamp with time zone');
select col_not_null('public'::name, 'project_member'::name, 'created_at'::name);
select col_default_is('public'::name, 'project_member'::name, 'created_at'::name, 'now()', 'project_member.created_at default');

select has_column('public'::name, 'project_member'::name, 'updated_at'::name, 'project_member.updated_at exists');
select col_type_is('public'::name, 'project_member'::name, 'updated_at'::name, 'timestamp with time zone');
select col_not_null('public'::name, 'project_member'::name, 'updated_at'::name);
select col_default_is('public'::name, 'project_member'::name, 'updated_at'::name, 'now()', 'project_member.updated_at default');

select col_is_unique('public'::name, 'project_member'::name, array['project_id', 'user_id']::name[]);
select col_is_unique('public'::name, 'project_member'::name, array['id', 'project_id']::name[]);
select has_index('public'::name, 'project_member'::name, 'idx_pm_project_active'::name, array['project_id', 'active']::name[]);
select has_index('public'::name, 'project_member'::name, 'idx_pm_user_active_project_role'::name, array['user_id', 'active', 'project_id', 'role']::name[]);

-- customer
select has_table('public'::name, 'customer'::name);
select has_pk('public'::name, 'customer'::name);
select has_column('public'::name, 'customer'::name, 'id'::name, 'customer.id exists');
select col_type_is('public'::name, 'customer'::name, 'id'::name, 'uuid');
select col_not_null('public'::name, 'customer'::name, 'id'::name);
select col_default_is('public'::name, 'customer'::name, 'id'::name, 'gen_random_uuid()', 'customer.id default');
select col_is_pk('public'::name, 'customer'::name, 'id'::name);

select has_column('public'::name, 'customer'::name, 'project_id'::name, 'customer.project_id exists');
select col_type_is('public'::name, 'customer'::name, 'project_id'::name, 'uuid');
select col_not_null('public'::name, 'customer'::name, 'project_id'::name);
select fk_ok('public'::name, 'customer'::name, 'project_id'::name, 'public'::name, 'project'::name, 'id'::name);

select has_column('public'::name, 'customer'::name, 'name'::name, 'customer.name exists');
select col_type_is('public'::name, 'customer'::name, 'name'::name, 'character varying(100)');
select col_not_null('public'::name, 'customer'::name, 'name'::name);

select has_column('public'::name, 'customer'::name, 'phone'::name, 'customer.phone exists');
select col_type_is('public'::name, 'customer'::name, 'phone'::name, 'character varying(20)');
select col_not_null('public'::name, 'customer'::name, 'phone'::name);

select has_column('public'::name, 'customer'::name, 'phone_normalized'::name, 'customer.phone_normalized exists');
select col_type_is('public'::name, 'customer'::name, 'phone_normalized'::name, 'character varying(20)');
select col_not_null('public'::name, 'customer'::name, 'phone_normalized'::name);

select has_column('public'::name, 'customer'::name, 'status'::name, 'customer.status exists');
select col_type_is('public'::name, 'customer'::name, 'status'::name, 'customer_status');
select col_not_null('public'::name, 'customer'::name, 'status'::name);
select col_default_is('public'::name, 'customer'::name, 'status'::name, 'ACTIVE', 'customer.status default');

select has_column('public'::name, 'customer'::name, 'grade'::name, 'customer.grade exists');
select col_type_is('public'::name, 'customer'::name, 'grade'::name, 'customer_grade');
select col_not_null('public'::name, 'customer'::name, 'grade'::name);
select col_default_is('public'::name, 'customer'::name, 'grade'::name, 'C', 'customer.grade default');

select has_column('public'::name, 'customer'::name, 'suggested_grade'::name, 'customer.suggested_grade exists');
select col_type_is('public'::name, 'customer'::name, 'suggested_grade'::name, 'customer_grade');
select col_is_null('public'::name, 'customer'::name, 'suggested_grade'::name);

select has_column('public'::name, 'customer'::name, 'suggested_score'::name, 'customer.suggested_score exists');
select col_type_is('public'::name, 'customer'::name, 'suggested_score'::name, 'smallint');
select col_is_null('public'::name, 'customer'::name, 'suggested_score'::name);

select has_column('public'::name, 'customer'::name, 'suggested_grade_reason'::name, 'customer.suggested_grade_reason exists');
select col_type_is('public'::name, 'customer'::name, 'suggested_grade_reason'::name, 'text');
select col_is_null('public'::name, 'customer'::name, 'suggested_grade_reason'::name);

select has_column('public'::name, 'customer'::name, 'suggestion_rule_version'::name, 'customer.suggestion_rule_version exists');
select col_type_is('public'::name, 'customer'::name, 'suggestion_rule_version'::name, 'character varying(20)');
select col_is_null('public'::name, 'customer'::name, 'suggestion_rule_version'::name);

select has_column('public'::name, 'customer'::name, 'suggested_at'::name, 'customer.suggested_at exists');
select col_type_is('public'::name, 'customer'::name, 'suggested_at'::name, 'timestamp with time zone');
select col_is_null('public'::name, 'customer'::name, 'suggested_at'::name);

select has_column('public'::name, 'customer'::name, 'source'::name, 'customer.source exists');
select col_type_is('public'::name, 'customer'::name, 'source'::name, 'character varying(50)');
select col_is_null('public'::name, 'customer'::name, 'source'::name);

select has_column('public'::name, 'customer'::name, 'assigned_counselor_id'::name, 'customer.assigned_counselor_id exists');
select col_type_is('public'::name, 'customer'::name, 'assigned_counselor_id'::name, 'uuid');
select col_is_null('public'::name, 'customer'::name, 'assigned_counselor_id'::name);

select has_column('public'::name, 'customer'::name, 'created_at'::name, 'customer.created_at exists');
select col_type_is('public'::name, 'customer'::name, 'created_at'::name, 'timestamp with time zone');
select col_not_null('public'::name, 'customer'::name, 'created_at'::name);
select col_default_is('public'::name, 'customer'::name, 'created_at'::name, 'now()', 'customer.created_at default');

select has_column('public'::name, 'customer'::name, 'updated_at'::name, 'customer.updated_at exists');
select col_type_is('public'::name, 'customer'::name, 'updated_at'::name, 'timestamp with time zone');
select col_not_null('public'::name, 'customer'::name, 'updated_at'::name);
select col_default_is('public'::name, 'customer'::name, 'updated_at'::name, 'now()', 'customer.updated_at default');

select col_is_unique('public'::name, 'customer'::name, array['project_id', 'phone_normalized']::name[]);
select col_is_unique('public'::name, 'customer'::name, array['id', 'project_id']::name[]);
select fk_ok('public'::name, 'customer'::name, array['assigned_counselor_id', 'project_id']::name[], 'public'::name, 'project_member'::name, array['id', 'project_id']::name[]);
select has_index('public'::name, 'customer'::name, 'idx_customer_project_grade'::name, array['project_id', 'grade']::name[]);
select has_index('public'::name, 'customer'::name, 'idx_customer_project_phone'::name, array['project_id', 'phone_normalized']::name[]);
select has_index('public'::name, 'customer'::name, 'idx_customer_project_status'::name, array['project_id', 'status']::name[]);
select has_index('public'::name, 'customer'::name, 'idx_customer_project_assignee'::name, array['project_id', 'assigned_counselor_id']::name[]);
select has_check('public'::name, 'customer'::name, 'customer has check constraints');

-- consultation
select has_table('public'::name, 'consultation'::name);
select has_pk('public'::name, 'consultation'::name);
select has_column('public'::name, 'consultation'::name, 'id'::name, 'consultation.id exists');
select col_type_is('public'::name, 'consultation'::name, 'id'::name, 'uuid');
select col_not_null('public'::name, 'consultation'::name, 'id'::name);
select col_default_is('public'::name, 'consultation'::name, 'id'::name, 'gen_random_uuid()', 'consultation.id default');
select col_is_pk('public'::name, 'consultation'::name, 'id'::name);

select has_column('public'::name, 'consultation'::name, 'project_id'::name, 'consultation.project_id exists');
select col_type_is('public'::name, 'consultation'::name, 'project_id'::name, 'uuid');
select col_not_null('public'::name, 'consultation'::name, 'project_id'::name);
select fk_ok('public'::name, 'consultation'::name, 'project_id'::name, 'public'::name, 'project'::name, 'id'::name);

select has_column('public'::name, 'consultation'::name, 'customer_id'::name, 'consultation.customer_id exists');
select col_type_is('public'::name, 'consultation'::name, 'customer_id'::name, 'uuid');
select col_not_null('public'::name, 'consultation'::name, 'customer_id'::name);

select has_column('public'::name, 'consultation'::name, 'counselor_id'::name, 'consultation.counselor_id exists');
select col_type_is('public'::name, 'consultation'::name, 'counselor_id'::name, 'uuid');
select col_not_null('public'::name, 'consultation'::name, 'counselor_id'::name);

select has_column('public'::name, 'consultation'::name, 'consulted_at'::name, 'consultation.consulted_at exists');
select col_type_is('public'::name, 'consultation'::name, 'consulted_at'::name, 'timestamp with time zone');
select col_not_null('public'::name, 'consultation'::name, 'consulted_at'::name);

select has_column('public'::name, 'consultation'::name, 'content'::name, 'consultation.content exists');
select col_type_is('public'::name, 'consultation'::name, 'content'::name, 'text');
select col_not_null('public'::name, 'consultation'::name, 'content'::name);

select has_column('public'::name, 'consultation'::name, 'content_version'::name, 'consultation.content_version exists');
select col_type_is('public'::name, 'consultation'::name, 'content_version'::name, 'integer');
select col_not_null('public'::name, 'consultation'::name, 'content_version'::name);
select col_default_is('public'::name, 'consultation'::name, 'content_version'::name, 1, 'consultation.content_version default');

select has_column('public'::name, 'consultation'::name, 'next_action_at'::name, 'consultation.next_action_at exists');
select col_type_is('public'::name, 'consultation'::name, 'next_action_at'::name, 'timestamp with time zone');
select col_is_null('public'::name, 'consultation'::name, 'next_action_at'::name);

select has_column('public'::name, 'consultation'::name, 'grade_after'::name, 'consultation.grade_after exists');
select col_type_is('public'::name, 'consultation'::name, 'grade_after'::name, 'customer_grade');
select col_is_null('public'::name, 'consultation'::name, 'grade_after'::name);

select has_column('public'::name, 'consultation'::name, 'created_by'::name, 'consultation.created_by exists');
select col_type_is('public'::name, 'consultation'::name, 'created_by'::name, 'uuid');
select col_not_null('public'::name, 'consultation'::name, 'created_by'::name);

select has_column('public'::name, 'consultation'::name, 'ai_analysis_status'::name, 'consultation.ai_analysis_status exists');
select col_type_is('public'::name, 'consultation'::name, 'ai_analysis_status'::name, 'consultation_ai_status');
select col_not_null('public'::name, 'consultation'::name, 'ai_analysis_status'::name);
select col_default_is('public'::name, 'consultation'::name, 'ai_analysis_status'::name, 'PENDING', 'consultation.ai_analysis_status default');

select has_column('public'::name, 'consultation'::name, 'ai_analyzed_content_version'::name, 'consultation.ai_analyzed_content_version exists');
select col_type_is('public'::name, 'consultation'::name, 'ai_analyzed_content_version'::name, 'integer');
select col_is_null('public'::name, 'consultation'::name, 'ai_analyzed_content_version'::name);

select has_column('public'::name, 'consultation'::name, 'ai_density_level'::name, 'consultation.ai_density_level exists');
select col_type_is('public'::name, 'consultation'::name, 'ai_density_level'::name, 'consultation_density_level');
select col_is_null('public'::name, 'consultation'::name, 'ai_density_level'::name);

select has_column('public'::name, 'consultation'::name, 'ai_confidence'::name, 'consultation.ai_confidence exists');
select col_type_is('public'::name, 'consultation'::name, 'ai_confidence'::name, 'numeric(3,2)');
select col_is_null('public'::name, 'consultation'::name, 'ai_confidence'::name);

select has_column('public'::name, 'consultation'::name, 'ai_evidence_summary'::name, 'consultation.ai_evidence_summary exists');
select col_type_is('public'::name, 'consultation'::name, 'ai_evidence_summary'::name, 'text');
select col_is_null('public'::name, 'consultation'::name, 'ai_evidence_summary'::name);

select has_column('public'::name, 'consultation'::name, 'ai_analyzed_at'::name, 'consultation.ai_analyzed_at exists');
select col_type_is('public'::name, 'consultation'::name, 'ai_analyzed_at'::name, 'timestamp with time zone');
select col_is_null('public'::name, 'consultation'::name, 'ai_analyzed_at'::name);

select has_column('public'::name, 'consultation'::name, 'ai_prompt_version'::name, 'consultation.ai_prompt_version exists');
select col_type_is('public'::name, 'consultation'::name, 'ai_prompt_version'::name, 'character varying(20)');
select col_is_null('public'::name, 'consultation'::name, 'ai_prompt_version'::name);

select has_column('public'::name, 'consultation'::name, 'ai_retry_count'::name, 'consultation.ai_retry_count exists');
select col_type_is('public'::name, 'consultation'::name, 'ai_retry_count'::name, 'smallint');
select col_not_null('public'::name, 'consultation'::name, 'ai_retry_count'::name);
select col_default_is('public'::name, 'consultation'::name, 'ai_retry_count'::name, 0, 'consultation.ai_retry_count default');

select has_column('public'::name, 'consultation'::name, 'ai_last_attempted_at'::name, 'consultation.ai_last_attempted_at exists');
select col_type_is('public'::name, 'consultation'::name, 'ai_last_attempted_at'::name, 'timestamp with time zone');
select col_is_null('public'::name, 'consultation'::name, 'ai_last_attempted_at'::name);

select has_column('public'::name, 'consultation'::name, 'ai_failure_reason'::name, 'consultation.ai_failure_reason exists');
select col_type_is('public'::name, 'consultation'::name, 'ai_failure_reason'::name, 'text');
select col_is_null('public'::name, 'consultation'::name, 'ai_failure_reason'::name);

select has_column('public'::name, 'consultation'::name, 'created_at'::name, 'consultation.created_at exists');
select col_type_is('public'::name, 'consultation'::name, 'created_at'::name, 'timestamp with time zone');
select col_not_null('public'::name, 'consultation'::name, 'created_at'::name);
select col_default_is('public'::name, 'consultation'::name, 'created_at'::name, 'now()', 'consultation.created_at default');

select has_column('public'::name, 'consultation'::name, 'updated_at'::name, 'consultation.updated_at exists');
select col_type_is('public'::name, 'consultation'::name, 'updated_at'::name, 'timestamp with time zone');
select col_not_null('public'::name, 'consultation'::name, 'updated_at'::name);
select col_default_is('public'::name, 'consultation'::name, 'updated_at'::name, 'now()', 'consultation.updated_at default');

select col_is_unique('public'::name, 'consultation'::name, array['id', 'project_id']::name[]);
select fk_ok('public'::name, 'consultation'::name, array['customer_id', 'project_id']::name[], 'public'::name, 'customer'::name, array['id', 'project_id']::name[]);
select fk_ok('public'::name, 'consultation'::name, array['counselor_id', 'project_id']::name[], 'public'::name, 'project_member'::name, array['id', 'project_id']::name[]);
select fk_ok('public'::name, 'consultation'::name, array['created_by', 'project_id']::name[], 'public'::name, 'project_member'::name, array['id', 'project_id']::name[]);
select has_index('public'::name, 'consultation'::name, 'idx_consultation_customer_time'::name, array['customer_id', 'consulted_at']::name[]);
select has_index('public'::name, 'consultation'::name, 'idx_consultation_ai_status'::name, 'ai_analysis_status'::name);
select has_index('public'::name, 'consultation'::name, 'idx_consultation_project_customer_time'::name, array['project_id', 'customer_id', 'consulted_at']::name[]);
select has_check('public'::name, 'consultation'::name, 'consultation has check constraints');

-- customer_status_log
select has_table('public'::name, 'customer_status_log'::name);
select has_pk('public'::name, 'customer_status_log'::name);
select hasnt_column('public'::name, 'customer_status_log'::name, 'updated_at'::name, 'customer_status_log must not have updated_at');

select has_column('public'::name, 'customer_status_log'::name, 'id'::name, 'customer_status_log.id exists');
select col_type_is('public'::name, 'customer_status_log'::name, 'id'::name, 'uuid');
select col_not_null('public'::name, 'customer_status_log'::name, 'id'::name);
select col_default_is('public'::name, 'customer_status_log'::name, 'id'::name, 'gen_random_uuid()', 'customer_status_log.id default');
select col_is_pk('public'::name, 'customer_status_log'::name, 'id'::name);

select has_column('public'::name, 'customer_status_log'::name, 'project_id'::name, 'customer_status_log.project_id exists');
select col_type_is('public'::name, 'customer_status_log'::name, 'project_id'::name, 'uuid');
select col_not_null('public'::name, 'customer_status_log'::name, 'project_id'::name);
select fk_ok('public'::name, 'customer_status_log'::name, 'project_id'::name, 'public'::name, 'project'::name, 'id'::name);

select has_column('public'::name, 'customer_status_log'::name, 'customer_id'::name, 'customer_status_log.customer_id exists');
select col_type_is('public'::name, 'customer_status_log'::name, 'customer_id'::name, 'uuid');
select col_not_null('public'::name, 'customer_status_log'::name, 'customer_id'::name);

select has_column('public'::name, 'customer_status_log'::name, 'consultation_id'::name, 'customer_status_log.consultation_id exists');
select col_type_is('public'::name, 'customer_status_log'::name, 'consultation_id'::name, 'uuid');
select col_is_null('public'::name, 'customer_status_log'::name, 'consultation_id'::name);

select has_column('public'::name, 'customer_status_log'::name, 'grade_before'::name, 'customer_status_log.grade_before exists');
select col_type_is('public'::name, 'customer_status_log'::name, 'grade_before'::name, 'customer_grade');
select col_is_null('public'::name, 'customer_status_log'::name, 'grade_before'::name);

select has_column('public'::name, 'customer_status_log'::name, 'grade_after'::name, 'customer_status_log.grade_after exists');
select col_type_is('public'::name, 'customer_status_log'::name, 'grade_after'::name, 'customer_grade');
select col_not_null('public'::name, 'customer_status_log'::name, 'grade_after'::name);

select has_column('public'::name, 'customer_status_log'::name, 'suggested_grade_at_time'::name, 'customer_status_log.suggested_grade_at_time exists');
select col_type_is('public'::name, 'customer_status_log'::name, 'suggested_grade_at_time'::name, 'customer_grade');
select col_is_null('public'::name, 'customer_status_log'::name, 'suggested_grade_at_time'::name);

select has_column('public'::name, 'customer_status_log'::name, 'reason'::name, 'customer_status_log.reason exists');
select col_type_is('public'::name, 'customer_status_log'::name, 'reason'::name, 'text');
select col_is_null('public'::name, 'customer_status_log'::name, 'reason'::name);

select has_column('public'::name, 'customer_status_log'::name, 'changed_by'::name, 'customer_status_log.changed_by exists');
select col_type_is('public'::name, 'customer_status_log'::name, 'changed_by'::name, 'uuid');
select col_not_null('public'::name, 'customer_status_log'::name, 'changed_by'::name);

select has_column('public'::name, 'customer_status_log'::name, 'changed_at'::name, 'customer_status_log.changed_at exists');
select col_type_is('public'::name, 'customer_status_log'::name, 'changed_at'::name, 'timestamp with time zone');
select col_not_null('public'::name, 'customer_status_log'::name, 'changed_at'::name);
select col_default_is('public'::name, 'customer_status_log'::name, 'changed_at'::name, 'now()', 'customer_status_log.changed_at default');

select fk_ok('public'::name, 'customer_status_log'::name, array['customer_id', 'project_id']::name[], 'public'::name, 'customer'::name, array['id', 'project_id']::name[]);
select fk_ok('public'::name, 'customer_status_log'::name, array['consultation_id', 'project_id']::name[], 'public'::name, 'consultation'::name, array['id', 'project_id']::name[]);
select fk_ok('public'::name, 'customer_status_log'::name, array['changed_by', 'project_id']::name[], 'public'::name, 'project_member'::name, array['id', 'project_id']::name[]);
select has_index('public'::name, 'customer_status_log'::name, 'idx_status_log_customer_time'::name, array['customer_id', 'changed_at']::name[]);
select has_index('public'::name, 'customer_status_log'::name, 'idx_status_log_project_customer_time'::name, array['project_id', 'customer_id', 'changed_at']::name[]);

-- ON DELETE RESTRICT for every Phase 1 foreign key
select ok(
  (
    select bool_and(c.confdeltype = 'r')
    from pg_constraint c
    join pg_class rel on rel.oid = c.conrelid
    join pg_namespace n on n.oid = rel.relnamespace
    where n.nspname = 'public'
      and rel.relname in (
        'project',
        'project_member',
        'customer',
        'consultation',
        'customer_status_log'
      )
      and c.contype = 'f'
  ),
  'every Phase 1 foreign key uses ON DELETE RESTRICT'
);

-- Check constraint expressions
select ok(
  exists (
    select 1
    from pg_constraint c
    join pg_class rel on rel.oid = c.conrelid
    join pg_namespace n on n.oid = rel.relnamespace
    where n.nspname = 'public'
      and rel.relname = 'organization'
      and c.contype = 'c'
      and pg_get_constraintdef(c.oid) ilike '%name%<>%''''%'
  ),
  'organization.name rejects empty string'
);

select ok(
  exists (
    select 1
    from pg_constraint c
    join pg_class rel on rel.oid = c.conrelid
    join pg_namespace n on n.oid = rel.relnamespace
    where n.nspname = 'public'
      and rel.relname = 'project'
      and c.contype = 'c'
      and pg_get_constraintdef(c.oid) ilike '%name%<>%''''%'
  ),
  'project.name rejects empty string'
);

select ok(
  exists (
    select 1
    from pg_constraint c
    join pg_class rel on rel.oid = c.conrelid
    join pg_namespace n on n.oid = rel.relnamespace
    where n.nspname = 'public'
      and rel.relname = 'customer'
      and c.contype = 'c'
      and pg_get_constraintdef(c.oid) ilike '%name%<>%''''%'
  ),
  'customer.name rejects empty string'
);

select ok(
  exists (
    select 1
    from pg_constraint c
    join pg_class rel on rel.oid = c.conrelid
    join pg_namespace n on n.oid = rel.relnamespace
    where n.nspname = 'public'
      and rel.relname = 'customer'
      and c.contype = 'c'
      and pg_get_constraintdef(c.oid) like '%phone_normalized%^[0-9]+$%'
  ),
  'customer.phone_normalized is digits-only'
);

select ok(
  exists (
    select 1
    from pg_constraint c
    join pg_class rel on rel.oid = c.conrelid
    join pg_namespace n on n.oid = rel.relnamespace
    where n.nspname = 'public'
      and rel.relname = 'customer'
      and c.contype = 'c'
      and pg_get_constraintdef(c.oid) ilike '%suggested_score%>=%0%'
  ),
  'customer.suggested_score is >= 0'
);

select ok(
  exists (
    select 1
    from pg_constraint c
    join pg_class rel on rel.oid = c.conrelid
    join pg_namespace n on n.oid = rel.relnamespace
    where n.nspname = 'public'
      and rel.relname = 'consultation'
      and c.contype = 'c'
      and pg_get_constraintdef(c.oid) ilike '%content%<>%''''%'
  ),
  'consultation.content rejects empty string'
);

select ok(
  exists (
    select 1
    from pg_constraint c
    join pg_class rel on rel.oid = c.conrelid
    join pg_namespace n on n.oid = rel.relnamespace
    where n.nspname = 'public'
      and rel.relname = 'consultation'
      and c.contype = 'c'
      and pg_get_constraintdef(c.oid) ilike '%content_version%>=%1%'
  ),
  'consultation.content_version is >= 1'
);

select ok(
  exists (
    select 1
    from pg_constraint c
    join pg_class rel on rel.oid = c.conrelid
    join pg_namespace n on n.oid = rel.relnamespace
    where n.nspname = 'public'
      and rel.relname = 'consultation'
      and c.contype = 'c'
      and pg_get_constraintdef(c.oid) ilike '%ai_confidence%0%1%'
  ),
  'consultation.ai_confidence is between 0 and 1'
);

select ok(
  exists (
    select 1
    from pg_constraint c
    join pg_class rel on rel.oid = c.conrelid
    join pg_namespace n on n.oid = rel.relnamespace
    where n.nspname = 'public'
      and rel.relname = 'consultation'
      and c.contype = 'c'
      and pg_get_constraintdef(c.oid) ilike '%ai_retry_count%>=%0%'
  ),
  'consultation.ai_retry_count is >= 0'
);

select ok(
  exists (
    select 1
    from pg_constraint c
    join pg_class rel on rel.oid = c.conrelid
    join pg_namespace n on n.oid = rel.relnamespace
    where n.nspname = 'public'
      and rel.relname = 'consultation'
      and c.contype = 'c'
      and pg_get_constraintdef(c.oid) ilike '%ai_analysis_status%PENDING%'
      and pg_get_constraintdef(c.oid) ilike '%COMPLETED%'
      and pg_get_constraintdef(c.oid) ilike '%LOW_CONFIDENCE%'
      and pg_get_constraintdef(c.oid) ilike '%FAILED%'
      and pg_get_constraintdef(c.oid) ilike '%0.7%'
  ),
  'consultation preserves the v1.2 AI status combination check'
);

-- updated_at trigger lives in private and is not on the immutable log
select has_schema('private');
select has_function('private'::name, 'set_updated_at'::name);
select has_trigger('public'::name, 'organization'::name, 'set_updated_at'::name);
select has_trigger('public'::name, 'project'::name, 'set_updated_at'::name);
select has_trigger('public'::name, 'project_member'::name, 'set_updated_at'::name);
select has_trigger('public'::name, 'customer'::name, 'set_updated_at'::name);
select has_trigger('public'::name, 'consultation'::name, 'set_updated_at'::name);
select hasnt_trigger('public'::name, 'customer_status_log'::name, 'set_updated_at'::name);

select * from finish();
rollback;
