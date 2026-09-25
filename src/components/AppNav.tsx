"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, X, LogOut } from "lucide-react";
import { useAuth } from "@/context/auth-context";

const authenticatedNav = [
  { name: "Overview", href: "/dashboard" },
  { name: "Syllabus", href: "/upload" },
  { name: "Assessment", href: "/assessment" },
  { name: "Knowledge Map", href: "/knowledge-map" },
  { name: "AI Tutor", href: "/tutor" },
  { name: "Study Plan", href: "/plan" },
  { name: "About", href: "/about" },
];

const guestNav = [
  { name: "About", href: "/about" },
  { name: "Student Login", href: "/login" },
];

export default function AppNav() {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);
  const { isAuthenticated, studentName, logout } = useAuth();

  const currentNav = isAuthenticated ? authenticatedNav : guestNav;

  return (
    <header className="sticky top-0 z-50 border-b border-[var(--border)] bg-[#F5EEE5]/95 backdrop-blur-md">
      <div className="mx-auto flex h-[72px] max-w-[1600px] items-center justify-between px-6 md:px-10 lg:px-14">
        
        {/* Logo */}
        <Link
          href={isAuthenticated ? "/dashboard" : "/login"}
          className="flex shrink-0 items-center gap-3 transition-opacity hover:opacity-90"
          aria-label="LearnOS AI Home"
        >
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#111111] text-sm font-semibold text-white shadow-sm">
            L
          </div>

          <div className="text-[17px] font-semibold tracking-[-0.03em] text-[#111111]">
            learnos
            <span className="text-[#2563EB]">.</span>
            <span className="ml-0.5 text-[13px] font-medium text-[#5F5A54]">
              AI
            </span>
          </div>
        </Link>

        {/* Desktop Navigation */}
        <nav className="hidden items-center gap-1 md:flex" aria-label="Main Navigation">
          {currentNav.map((item) => {
            const isActive =
              pathname === item.href ||
              (item.href === "/dashboard" && pathname === "/");

            return (
              <Link
                key={item.href}
                href={item.href}
                className={`relative px-4 py-2 text-sm font-medium transition-colors duration-200 ${
                  isActive
                    ? "text-[#111111]"
                    : "text-[#5F5A54] hover:text-[#111111]"
                }`}
                aria-current={isActive ? "page" : undefined}
              >
                {item.name}

                {isActive && (
                  <span className="absolute bottom-0 left-4 right-4 h-[2px] rounded-full bg-[#2563EB]" />
                )}
              </Link>
            );
          })}
        </nav>

        {/* User & Mobile Toggle */}
        <div className="flex items-center gap-3">
          {isAuthenticated ? (
            <>
              <div className="hidden text-right sm:block">
                <p className="text-sm font-semibold leading-tight text-[#111111]">
                  {studentName}
                </p>
                <div className="flex items-center justify-end gap-1.5 mt-0.5 text-[11px] text-[#5F5A54]">
                  <span>Learner</span>
                  <span className="text-black/30">·</span>
                  <button
                    type="button"
                    onClick={logout}
                    className="text-[#2563EB] hover:underline cursor-pointer font-medium"
                  >
                    Logout
                  </button>
                </div>
              </div>

              <div className="flex h-10 w-10 items-center justify-center rounded-full border border-black/15 bg-[#F8F2EA] text-sm font-medium text-[#111111]">
                {studentName.charAt(0).toUpperCase()}
              </div>
            </>
          ) : (
            <Link
              href="/login"
              className="hidden sm:inline-flex items-center gap-1.5 rounded-full bg-[#111111] px-4 py-2 text-xs font-semibold text-white transition hover:bg-[#222222] active:scale-[0.99]"
            >
              Student Login
            </Link>
          )}

          {/* Mobile Menu Button */}
          <button
            type="button"
            onClick={() => setMobileOpen(!mobileOpen)}
            className="flex h-10 w-10 items-center justify-center rounded-full border border-black/15 bg-[#F8F2EA] text-[#111111] md:hidden"
            aria-label={mobileOpen ? "Close menu" : "Open menu"}
            aria-expanded={mobileOpen}
          >
            {mobileOpen ? <X size={18} /> : <Menu size={18} />}
          </button>
        </div>
      </div>

      {/* Mobile Navigation Dropdown */}
      {mobileOpen && (
        <div className="border-t border-[var(--border)] bg-[#F5EEE5] px-6 py-4 md:hidden">
          <nav className="flex flex-col gap-1">
            {currentNav.map((item) => {
              const isActive =
                pathname === item.href ||
                (item.href === "/dashboard" && pathname === "/");

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setMobileOpen(false)}
                  className={`flex items-center justify-between rounded-xl px-4 py-3 text-sm font-medium transition-colors ${
                    isActive
                      ? "bg-[#E8F0FF] text-[#2563EB]"
                      : "text-[#5F5A54] hover:bg-black/5 hover:text-[#111111]"
                  }`}
                  aria-current={isActive ? "page" : undefined}
                >
                  <span>{item.name}</span>
                  {isActive && (
                    <span className="h-1.5 w-1.5 rounded-full bg-[#2563EB]" />
                  )}
                </Link>
              );
            })}
          </nav>

          {isAuthenticated && (
            <div className="mt-4 pt-3 border-t border-[var(--border)] flex items-center justify-between px-2">
              <div className="text-xs text-[#5F5A54]">
                Signed in as <span className="font-semibold text-[#111111]">{studentName}</span>
              </div>
              <button
                type="button"
                onClick={() => {
                  setMobileOpen(false);
                  logout();
                }}
                className="flex items-center gap-1.5 text-xs font-semibold text-red-600 hover:underline cursor-pointer"
              >
                <LogOut size={13} />
                <span>Logout</span>
              </button>
            </div>
          )}
        </div>
      )}
    </header>
  );
}