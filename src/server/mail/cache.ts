type Entry<T> = { value: T; expiresAt: number };

const store = new Map<string, Entry<unknown>>();
const FOLDER_TTL_MS = 5 * 60 * 1000;
const LIST_TTL_MS = 20 * 1000;

function read<T>(key: string): T | null {
  const entry = store.get(key) as Entry<T> | undefined;
  if (!entry) return null;
  if (entry.expiresAt <= Date.now()) {
    store.delete(key);
    return null;
  }
  return entry.value;
}

function write<T>(key: string, value: T, ttlMs: number) {
  store.set(key, { value, expiresAt: Date.now() + ttlMs });
}

export function cachedFolders<T>(loader: () => Promise<T>): Promise<T> {
  const hit = read<T>("folders");
  if (hit) return Promise.resolve(hit);
  return loader().then((value) => {
    write("folders", value, FOLDER_TTL_MS);
    return value;
  });
}

export function cachedList<T>(folder: string, loader: () => Promise<T>): Promise<T> {
  const key = `list:${folder}`;
  const hit = read<T>(key);
  if (hit) return Promise.resolve(hit);
  return loader().then((value) => {
    write(key, value, LIST_TTL_MS);
    return value;
  });
}

export function invalidateMailCache() {
  store.clear();
}
