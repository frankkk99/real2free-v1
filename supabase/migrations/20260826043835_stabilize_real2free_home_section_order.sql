create or replace view real2free_private._api_impl_real2free_public_home_sections
with (security_barrier=true)
as
with classified as (
  select
    c.id,
    c.content_type,
    c.title_th,
    c.title_en,
    c.release_date,
    c.year,
    c.poster_url,
    c.backdrop_url,
    c.genres,
    c.rating,
    c.vote_count,
    c.updated_at,
    c.episode_count,
    c.season_count,
    c.latest_episode,
    c.player_count,
    c.has_dub_th,
    c.has_sub_th,
    c.has_backup,
    c.language_code,
    c.is_ongoing,
    c.brand_tags,
    coalesce(cc.format, 'standard') = 'vertical' as is_vertical,
    c.content_type = 'movie'
      and (
        coalesce(cc.countries, '{}'::text[]) @> array['TH'::text]
        or lower(coalesce(cc.original_language, '')) = 'th'
      ) as is_thai
  from public.real2free_public_cards c
  left join public.content_classifications cc on cc.title_id = c.id
), ranked as (
  select
    'new'::text as section_key,
    row_number() over (
      order by release_date desc nulls last, year desc nulls last, updated_at desc, rating desc, vote_count desc, id asc
    ) as section_rank,
    classified.*
  from classified

  union all

  select
    'series'::text as section_key,
    row_number() over (
      order by updated_at desc, release_date desc nulls last, year desc nulls last, rating desc, vote_count desc, id asc
    ) as section_rank,
    classified.*
  from classified
  where content_type = 'series' and not is_vertical

  union all

  select
    'vertical'::text as section_key,
    row_number() over (
      order by updated_at desc, release_date desc nulls last, year desc nulls last, rating desc, vote_count desc, id asc
    ) as section_rank,
    classified.*
  from classified
  where content_type = 'series' and is_vertical

  union all

  select
    'thai'::text as section_key,
    row_number() over (
      order by release_date desc nulls last, year desc nulls last, updated_at desc, rating desc, vote_count desc, id asc
    ) as section_rank,
    classified.*
  from classified
  where content_type = 'movie' and is_thai
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
where section_rank <= 18;
