import AsyncStorage from "@react-native-async-storage/async-storage";

const KEY = "khata_device_id_v1";

let cached: string | null = null;

function generateId(): string {
  const bytes = new Uint8Array(6);
  const maybe = (globalThis as { crypto?: { getRandomValues?: (b: Uint8Array) => void } }).crypto;
  if (maybe?.getRandomValues) {
    maybe.getRandomValues(bytes);
  } else {
    for (let i = 0; i < 6; i++) bytes[i] = Math.floor(Math.random() * 256);
  }
  return `dev-${Array.from(bytes).map((b) => b.toString(16).padStart(2, "0")).join("")}`;
}

export async function getDeviceId(): Promise<string> {
  if (cached) return cached;
  const stored = await AsyncStorage.getItem(KEY);
  if (stored) { cached = stored; return stored; }
  const id = generateId();
  await AsyncStorage.setItem(KEY, id);
  cached = id;
  return id;
}

export async function resetDeviceId(): Promise<void> {
  cached = null;
  await AsyncStorage.removeItem(KEY);
}
