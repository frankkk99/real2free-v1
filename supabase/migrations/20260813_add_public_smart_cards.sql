-- Public catalog surface for structured search and filters.
-- It exposes only safe catalog metadata plus aggregate classification fields.

begin;

create or replace view public.real2free_public_smart_cards
with (security_barrier = true)
as
select
  c.*,
  coalesce(cc.countries, '{}'::text[]) as countries,
  nullif(lower(coalesce(cc.original_language, '')), '') as original_language,
  (
    c.content_type = 'movie'
    and (
      coalesce(cc.countries, '{}'::text[]) @> array['TH']::text[]
      or lower(coalesce(cc.original_language, '')) = 'th'
    )
  ) as is_thai
from public.real2free_public_cards c
left join public.content_classifications cc on cc.title_id = c.id;

alter view public.real2free_public_smart_cards set (security_barrier = true);
revoke all on public.real2free_public_smart_cards from public;
grant select on public.real2free_public_smart_cards to anon, authenticated;

commit;
