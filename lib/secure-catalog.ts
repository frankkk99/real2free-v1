import "server-only";

import {
  mapPublicCatalogRow,
  mapPublicEpisodeRow,
  type PublicCatalogItem,
  type PublicCatalogRow,
  type PublicEpisode,
  type PublicEpisodeRow,
} from "@/lib/public-catalog";
import { callReal2freeGateway } from "@/lib/real2free-gateway";

type MetadataPayload = {
  title?: PublicCatalogRow;
  episodes?: PublicEpisodeRow[];
};

export type SecureCatalogDetail = {
  item: PublicCatalogItem;
  episodes: PublicEpisode[];
};

export async function loadSecureCatalogDetail(
  id: string,
  clientHash: string,
): Promise<SecureCatalogDetail | null> {
  const payload = await callReal2freeGateway<MetadataPayload>(
    { action: "metadata", titleId: id },
    clientHash,
  );

  const item = mapPublicCatalogRow(payload.title);
  if (!item) return null;

  const episodes = (Array.isArray(payload.episodes) ? payload.episodes : [])
    .map(mapPublicEpisodeRow)
    .filter((episode): episode is PublicEpisode => Boolean(episode));

  return { item, episodes };
}
