import AsyncStorage from '@react-native-async-storage/async-storage';
import * as FileSystem from 'expo-file-system/legacy';

const CACHE_KEY = 'husman.home-catalog.v1';
const DIRECTORY = FileSystem.documentDirectory + 'home-images/';

export async function readHomeCatalog() {
  try {
    const raw = await AsyncStorage.getItem(CACHE_KEY);
    const saved = raw ? JSON.parse(raw) : null;
    if (!Array.isArray(saved?.rows) || !saved.images) return null;
    const entries = await Promise.all(Object.entries(saved.images).map(async ([name, image]) => {
      const exists = image?.uri && (await FileSystem.getInfoAsync(image.uri)).exists;
      return exists ? [name, image] : null;
    }));
    return { rows: saved.rows, images: Object.fromEntries(entries.filter(Boolean)) };
  } catch { return null; }
}

// Publish a new local snapshot only after downloads finish. A failed download
// keeps the previous local picture; it never blocks opening the app.
export async function saveHomeCatalog(rows, sources, previous) {
  await FileSystem.makeDirectoryAsync(DIRECTORY, { intermediates: true });
  const images = {};
  const entries = Object.entries(sources).filter(([, url]) => typeof url === 'string' && /^https?:/.test(url));
  let next = 0;
  async function worker() {
    while (next < entries.length) {
      const [name, url] = entries[next++];
      const old = previous?.images?.[name];
      if (old?.remote === url && (await FileSystem.getInfoAsync(old.uri)).exists) {
        images[name] = old;
        continue;
      }
      const target = DIRECTORY + Date.now() + '-' + Math.random().toString(36).slice(2) + '.img';
      try {
        const result = await FileSystem.downloadAsync(url, target);
        if (result.status !== 200) throw new Error('Image download failed');
        images[name] = { uri: result.uri, remote: url };
      } catch {
        if (old) images[name] = old;
      }
    }
  }
  await Promise.all([worker(), worker(), worker()]);
  const snapshot = { rows, images };
  await AsyncStorage.setItem(CACHE_KEY, JSON.stringify(snapshot));
  // Delete only files no longer referenced by the newly committed snapshot.
  const active = new Set(Object.values(images).map(image => image.uri));
  const files = await FileSystem.readDirectoryAsync(DIRECTORY);
  await Promise.all(files.filter(file => !active.has(DIRECTORY + file))
    .map(file => FileSystem.deleteAsync(DIRECTORY + file, { idempotent: true }).catch(() => {})));
  return snapshot;
}
