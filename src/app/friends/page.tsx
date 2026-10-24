import { CollaborationUnavailable } from "@/components/features/collaboration-unavailable";

export default function FriendsPage() {
  return <CollaborationUnavailable section="friends" description="Find learners with shared goals, send requests, and make progress alongside people you know." needed="This workspace has local demo sign-in only and no shared user database. Friend search and requests need a configured identity provider and persistent backend." />;
}
