"use client";

import { createContext, useCallback, useContext, useMemo, useSyncExternalStore, type ReactNode } from "react";
import { DEFAULT_PROFILE_PREFERENCES, normalizeProfilePreferences, PROFILE_STORAGE_KEY, saveProfilePreferences } from "@/lib/profile-persistence";
import type { AvatarColor, AvatarIcon, LocalProfilePreferences } from "@/types/profile";

interface ProfileContextValue {
  preferences: LocalProfilePreferences;
  hydrated: boolean;
  setAvatar: (icon: AvatarIcon, color: AvatarColor) => void;
  toggleInterest: (interest: string) => void;
  resetProfile: () => void;
}

const ProfileContext = createContext<ProfileContextValue | null>(null);
const listeners = new Set<() => void>();
let fallbackProfileSnapshot = "";

function subscribeProfile(callback: () => void) {
  listeners.add(callback);
  const handleStorage = (event: StorageEvent) => {
    if (event.key === PROFILE_STORAGE_KEY) callback();
  };
  window.addEventListener("storage", handleStorage);
  return () => {
    listeners.delete(callback);
    window.removeEventListener("storage", handleStorage);
  };
}

function getProfileSnapshot() {
  try { return window.localStorage.getItem(PROFILE_STORAGE_KEY) || fallbackProfileSnapshot; } catch { return fallbackProfileSnapshot; }
}

function getServerSnapshot() { return ""; }
function subscribeClient() { return () => {}; }
function notifyProfileChange() { listeners.forEach((listener) => listener()); }

export function ProfileProvider({ children }: { children: ReactNode }) {
  const raw = useSyncExternalStore(subscribeProfile, getProfileSnapshot, getServerSnapshot);
  const hydrated = useSyncExternalStore(subscribeClient, () => true, () => false);
  const preferences = useMemo(() => {
    if (!raw) return DEFAULT_PROFILE_PREFERENCES;
    try { return normalizeProfilePreferences(JSON.parse(raw)); } catch { return DEFAULT_PROFILE_PREFERENCES; }
  }, [raw]);

  const update = useCallback((next: LocalProfilePreferences) => {
    fallbackProfileSnapshot = JSON.stringify(normalizeProfilePreferences(next));
    try { saveProfilePreferences(window.localStorage, next); } catch { /* Keep the current tab usable if browser storage is blocked. */ }
    notifyProfileChange();
  }, []);

  const setAvatar = useCallback((avatarIcon: AvatarIcon, avatarColor: AvatarColor) => {
    update({ ...preferences, avatarIcon, avatarColor });
  }, [preferences, update]);

  const toggleInterest = useCallback((interest: string) => {
    const clean = interest.trim().slice(0, 48);
    if (!clean) return;
    update({
      ...preferences,
      interests: preferences.interests.includes(clean)
        ? preferences.interests.filter((item) => item !== clean)
        : preferences.interests.length < 12 ? [...preferences.interests, clean] : preferences.interests,
    });
  }, [preferences, update]);

  const resetProfile = useCallback(() => update(DEFAULT_PROFILE_PREFERENCES), [update]);
  const value = useMemo(() => ({ preferences, hydrated, setAvatar, toggleInterest, resetProfile }), [preferences, hydrated, setAvatar, toggleInterest, resetProfile]);

  return <ProfileContext.Provider value={value}>{children}</ProfileContext.Provider>;
}

export function useProfile() {
  const value = useContext(ProfileContext);
  if (!value) throw new Error("useProfile must be used within a ProfileProvider");
  return value;
}
