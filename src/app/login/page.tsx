import type { Metadata } from "next";
import { LoginExperience } from "@/components/features/login-experience";

export const metadata: Metadata = {
  title: "Student Login – LearnOS AI",
  description: "Sign in to access your adaptive learning syllabus, diagnostic assessments, and dynamic study plan.",
};

export default function LoginPage() {
  return <LoginExperience />;
}
