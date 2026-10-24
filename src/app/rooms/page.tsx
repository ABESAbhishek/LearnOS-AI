import { CollaborationUnavailable } from "@/components/features/collaboration-unavailable";

export default function RoomsPage() {
  return <CollaborationUnavailable section="study rooms" description="Shared rooms can make a roadmap easier to follow with a small study group." needed="Room membership, shared checklists, and messages require an authenticated shared backend. This demo does not claim that changes sync between learners." />;
}
