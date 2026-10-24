import type { AvatarColor, AvatarIcon, LocalProfilePreferences } from "../types/profile";

export const PROFILE_STORAGE_KEY = "learnos_profile_preferences";
export const DEFAULT_PROFILE_PREFERENCES: LocalProfilePreferences = {
  avatarIcon: "sparkles",
  avatarColor: "blue",
  interests: [],
};

const ICONS: AvatarIcon[] = ["sparkles", "book", "bolt", "leaf"];
const COLORS: AvatarColor[] = ["blue", "violet", "coral", "green"];

export function normalizeProfilePreferences(value: unknown): LocalProfilePreferences {
  if (value === null || typeof value !== "object" || Array.isArray(value)) return DEFAULT_PROFILE_PREFERENCES;
  const raw = value as Record<string, unknown>;
  const interests = Array.isArray(raw.interests)
    ? [...new Set(raw.interests.filter((item): item is string => typeof item === "string")
      .map((item) => item.trim().slice(0, 48)).filter(Boolean))].slice(0, 12)
    : [];
  return {
    avatarIcon: ICONS.includes(raw.avatarIcon as AvatarIcon) ? raw.avatarIcon as AvatarIcon : DEFAULT_PROFILE_PREFERENCES.avatarIcon,
    avatarColor: COLORS.includes(raw.avatarColor as AvatarColor) ? raw.avatarColor as AvatarColor : DEFAULT_PROFILE_PREFERENCES.avatarColor,
    interests,
  };
}

export function loadProfilePreferences(storage: Pick<Storage, "getItem">): LocalProfilePreferences {
  try {
    const raw = storage.getItem(PROFILE_STORAGE_KEY);
    return raw ? normalizeProfilePreferences(JSON.parse(raw)) : DEFAULT_PROFILE_PREFERENCES;
  } catch {
    return DEFAULT_PROFILE_PREFERENCES;
  }
}

export function saveProfilePreferences(storage: Pick<Storage, "setItem">, value: unknown): boolean {
  try {
    storage.setItem(PROFILE_STORAGE_KEY, JSON.stringify(normalizeProfilePreferences(value)));
    return true;
  } catch {
    return false;
  }
}
