"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowRight, AlertCircle, User, Sparkles, BookOpen } from "lucide-react";
import { useAuth } from "@/context/auth-context";

export function LoginExperience() {
  const { isAuthenticated, login } = useAuth();
  const router = useRouter();

  const [username, setUsername] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // If already authenticated, redirect to dashboard
  useEffect(() => {
    if (isAuthenticated) {
      router.replace("/dashboard");
    }
  }, [isAuthenticated, router]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!username.trim()) {
      setError("Enter a name to open your local demo profile.");
      return;
    }

    setIsSubmitting(true);
    const success = login(username);
    setIsSubmitting(false);

    if (success) {
      router.push("/dashboard");
    } else {
      setError("Enter a name to continue.");
    }
  };

  return (
    <main className="min-h-[calc(100vh-72px)] flex items-center justify-center px-4 py-12 sm:px-6 lg:px-8">
      <div className="w-full max-w-md space-y-8">
        
        {/* Header Block */}
        <div className="text-center space-y-3">
          <div className="inline-flex items-center gap-2 rounded-full border border-[var(--border)] bg-[#FBF8F4] px-3.5 py-1 text-xs font-semibold tracking-[0.14em] uppercase text-[#2563EB]">
            <Sparkles size={13} className="text-[#2563EB]" />
            Student Access
          </div>

          <h1 className="text-3xl sm:text-4xl font-semibold tracking-[-0.04em] text-[#111111]">
            Student Login
          </h1>

          <p className="text-sm text-[#5F5A54] leading-relaxed max-w-sm mx-auto">
            Open a local demo profile to continue your learning journey on this device.
          </p>
        </div>

        {/* Login Card */}
        <div className="rounded-3xl border border-[var(--border)] bg-[#FBF8F4] p-7 sm:p-9 shadow-sm">
          <form onSubmit={handleSubmit} className="space-y-5">
            {error && (
              <div
                role="alert"
                className="flex items-center gap-2.5 rounded-xl border border-red-200 bg-red-50/80 px-4 py-3 text-xs font-medium text-red-800"
              >
                <AlertCircle size={15} className="shrink-0 text-red-600" />
                <span>{error}</span>
              </div>
            )}

            {/* Local demo profile name */}
            <div className="space-y-1.5">
              <label
                htmlFor="username"
                className="block text-xs font-semibold uppercase tracking-wider text-[#5F5A54]"
              >
                Name for this device
              </label>
              <div className="relative">
                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5 text-[#5F5A54]">
                  <User size={16} />
                </div>
                <input
                  id="username"
                  name="username"
                  type="text"
                  autoComplete="name"
                  required
                  value={username}
                  onChange={(e) => {
                    setUsername(e.target.value);
                    if (error) setError(null);
                  }}
                  placeholder="e.g. Abhishek"
                  className="w-full rounded-xl border border-[var(--border)] bg-[#F5EEE5]/40 py-2.5 pl-10 pr-4 text-sm text-[#111111] placeholder:text-[#5F5A54]/60 focus:border-[#2563EB] focus:bg-white focus:outline-none focus:ring-1 focus:ring-[#2563EB] transition"
                />
              </div>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full flex items-center justify-center gap-2 rounded-xl bg-[#111111] px-5 py-3 text-sm font-medium text-white transition hover:bg-[#222222] active:scale-[0.99] cursor-pointer disabled:opacity-60"
            >
              <span>Continue to Workspace</span>
              <ArrowRight size={16} />
            </button>
          </form>

          <p className="mt-5 border-t border-[var(--border)] pt-4 text-xs leading-5 text-[#5F5A54]">
            This is a local demo profile, not a secure account. Your name is stored only to label this browser session.
          </p>
        </div>

        {/* Footer / About Link */}
        <div className="text-center">
          <Link
            href="/about"
            className="inline-flex items-center gap-1.5 text-xs font-medium text-[#5F5A54] hover:text-[#2563EB] transition"
          >
            <BookOpen size={14} />
            <span>Discover how LearnOS adapts to your syllabus</span>
            <ArrowRight size={13} />
          </Link>
        </div>

      </div>
    </main>
  );
}
