-- VistaBalayan governance hardening: RBAC helpers, report workflow, AI traceability, dashboard indexes, audit logs.
-- Apply in Supabase SQL editor or with `supabase db push` after linking the project.

create extension if not exists pgcrypto;

-- 1) Role-based access helpers
create or replace function public.current_profile_role()
returns text
language sql
stable
security definer
set search_path = public
as $$
  select role::text from public.profiles where id = auth.uid()
$$;

create or replace function public.current_establishment_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select establishment_id from public.profiles where id = auth.uid()
$$;

create or replace function public.is_municipal_officer()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(public.current_profile_role() = 'municipal_officer', false)
$$;

-- 2) Clear workflow states and AI traceability fields
alter table public.visitor_reports
  add column if not exists reviewed_by uuid references public.profiles(id),
  add column if not exists reviewed_at timestamptz,
  add column if not exists notes text;

alter table public.accommodation_reports
  add column if not exists reviewed_by uuid references public.profiles(id),
  add column if not exists reviewed_at timestamptz,
  add column if not exists notes text;

alter table public.ai_recommendations
  add column if not exists recommended_action text,
  add column if not exists confidence_score numeric(3,2) check (confidence_score is null or (confidence_score >= 0 and confidence_score <= 1)),
  add column if not exists model_name text,
  add column if not exists input_snapshot jsonb;

alter table public.ai_anomalies_cache
  add column if not exists confidence_score numeric(3,2) check (confidence_score is null or (confidence_score >= 0 and confidence_score <= 1)),
  add column if not exists model_name text,
  add column if not exists input_snapshot jsonb;

-- 3) Audit logs for human and automated review actions
create table if not exists public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid references public.profiles(id),
  action text not null,
  entity_type text not null,
  entity_id uuid,
  previous_values jsonb,
  new_values jsonb,
  notes text,
  created_at timestamptz not null default now()
);

alter table public.audit_logs enable row level security;

drop policy if exists "Municipal officers can read audit logs" on public.audit_logs;
create policy "Municipal officers can read audit logs"
  on public.audit_logs for select
  to authenticated
  using (public.is_municipal_officer());

drop policy if exists "Authenticated users can create audit logs" on public.audit_logs;
create policy "Authenticated users can create audit logs"
  on public.audit_logs for insert
  to authenticated
  with check (actor_id is null or actor_id = auth.uid() or public.is_municipal_officer());

-- 4) RLS guardrails. These policies are intentionally idempotent and scoped by role.
alter table public.profiles enable row level security;
alter table public.establishments enable row level security;
alter table public.visitor_reports enable row level security;
alter table public.accommodation_reports enable row level security;
alter table public.ai_recommendations enable row level security;
alter table public.ai_anomalies_cache enable row level security;

drop policy if exists "Users can read own profile and officers can read all" on public.profiles;
create policy "Users can read own profile and officers can read all"
  on public.profiles for select
  to authenticated
  using (id = auth.uid() or public.is_municipal_officer());

drop policy if exists "Officers manage profiles" on public.profiles;
create policy "Officers manage profiles"
  on public.profiles for all
  to authenticated
  using (public.is_municipal_officer())
  with check (public.is_municipal_officer());

drop policy if exists "Authenticated users can read establishments" on public.establishments;
create policy "Authenticated users can read establishments"
  on public.establishments for select
  to authenticated
  using (public.is_municipal_officer() or id = public.current_establishment_id());

drop policy if exists "Officers manage establishments" on public.establishments;
create policy "Officers manage establishments"
  on public.establishments for all
  to authenticated
  using (public.is_municipal_officer())
  with check (public.is_municipal_officer());

drop policy if exists "Visitor reports scoped by role" on public.visitor_reports;
create policy "Visitor reports scoped by role"
  on public.visitor_reports for select
  to authenticated
  using (public.is_municipal_officer() or establishment_id = public.current_establishment_id());

drop policy if exists "Staff create visitor reports for own establishment" on public.visitor_reports;
create policy "Staff create visitor reports for own establishment"
  on public.visitor_reports for insert
  to authenticated
  with check (public.is_municipal_officer() or establishment_id = public.current_establishment_id());

drop policy if exists "Officers review visitor reports" on public.visitor_reports;
create policy "Officers review visitor reports"
  on public.visitor_reports for update
  to authenticated
  using (public.is_municipal_officer())
  with check (public.is_municipal_officer());

drop policy if exists "Accommodation reports scoped by role" on public.accommodation_reports;
create policy "Accommodation reports scoped by role"
  on public.accommodation_reports for select
  to authenticated
  using (public.is_municipal_officer() or establishment_id = public.current_establishment_id());

drop policy if exists "Staff create accommodation reports for own establishment" on public.accommodation_reports;
create policy "Staff create accommodation reports for own establishment"
  on public.accommodation_reports for insert
  to authenticated
  with check (public.is_municipal_officer() or establishment_id = public.current_establishment_id());

drop policy if exists "Officers review accommodation reports" on public.accommodation_reports;
create policy "Officers review accommodation reports"
  on public.accommodation_reports for update
  to authenticated
  using (public.is_municipal_officer())
  with check (public.is_municipal_officer());

-- 5) Indexes for dashboard/report filtering performance
create index if not exists idx_visitor_reports_status_created on public.visitor_reports(status, created_at desc);
create index if not exists idx_visitor_reports_establishment_status_date on public.visitor_reports(establishment_id, status, report_date desc);
create index if not exists idx_visitor_reports_report_date on public.visitor_reports(report_date desc);
create index if not exists idx_accommodation_reports_status_created on public.accommodation_reports(status, created_at desc);
create index if not exists idx_accommodation_reports_establishment_status_date on public.accommodation_reports(establishment_id, status, report_date desc);
create index if not exists idx_accommodation_reports_report_date on public.accommodation_reports(report_date desc);
create index if not exists idx_audit_logs_entity_created on public.audit_logs(entity_type, entity_id, created_at desc);
