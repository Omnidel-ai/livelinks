-- Add source_date (month+year of the original source, stored as date)
-- and description (longer expandable text, separate from note)
alter table links add column if not exists source_date date;
alter table links add column if not exists description text;

create index if not exists links_source_date_idx on links(source_date);
