"use client";

import {
  createContext,
  useContext,
  useCallback,
  useMemo,
  useEffect,
  useSyncExternalStore,
  type ReactNode,
} from "react";
import { useRouter, usePathname } from "next/navigation";

export interface AuthContextType {
  isAuthenticated: boolean;
  studentName: string;
  login: (studentName: string) => boolean;
  logout: () => void;
}

interface StoredAuth {
  authenticated: boolean;
  studentName: string;
}

const DEFAULT_STUDENT_NAME = "Abhishek";
const STORAGE_KEY = "learnos_student_auth";
let fallbackAuthSnapshot = "";

const listeners = new Set<() => void>();

function notifyAuthChange() {
  listeners.forEach((listener) => listener());
}

function subscribeAuth(callback: () => void) {
  listeners.add(callback);
  const handleStorage = (e: StorageEvent) => {
    if (e.key === STORAGE_KEY) {
      callback();
    }
  };
  window.addEventListener("storage", handleStorage);
  return () => {
    listeners.delete(callback);
    window.removeEventListener("storage", handleStorage);
  };
}

function getAuthSnapshot(): string {
  try {
    return (
      sessionStorage.getItem(STORAGE_KEY) ||
      localStorage.getItem(STORAGE_KEY) ||
      fallbackAuthSnapshot
    );
  } catch {
    return fallbackAuthSnapshot;
  }
}

function getServerAuthSnapshot(): string {
  return "";
}

function subscribeClient() {
  return () => {};
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();

  const isClient = useSyncExternalStore(
    subscribeClient,
    () => true,
    () => false
  );

  const rawAuth = useSyncExternalStore(
    subscribeAuth,
    getAuthSnapshot,
    getServerAuthSnapshot
  );

  const parsedAuth = useMemo<StoredAuth>(() => {
    if (!rawAuth) {
      return { authenticated: false, studentName: DEFAULT_STUDENT_NAME };
    }
    try {
      const data = JSON.parse(rawAuth);
      return {
        authenticated: Boolean(data.authenticated),
        studentName: typeof data.studentName === "string" ? data.studentName.trim().slice(0, 60) || DEFAULT_STUDENT_NAME : DEFAULT_STUDENT_NAME,
      };
    } catch {
      return { authenticated: false, studentName: DEFAULT_STUDENT_NAME };
    }
  }, [rawAuth]);

  const isAuthenticated = parsedAuth.authenticated;
  const studentName = parsedAuth.studentName;

  const login = useCallback((studentDisplayName: string): boolean => {
    const name = studentDisplayName.trim().slice(0, 60);
    if (!name) return false;
    const payload = JSON.stringify({ authenticated: true, studentName: name });
    fallbackAuthSnapshot = payload;
    try {
      localStorage.setItem(STORAGE_KEY, payload);
    } catch {
      // The demo can continue in this tab even when storage is unavailable.
    }
    notifyAuthChange();
    return true;
  }, []);

  const logout = useCallback(() => {
    fallbackAuthSnapshot = "";
    try {
      sessionStorage.removeItem(STORAGE_KEY);
      localStorage.removeItem(STORAGE_KEY);
    } catch {
      // Fallback
    }

    notifyAuthChange();
    router.push("/login");
  }, [router]);

  // Route protection for core learning routes
  useEffect(() => {
    if (!isClient) return;

    const protectedRoutes = [
      "/dashboard",
      "/upload",
      "/assessment",
      "/knowledge-map",
      "/tutor",
      "/note2learn",
      "/plan",
      "/quests",
      "/progress",
      "/achievements",
      "/feed",
      "/friends",
      "/messages",
      "/rooms",
      "/challenges",
      "/profile",
    ];

    const isProtected = protectedRoutes.some((route) =>
      pathname === route || pathname.startsWith(`${route}/`)
    );

    if (isProtected && !isAuthenticated) {
      router.replace("/login");
    }
  }, [isClient, isAuthenticated, pathname, router]);

  return (
    <AuthContext.Provider
      value={{
        isAuthenticated,
        studentName,
        login,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
