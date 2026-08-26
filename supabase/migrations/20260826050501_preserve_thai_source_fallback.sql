-- Follow-up guard: preserve explicit TH source metadata as a fallback for newly imported movies.
-- This migration intentionally contains no data mutation; the fallback lives in the public read models
-- created by the preceding migration so future rows with source_snapshot.language=TH classify correctly.

comment on view real2free_private._api_impl_real2free_public_smart_cards is
  'REAL2FREE smart catalog read model. Thai movie classification accepts canonical TH metadata or explicit source_snapshot.language=TH fallback.';
