import { CollaborationUnavailable } from "@/components/features/collaboration-unavailable";

export default function ChallengesPage() {
  return <CollaborationUnavailable section="friend challenges" description="Friendly challenges should compare genuine learning activity between invited learners." needed="There are no authenticated friends or shared challenge records in the current local prototype, so multiplayer scores are not shown." />;
}
