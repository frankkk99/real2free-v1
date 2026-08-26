create or replace view real2free_private._api_impl_real2free_public_home_sections
with (security_barrier = true)
as
with ranked as (
  select
    'new'::text as section_key,
    row_number() over (
      order by c.release_date desc nulls last,
               c.year desc nulls last,
               c.updated_at desc,
               c.rating desc,
               c.vote_count desc,
               c.id asc
    ) as section_rank,
    c.*
  from real2free_private._api_impl_real2free_public_smart_cards c
  where c.content_type = 'movie'

  union all

  select
    'series'::text as section_key,
    row_number() over (
      order by c.updated_at desc,
               c.release_date desc nulls last,
               c.year desc nulls last,
               c.rating desc,
               c.vote_count desc,
               c.id asc
    ) as section_rank,
    c.*
  from real2free_private._api_impl_real2free_public_smart_cards c
  where c.content_type = 'series'
    and not c.is_vertical

  union all

  select
    'vertical'::text as section_key,
    row_number() over (
      order by c.updated_at desc,
               c.release_date desc nulls last,
               c.year desc nulls last,
               c.rating desc,
               c.vote_count desc,
               c.id asc
    ) as section_rank,
    c.*
  from real2free_private._api_impl_real2free_public_smart_cards c
  where c.content_type = 'series'
    and c.is_vertical

  union all

  select
    'thai'::text as section_key,
    row_number() over (
      order by c.release_date desc nulls last,
               c.year desc nulls last,
               c.updated_at desc,
               c.rating desc,
               c.vote_count desc,
               c.id asc
    ) as section_rank,
    c.*
  from real2free_private._api_impl_real2free_public_smart_cards c
  where c.content_type = 'movie'
    and c.is_thai
)
select
  section_key,
  section_rank,
  id,
  content_type,
  title_th,
  title_en,
  release_date,
  year,
  poster_url,
  backdrop_url,
  genres,
  rating,
  vote_count,
  updated_at,
  episode_count,
  season_count,
  latest_episode,
  player_count,
  has_dub_th,
  has_sub_th,
  has_backup,
  language_code,
  is_ongoing,
  brand_tags
from ranked
where section_rank <= 24;
