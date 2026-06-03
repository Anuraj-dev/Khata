import AsyncStorage from "@react-native-async-storage/async-storage";

// Retry queue is non-secret operational state — AsyncStorage only (no SecureStore).
export const retryQueueStorage = {
  getItem: (key: string) => AsyncStorage.getItem(key),
  setItem: (key: string, value: string) => AsyncStorage.setItem(key, value),
  removeItem: (key: string) => AsyncStorage.removeItem(key),
};
