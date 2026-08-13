-- Fix player kind detection for stream_url values that contain embed pages.
-- Some providers store an /embed/*.php page in stream_url. The previous function
-- treated every non-empty stream_url as HLS, so mobile Safari tried to parse HTML
-- as an HLS manifest and remained on the loading state.

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
candidates as (
  select
    p.id,
    coalesce(nullif(p.label, ''), 'ตัวรับชม') as label,
    coalesce(nullif(p.stream_url, ''), nullif(p.iframe_url, ''), nullif(p.player_url, '')) as playback_url,
    case
      when coalesce(nullif(p.stream_url, ''), nullif(p.iframe_url, ''), nullif(p.player_url, '')) ~* '(^|/)(embed|player)(/|[?]|$)' then 'embed'
      when coalesce(nullif(p.stream_url, ''), nullif(p.iframe_url, ''), nullif(p.player_url, '')) ~* '(\\.m3u8([?#].*)?$|/hls[^/]*/.+/master([?#].*)?$)' then 'hls'
      when nullif(p.stream_url, '') is not null then 'hls'
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

revoke all on function public.real2free_internal_player(uuid, uuid, integer) from public, anon, authenticated;
grant execute on function public.real2free_internal_player(uuid, uuid, integer) to service_role;

commit;
