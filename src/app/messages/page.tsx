import { CollaborationUnavailable } from "@/components/features/collaboration-unavailable";

export default function MessagesPage() {
  return <CollaborationUnavailable section="messages" description="Conversations should stay private to their participants and persist across sessions." needed="Direct messaging is not enabled because server-side identity, conversation storage, and participant authorization are not configured." />;
}
