-- Expand Thai movie discovery using explicit TH source metadata without guessing from translated titles.
-- The source snapshot language is populated by the extractor and is treated as a fallback only
-- when the canonical classification does not already provide country/original-language metadata.

update public.content_classifications cc
set
  countries = case
    when coalesce(cc.countries, '{}'::text[]) @> array['TH'::text] then coalesce(cc.countries, '{}'::text[])
    else array_append(coalesce(cc.countries, '{}'::text[]), 'TH'::text)
  end,
  original_language = coalesce(nullif(lower(cc.original_language), ''), 'th'),
  provenance = coalesce(cc.provenance, '{}'::jsonb) || jsonb_build_object(
    'thai_source_language', true,
    'thai_source_language_at', now(),
    'thai_source_language_reason', 'source_snapshot.language=TH'
  ),
  confidence = coalesce(cc.confidence, '{}'::jsonb) || jsonb_build_object(
    'thai_source_language', 0.95
  ),
  updated_at = now()
from public.content_titles ct
join public.real2free_public_cards c on c.id = ct.id
where cc.title_id = ct.id
  and c.content_type = 'movie'
  and lower(coalesce(ct.metadata #>> '{source_snapshot,language}', '')) = 'th'
  and not (
    coalesce(cc.countries, '{}'::text[]) @> array['TH'::text]
    and lower(coalesce(cc.original_language, '')) = 'th'
  );

create or replace view real2free_private._api_impl_real2free_public_smart_cards
with (security_barrier=true)
as
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
  case
    when lower(coalesce(ct.metadata #>> '{source_snapshot,language}', '')) = 'th'
      and not (coalesce(cc.countries, '{}'::text[]) @> array['TH'::text])
      then array_append(coalesce(cc.countries, '{}'::text[]), 'TH'::text)
    else coalesce(cc.countries, '{}'::text[])
  end as countries,
  coalesce(
    nullif(lower(coalesce(cc.original_language, '')), ''),
    case when lower(coalesce(ct.metadata #>> '{source_snapshot,language}', '')) = 'th' then 'th' end
  ) as original_language,
  c.content_type = 'movie'
    and (
      coalesce(cc.countries, '{}'::text[]) @> array['TH'::text]
      or lower(coalesce(cc.original_language, '')) = 'th'
      or lower(coalesce(ct.metadata #>> '{source_snapshot,language}', '')) = 'th'
    ) as is_thai,
  coalesce(cc.format, 'standard') = 'vertical' as is_vertical
from public.real2free_public_cards c
left join public.content_classifications cc on cc.title_id = c.id
left join public.content_titles ct on ct.id = c.id;

create or replace view real2free_private._api_impl_real2free_public_home_sections
with (security_barrier=true)
as
with classified as (
  select *
  from real2free_private._api_impl_real2free_public_smart_cards
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
