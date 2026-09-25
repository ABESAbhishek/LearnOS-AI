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
  login: (username: string, password: string) => boolean;
  logout: () => void;
}

interface StoredAuth {
  authenticated: boolean;
  studentName: string;
}

const DEMO_USER = "student";
const DEMO_PASS = "learnos";
const DEFAULT_STUDENT_NAME = "Abhishek";
const STORAGE_KEY = "learnos_student_auth";

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
      ""
    );
  } catch {
    return "";
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
        studentName: data.studentName || DEFAULT_STUDENT_NAME,
      };
    } catch {
      return { authenticated: false, studentName: DEFAULT_STUDENT_NAME };
    }
  }, [rawAuth]);

  const isAuthenticated = parsedAuth.authenticated;
  const studentName = parsedAuth.studentName;

  const login = useCallback((username: string, password: string): boolean => {
    const cleanUser = username.trim().toLowerCase();
    const cleanPass = password.trim();

    const isValidUser = cleanUser === DEMO_USER || cleanUser === "abhishek";
    const isValidPass = cleanPass === DEMO_PASS;

    if (isValidUser && isValidPass) {
      const name = cleanUser === "student" ? "Student" : "Abhishek";
      try {
        const payload = JSON.stringify({ authenticated: true, studentName: name });
        sessionStorage.setItem(STORAGE_KEY, payload);
        localStorage.setItem(STORAGE_KEY, payload);
      } catch {
        // Fallback if storage fails
      }

      notifyAuthChange();
      return true;
    }

    return false;
  }, []);

  const logout = useCallback(() => {
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
      "/plan",
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
