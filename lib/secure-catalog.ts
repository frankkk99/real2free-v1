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
import { fetchVip6Detail, vip6ApiConfigured } from "@/lib/apiplayer-vip6";

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
  if (vip6ApiConfigured() && /^[0-9a-f-]{36}$/i.test(id)) {
    return fetchVip6Detail(id);
  }

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
