import type { Metadata } from "next";
import { Note2LearnExperience } from "@/components/features/note2learn-experience";

export const metadata: Metadata = {
  title: "Note2Learn – LearnOS AI",
  description: "Turn your study notes into explanations, recall cards, and a short quiz.",
};

export default function Note2LearnPage() {
  return <Note2LearnExperience />;
}
