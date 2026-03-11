import { get, set, del, keys, entries } from 'idb-keyval';
import type { OfflineApontamento } from '@/types';

const PREFIX = 'offline_apt_';

export async function saveOfflineApontamento(apt: OfflineApontamento): Promise<void> {
  await set(`${PREFIX}${apt.local_id}`, apt);
}

export async function getOfflineApontamentos(): Promise<OfflineApontamento[]> {
  const allEntries = await entries<string, OfflineApontamento>();
  return allEntries
    .filter(([key]) => key.startsWith(PREFIX))
    .map(([, value]) => value);
}

export async function removeOfflineApontamento(localId: string): Promise<void> {
  await del(`${PREFIX}${localId}`);
}

export async function getOfflineCount(): Promise<number> {
  const allKeys = await keys<string>();
  return allKeys.filter((key) => key.startsWith(PREFIX)).length;
}

// For photos pending upload
const PHOTO_PREFIX = 'offline_photo_';

export async function saveOfflinePhoto(id: string, data: { base64: string; apontamentoLocalId: string }): Promise<void> {
  await set(`${PHOTO_PREFIX}${id}`, data);
}

export async function getOfflinePhotos(): Promise<Array<{ id: string; base64: string; apontamentoLocalId: string }>> {
  const allEntries = await entries<string, { base64: string; apontamentoLocalId: string }>();
  return allEntries
    .filter(([key]) => key.startsWith(PHOTO_PREFIX))
    .map(([key, value]) => ({ id: key.replace(PHOTO_PREFIX, ''), ...value }));
}

export async function removeOfflinePhoto(id: string): Promise<void> {
  await del(`${PHOTO_PREFIX}${id}`);
}
