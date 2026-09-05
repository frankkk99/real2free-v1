import "server-only";

import type { PublicCatalogItem, PublicEpisode } from "@/lib/public-catalog";
import { fetchVip6Detail } from "@/lib/apiplayer-vip6";

export type SecureCatalogDetail = {
  item: PublicCatalogItem;
  episodes: PublicEpisode[];
};

export async function loadSecureCatalogDetail(
  id: string,
  _clientHash: string,
): Promise<SecureCatalogDetail | null> {
  if (!/^[0-9a-f-]{36}$/i.test(id)) return null;

  // REAL2FREE is the APIPlayer reference client. Secure watch metadata must come
  // from APIPlayer only so a broken customer API path cannot be hidden by the
  // legacy real2free gateway.
  return fetchVip6Detail(id);
}
