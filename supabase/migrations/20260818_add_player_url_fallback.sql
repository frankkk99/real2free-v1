-- Return the alternate URL stored on the same player record.
-- This lets the playback route use a live iframe/HLS when the preferred URL
-- has expired, while preserving the existing player ordering and ticket flow.

begin;

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
raw_candidates as (
  select
    p.id,
    coalesce(nullif(p.label, ''), 'ตัวรับชม') as label,
    nullif(p.stream_url, '') as stream_url,
    nullif(p.iframe_url, '') as iframe_url,
    nullif(p.player_url, '') as player_url,
    coalesce(p.sort_order, 0) as sort_order,
    p.created_at,
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
candidates as (
  select
    r.*,
    coalesce(r.stream_url, r.iframe_url, r.player_url) as playback_url,
    case
      when r.stream_url is not null then coalesce(r.iframe_url, r.player_url)
      when r.iframe_url is not null then r.player_url
      else null
    end as fallback_url
  from raw_candidates r
),
typed_candidates as (
  select
    c.*,
    case
      when c.playback_url ~* '(^|/)(embed|player)(/|[?]|$)' then 'embed'
      when c.playback_url ~* '(\.m3u8([?#].*)?$|/hls[^/]*/.+/master([?#].*)?$)' then 'hls'
      when c.stream_url is not null then 'hls'
      else 'embed'
    end as playback_kind,
    case
      when c.fallback_url is null then null
      when c.fallback_url ~* '(^|/)(embed|player)(/|[?]|$)' then 'embed'
      when c.fallback_url ~* '(\.m3u8([?#].*)?$|/hls[^/]*/.+/master([?#].*)?$)' then 'hls'
      else 'embed'
    end as fallback_kind
  from candidates c
),
selected as (
  select *
  from typed_candidates
  where source_index = greatest(least(coalesce(p_index, 0), 100), 0)
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
      'fallback_url', s.fallback_url,
      'fallback_kind', s.fallback_kind,
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
    'total', coalesce((select max(total_sources) from typed_candidates), 0),
    'has_next', false
  )
end;
$function$;

revoke all on function public.real2free_internal_player(uuid, uuid, integer) from public, anon, authenticated;
grant execute on function public.real2free_internal_player(uuid, uuid, integer) to service_role;

commit;
