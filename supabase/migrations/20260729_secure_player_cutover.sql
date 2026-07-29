-- REAL2FREE secure click-to-play cutover
-- Apply only after the secure-click-to-play application build is live and verified.
-- This migration removes browser-readable player URLs while keeping safe catalog metadata public.

begin;

-- Keep the existing public detail shape for compatibility, but never return player URLs.
-- REAL2FREE only needs metadata and aggregate availability flags before a user clicks Play.
create or replace view public.real2free_public_titles as
select
  c.id,
  c.content_type,
  c.title_th,
  c.title_en,
  coalesce(ct.overview, '') as overview,
  c.release_date,
  c.year,
  ct.runtime,
  c.poster_url,
  c.backdrop_url,
  c.genres,
  c.rating,
  c.vote_count,
  c.updated_at,
  '[]'::jsonb as players,
  c.episode_count,
  c.season_count,
  c.latest_episode,
  c.player_count,
  c.has_dub_th,
  c.has_sub_th,
  c.has_backup,
  c.language_code,
  c.is_ongoing
from public.real2free_public_cards c
join public.content_titles ct on ct.id = c.id
where ct.status = 'active';

alter view public.real2free_public_titles set (security_barrier = true);

-- Safe public surfaces remain readable.
grant select on public.real2free_public_titles to anon, authenticated;
grant select on public.real2free_public_cards to anon, authenticated;
grant select on public.real2free_public_series_summary to anon, authenticated;

-- URL-bearing legacy views are server-only after cutover.
revoke all on public.real2free_public_titles_base from public, anon, authenticated;
revoke all on public.real2free_public_episodes from public, anon, authenticated;
revoke all on public.real2free_public_catalog from public, anon, authenticated;

grant select on public.real2free_public_titles_base to service_role;
grant select on public.real2free_public_episodes to service_role;
grant select on public.real2free_public_catalog to service_role;

-- Raw players remain available to authenticated admins through the existing admin RLS policy,
-- but the broad public policy is removed. Anonymous clients receive no table grant.
drop policy if exists real2free_public_active_players on public.players;
revoke select on public.players from anon;

-- The gateway RPCs are never callable with browser roles.
revoke all on function public.real2free_internal_metadata(uuid) from public, anon, authenticated;
revoke all on function public.real2free_internal_player(uuid, uuid, integer) from public, anon, authenticated;
grant execute on function public.real2free_internal_metadata(uuid) to service_role;
grant execute on function public.real2free_internal_player(uuid, uuid, integer) to service_role;

-- Fail the migration if a future edit accidentally restores player data to the safe view.
do $verification$
begin
  if exists (
    select 1
    from public.real2free_public_titles
    where players <> '[]'::jsonb
  ) then
    raise exception 'Cutover failed: real2free_public_titles still exposes player data';
  end if;

  if exists (
    select 1
    from information_schema.role_table_grants
    where table_schema = 'public'
      and table_name in (
        'real2free_public_titles_base',
        'real2free_public_episodes',
        'real2free_public_catalog'
      )
      and grantee in ('anon', 'authenticated')
      and privilege_type = 'SELECT'
  ) then
    raise exception 'Cutover failed: a legacy URL-bearing view is still browser-readable';
  end if;

  if exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'players'
      and policyname = 'real2free_public_active_players'
  ) then
    raise exception 'Cutover failed: broad public players policy still exists';
  end if;
end;
$verification$;

commit;
