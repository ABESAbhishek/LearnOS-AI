import type { Metadata } from "next";
import { AboutExperience } from "@/components/features/about-experience";

export const metadata: Metadata = {
  title: "About LearnOS AI – Adaptive Learning Operating System",
  description:
    "Explore the 5 foundational pillars of LearnOS AI: syllabus extraction, diagnostic assessments, dynamic knowledge maps, pedagogical tutoring, and adaptive study plans.",
};

export default function AboutPage() {
  return <AboutExperience />;
}
