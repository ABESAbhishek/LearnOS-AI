import { KnowledgeMapExperience } from "@/components/features/knowledge-map-experience";

export const metadata = {
  title: "Knowledge Map – LearnOS AI",
  description: "Interactive topological map of your DSA understanding, strengths, and conceptual gaps.",
};

export default function KnowledgeMapPage() {
  return <KnowledgeMapExperience />;
}