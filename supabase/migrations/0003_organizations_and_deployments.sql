-- Organizations table (tier-1 grouping for categories)
create table if not exists organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  slug text not null unique,
  color text not null default '#c8651e',
  description text,
  position int not null default 0,
  created_at timestamptz default now()
);

alter table organizations enable row level security;
create policy "orgs_auth_all" on organizations
  for all to authenticated using (true) with check (true);

-- Seed the three orgs
insert into organizations (name, slug, color, description, position) values
  ('KarmYog / Vatika.ai', 'karmyog', '#2d6a4f', 'Garden tech, modular pricing, portfolios, training', 10),
  ('OmniDEL.ai', 'omnidel', '#1d3557', 'Ops platform, AI agents, election tools, HR, finance', 20),
  ('RARE India', 'rare', '#7b2d42', 'Boutique hotel tech, CRM, booking agents', 30)
on conflict (slug) do nothing;

-- Add org_id to categories
alter table categories add column if not exists org_id uuid references organizations(id);

-- Map existing categories to orgs
update categories set org_id = (select id from organizations where slug = 'karmyog')
where name in ('vatika.ai', 'Goa Vatika', 'Portfolios', 'Fin Models', 'Docs', 'Tech Stack', 'pricecalculator.ai', 'Kaarigar', 'mediagenie.ai');

update categories set org_id = (select id from organizations where slug = 'omnidel')
where name in ('omnidel.ai', 'DPGP', 'Demos');

update categories set org_id = (select id from organizations where slug = 'rare')
where name in ('RARE India', 'Rangamati');

-- Vercel deployments tracking table
create table if not exists vercel_deployments (
  id text primary key,
  project_name text not null,
  project_url text not null,
  branch text,
  commit_message text,
  created_at timestamptz not null,
  status text,
  org_slug text,
  link_id uuid references links(id),
  raw_meta jsonb,
  synced_at timestamptz default now()
);

create index if not exists vercel_deployments_created_idx on vercel_deployments(created_at desc);
create index if not exists vercel_deployments_project_idx on vercel_deployments(project_name);

alter table vercel_deployments enable row level security;
create policy "deployments_auth_all" on vercel_deployments
  for all to authenticated using (true) with check (true);

-- Allow service role (cron job) full access
create policy "deployments_service_all" on vercel_deployments
  for all to service_role using (true) with check (true);

-- Also allow service role on orgs/categories for the sync
create policy "orgs_service_all" on organizations
  for all to service_role using (true) with check (true);

-- Enable realtime on vercel_deployments
alter publication supabase_realtime add table vercel_deployments;
