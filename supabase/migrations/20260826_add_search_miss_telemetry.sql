create table if not exists public.real2free_search_misses (
  id bigint generated always as identity primary key,
  event_id uuid not null unique,
  created_at timestamptz not null default now(),
  query text not null,
  query_normalized text not null,
  path text not null default '/',
  result_count integer not null default 0,
  constraint real2free_search_misses_query_length_check check (char_length(query) between 2 and 120),
  constraint real2free_search_misses_query_normalized_length_check check (char_length(query_normalized) between 2 and 120),
  constraint real2free_search_misses_path_check check (char_length(path) between 1 and 500 and path like '/%'),
  constraint real2free_search_misses_result_count_check check (result_count = 0)
);

alter table public.real2free_search_misses enable row level security;
revoke all on table public.real2free_search_misses from anon, authenticated;
revoke all on sequence public.real2free_search_misses_id_seq from anon, authenticated;

create index if not exists real2free_search_misses_created_at_idx
  on public.real2free_search_misses (created_at desc);
create index if not exists real2free_search_misses_query_normalized_idx
  on public.real2free_search_misses (query_normalized);
