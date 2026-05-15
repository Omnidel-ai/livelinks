-- Add featured flag to links
alter table links add column if not exists featured boolean not null default false;
create index if not exists links_featured_idx on links(featured) where featured = true;
