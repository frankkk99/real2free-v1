-- REAL2FREE secure playback gateway preparation
-- Creates service-role-only metadata/player RPCs and gateway rate-limit storage.

begin;

create table if not exists public.real2free_gateway_rate_limits (
  client_hash text not null,
  action text not null check (action in ('metadata', 'playback')),
  bucket_start timestamptz not null,
  request_count integer not null default 1 check (request_count > 0),
  updated_at timestamptz not null default now(),
  primary key (client_hash, action, bucket_start)
);

alter table public.real2free_gateway_rate_limits enable row level security;
alter table public.real2free_gateway_rate_limits force row level security;
revoke all on table public.real2free_gateway_rate_limits from public, anon, authenticated;
grant select, insert, update, delete on table public.real2free_gateway_rate_limits to service_role;

create or replace function public.real2free_internal_metadata(p_title_id uuid)
returns jsonb
language sql
stable
security definer
set search_path = public
as $function$
with title_row as (
  select
    ct.id,
    ct.content_type,
    coalesce(nullif(ct.title_th, ''), nullif(ct.title_en, ''), 'ไม่ระบุชื่อ') as title_th,
    coalesce(nullif(ct.title_en, ''), nullif(ct.original_title, ''), nullif(ct.title_th, ''), 'Untitled') as title_en,
    coalesce(ct.overview, '') as overview,
    ct.release_date,
    ct.year,
    ct.runtime,
    ct.poster_url,
    coalesce(ct.backdrop_url, ct.poster_url) as backdrop_url,
    coalesce(ct.genres, '{}'::text[]) as genres,
    coalesce(ct.rating, 0) as rating,
    coalesce(ct.vote_count, 0) as vote_count,
    ct.updated_at
  from public.content_titles ct
  where ct.id = p_title_id
    and ct.status = 'active'
  limit 1
),
episode_rows as (
  select
    ce.id,
    ce.series_id,
    ce.season_number,
    ce.episode_number,
    coalesce(nullif(ce.title, ''), 'ตอนที่ ' || ce.episode_number::text) as title,
    coalesce(ce.overview, '') as overview,
    ce.air_date,
    ce.runtime,
    ce.still_url,
    ce.updated_at,
    count(p.id)::integer as player_count
  from public.content_episodes ce
  left join public.players p
    on p.episode_id = ce.id
   and p.status = 'active'
   and (p.expires_at is null or p.expires_at > now())
   and coalesce(nullif(p.stream_url, ''), nullif(p.iframe_url, ''), nullif(p.player_url, '')) is not null
  where ce.series_id = p_title_id
    and ce.status = 'active'
  group by ce.id
),
direct_flags as (
  select
    count(*)::integer as player_count,
    bool_or(coalesce(p.label, '') ~* '(พากย์|dub|thai[ _-]*audio)') as has_dub_th,
    bool_or(coalesce(p.label, '') ~* '(ซับ|บรรยาย|sub(title)?)') as has_sub_th,
    bool_or(coalesce(p.sort_order, 0) > 0 or coalesce(p.label, '') ~* '(backup|สำรอง)') as has_backup
  from public.players p
  where p.title_id = p_title_id
    and p.status = 'active'
    and (p.expires_at is null or p.expires_at > now())
    and coalesce(nullif(p.stream_url, ''), nullif(p.iframe_url, ''), nullif(p.player_url, '')) is not null
),
episode_flags as (
  select
    bool_or(coalesce(p.label, '') ~* '(พากย์|dub|thai[ _-]*audio)') as has_dub_th,
    bool_or(coalesce(p.label, '') ~* '(ซับ|บรรยาย|sub(title)?)') as has_sub_th,
    bool_or(coalesce(p.sort_order, 0) > 0 or coalesce(p.label, '') ~* '(backup|สำรอง)') as has_backup
  from public.players p
  join public.content_episodes ce on ce.id = p.episode_id
  where ce.series_id = p_title_id
    and ce.status = 'active'
    and p.status = 'active'
    and (p.expires_at is null or p.expires_at > now())
    and coalesce(nullif(p.stream_url, ''), nullif(p.iframe_url, ''), nullif(p.player_url, '')) is not null
)
select jsonb_build_object(
  'title', jsonb_build_object(
    'id', t.id,
    'content_type', t.content_type,
    'title_th', t.title_th,
    'title_en', t.title_en,
    'overview', t.overview,
    'release_date', t.release_date,
    'year', t.year,
    'runtime', t.runtime,
    'poster_url', t.poster_url,
    'backdrop_url', t.backdrop_url,
    'genres', t.genres,
    'rating', t.rating,
    'vote_count', t.vote_count,
    'updated_at', t.updated_at,
    'episode_count', (select count(*)::integer from episode_rows where player_count > 0),
    'season_count', (select count(distinct season_number)::integer from episode_rows where player_count > 0),
    'latest_episode', coalesce((select max(episode_number) from episode_rows where player_count > 0), 0),
    'player_count', case
      when t.content_type = 'series' then coalesce((select max(player_count) from episode_rows), 0)
      else coalesce(df.player_count, 0)
    end,
    'has_dub_th', coalesce(df.has_dub_th, false) or coalesce(ef.has_dub_th, false),
    'has_sub_th', coalesce(df.has_sub_th, false) or coalesce(ef.has_sub_th, false),
    'has_backup', coalesce(df.has_backup, false) or coalesce(ef.has_backup, false),
    'language_code', null,
    'is_ongoing', t.content_type = 'series' and exists(select 1 from episode_rows where player_count > 0)
  ),
  'episodes', coalesce((
    select jsonb_agg(jsonb_build_object(
      'id', e.id,
      'series_id', e.series_id,
      'season_number', e.season_number,
      'episode_number', e.episode_number,
      'title', e.title,
      'overview', e.overview,
      'air_date', e.air_date,
      'runtime', e.runtime,
      'still_url', e.still_url,
      'updated_at', e.updated_at,
      'player_count', e.player_count
    ) order by e.season_number, e.episode_number)
    from episode_rows e
    where e.player_count > 0
  ), '[]'::jsonb)
)
from title_row t
cross join direct_flags df
cross join episode_flags ef;
$function$;

create or replace function public.real2free_internal_player(
  p_title_id uuid,
  p_episode_id uuid default null,
  p_index integer default 0
)
returns jsonb
language sql
stable
security definer
set search_path = public
as $function$
with valid_title as (
  select ct.id
  from public.content_titles ct
  where ct.id = p_title_id and ct.status = 'active'
),
valid_episode as (
  select ce.id
  from public.content_episodes ce
  where ce.id = p_episode_id
    and ce.series_id = p_title_id
    and ce.status = 'active'
),
candidates as (
  select
    p.id,
    coalesce(nullif(p.label, ''), 'ตัวรับชม') as label,
    coalesce(nullif(p.stream_url, ''), nullif(p.iframe_url, ''), nullif(p.player_url, '')) as playback_url,
    case
      when nullif(p.stream_url, '') is not null then 'hls'
      when coalesce(nullif(p.iframe_url, ''), nullif(p.player_url, '')) ~* '(\.m3u8([?#].*)?$|/hls[^/]*/.+/master([?#].*)?$)' then 'hls'
      else 'embed'
    end as playback_kind,
    coalesce(p.sort_order, 0) as sort_order,
    row_number() over (order by coalesce(p.sort_order, 0), p.created_at, p.id) - 1 as source_index,
    count(*) over () as total_sources
  from public.players p
  where exists(select 1 from valid_title)
    and p.status = 'active'
    and (p.expires_at is null or p.expires_at > now())
    and coalesce(nullif(p.stream_url, ''), nullif(p.iframe_url, ''), nullif(p.player_url, '')) is not null
    and (
      (p_episode_id is null and p.title_id = p_title_id)
      or
      (p_episode_id is not null and p.episode_id = p_episode_id and exists(select 1 from valid_episode))
    )
),
selected as (
  select * from candidates where source_index = greatest(least(coalesce(p_index, 0), 100), 0)
)
select case
  when not exists(select 1 from valid_title) then null
  when exists(select 1 from selected) then (
    select jsonb_build_object(
      'found', true,
      'id', s.id,
      'label', s.label,
      'url', s.playback_url,
      'kind', s.playback_kind,
      'group_key', case
        when s.label ~* '(พากย์|dub|thai[ _-]*audio)' then 'dub_th'
        when s.label ~* '(ซับ|บรรยาย|sub(title)?)' then 'sub_th'
        else 'default'
      end,
      'role', case when s.sort_order > 0 or s.label ~* '(backup|สำรอง)' then 'backup' else 'primary' end,
      'backup_index', case when s.sort_order > 0 then s.sort_order else greatest(s.source_index, 0) end,
      'order', s.sort_order,
      'index', s.source_index,
      'total', s.total_sources,
      'has_next', s.source_index + 1 < s.total_sources
    )
    from selected s
  )
  else jsonb_build_object(
    'found', false,
    'index', greatest(least(coalesce(p_index, 0), 100), 0),
    'total', coalesce((select max(total_sources) from candidates), 0),
    'has_next', false
  )
end;
$function$;

revoke all on function public.real2free_internal_metadata(uuid) from public, anon, authenticated;
revoke all on function public.real2free_internal_player(uuid, uuid, integer) from public, anon, authenticated;
grant execute on function public.real2free_internal_metadata(uuid) to service_role;
grant execute on function public.real2free_internal_player(uuid, uuid, integer) to service_role;

commit;
