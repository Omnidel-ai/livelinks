-- LLL v1 schema
-- Categories + links, with RLS limiting access to authenticated users
-- (allowlist of @ky21c.org is enforced at the auth-provider level).

create extension if not exists "pgcrypto";

create table if not exists categories (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  position int not null default 0,
  created_at timestamptz default now()
);

create table if not exists links (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  url text not null,
  category_id uuid references categories(id) on delete restrict,
  sub_type text,
  note text,
  status text not null check (status in ('live', 'archive')) default 'live',
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  created_by uuid references auth.users(id)
);

create index if not exists links_status_idx on links(status);
create index if not exists links_category_idx on links(category_id);
create index if not exists links_updated_idx on links(updated_at desc);

-- Keep updated_at fresh on every UPDATE
create or replace function set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists links_set_updated_at on links;
create trigger links_set_updated_at
  before update on links
  for each row
  execute function set_updated_at();

-- Row-level security: any authenticated user (already gated to @ky21c.org by
-- the auth allowlist) may read and write everything.
alter table categories enable row level security;
alter table links enable row level security;

drop policy if exists "categories_auth_all" on categories;
create policy "categories_auth_all" on categories
  for all to authenticated
  using (true)
  with check (true);

drop policy if exists "links_auth_all" on links;
create policy "links_auth_all" on links
  for all to authenticated
  using (true)
  with check (true);

-- Seed default categories. Idempotent via "on conflict do nothing".
insert into categories (name, position) values
  ('Rangamati',          10),
  ('omnidel.ai',         20),
  ('vatika.ai',          30),
  ('mediagenie.ai',      40),
  ('pricecalculator.ai', 50),
  ('Portfolios',         60),
  ('Docs',               70),
  ('Fin Models',         80)
on conflict (name) do nothing;
