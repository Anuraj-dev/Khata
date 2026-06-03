import AsyncStorage from "@react-native-async-storage/async-storage";
import { classifyError, mobileLogger } from "./logger";

const STORAGE_KEY = "khata_user_prefs_v1";

export interface UserPreferences {
  currency: "INR";
  defaultCategory: "food" | "travel" | "shopping" | "bills" | "health" | "other";
  smsAutoScan: boolean;
  dailyReminderEnabled: boolean;
  dailyReminderTime: string;
}

export const DEFAULT_PREFERENCES: UserPreferences = {
  currency: "INR",
  defaultCategory: "other",
  smsAutoScan: true,
  dailyReminderEnabled: false,
  dailyReminderTime: "21:00",
};

const TIME_RE = /^([01]?\d|2[0-3]):[0-5]\d$/;

function sanitize(raw: unknown): UserPreferences {
  if (!raw || typeof raw !== "object") return { ...DEFAULT_PREFERENCES };
  const r = raw as Partial<Record<keyof UserPreferences, unknown>>;
  const validCategories = ["food", "travel", "shopping", "bills", "health", "other"] as const;
  return {
    currency: "INR",
    defaultCategory: validCategories.includes(r.defaultCategory as typeof validCategories[number])
      ? (r.defaultCategory as UserPreferences["defaultCategory"])
      : DEFAULT_PREFERENCES.defaultCategory,
    smsAutoScan: typeof r.smsAutoScan === "boolean" ? r.smsAutoScan : DEFAULT_PREFERENCES.smsAutoScan,
    dailyReminderEnabled:
      typeof r.dailyReminderEnabled === "boolean"
        ? r.dailyReminderEnabled
        : DEFAULT_PREFERENCES.dailyReminderEnabled,
    dailyReminderTime:
      typeof r.dailyReminderTime === "string" && TIME_RE.test(r.dailyReminderTime)
        ? r.dailyReminderTime
        : DEFAULT_PREFERENCES.dailyReminderTime,
  };
}

export async function loadPreferences(): Promise<UserPreferences> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    if (!raw) return { ...DEFAULT_PREFERENCES };
    return sanitize(JSON.parse(raw));
  } catch (error) {
    mobileLogger.warn("user_prefs_load_failed", { errorType: classifyError(error) });
    return { ...DEFAULT_PREFERENCES };
  }
}

export async function savePreferences(prefs: UserPreferences): Promise<void> {
  try {
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(prefs));
  } catch (error) {
    mobileLogger.warn("user_prefs_save_failed", { errorType: classifyError(error) });
  }
}

export const __testing = { sanitize };
