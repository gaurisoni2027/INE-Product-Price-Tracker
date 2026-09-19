create table products (
  id uuid primary key default gen_random_uuid(),
  external_id text not null unique,
  name text not null,
  url text not null,
  image_url text,
  scrape_interval_min int not null default 120 check (scrape_interval_min >= 15),
  next_scrape_at timestamptz not null default now(),
  last_success_at timestamptz,
  last_run_outcome text,
  consecutive_failures int not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);
create table scrape_runs (
  id bigint generated always as identity primary key,
  product_id uuid not null references products(id) on delete cascade,
  batch_id uuid not null,
  trigger text not null check (trigger in ('cron','manual','baseline','cli')),
  scheduled_for timestamptz not null,
  started_at timestamptz not null default now(),
  finished_at timestamptz,
  outcome text not null default 'running' check (outcome in ('running','success','failed','abandoned')),
  attempts int not null default 0,
  error_type text,
  parser_variant text,
  unique (product_id, scheduled_for)
);
create table scrape_attempts (
  id bigint generated always as identity primary key,
  run_id bigint not null references scrape_runs(id) on delete cascade,
  attempt_no int not null,
  started_at timestamptz not null default now(),
  duration_ms int,
  outcome text not null check (outcome in ('success','retried','failed')),
  http_status int,
  error_type text,
  detail text,
  unique (run_id, attempt_no)
);
create table price_history (
  id bigint generated always as identity primary key,
  product_id uuid not null references products(id) on delete cascade,
  run_id bigint not null unique references scrape_runs(id),
  price numeric(12,2) not null check (price > 0),
  currency text not null,
  in_stock boolean not null,
  stock_qty int check (stock_qty >= 0),
  raw_price text not null,
  raw_stock text not null,
  scraped_at timestamptz not null default now()
);
create index on price_history (product_id, scraped_at desc);
create index on scrape_runs (product_id, started_at desc);
create index on products (next_scrape_at) where is_active;
