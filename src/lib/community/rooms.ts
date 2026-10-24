export type RoomVisibility = "public" | "private";
export type RoomRole = "owner" | "moderator" | "member";
export type RoomMembershipStatus = "active" | "left" | "removed";

export interface RoomMembership {
  userId: string;
  role: RoomRole;
  status: RoomMembershipStatus;
  mutedUntil?: string | null;
}

export interface RoomAccessInput {
  visibility: RoomVisibility;
  userId: string | null;
  memberships: readonly RoomMembership[];
  now?: Date;
}

export interface RoomPermissions {
  canDiscover: boolean;
  canRead: boolean;
  canJoin: boolean;
  canPost: boolean;
  canManagePins: boolean;
  canModerate: boolean;
  canInvite: boolean;
  canLeave: boolean;
}

function membershipFor(userId: string | null, memberships: readonly RoomMembership[]): RoomMembership | null {
  if (!userId) return null;
  return memberships.find((membership) => membership.userId === userId) ?? null;
}

function activeMembership(userId: string | null, memberships: readonly RoomMembership[]): RoomMembership | null {
  const membership = membershipFor(userId, memberships);
  return membership?.status === "active" ? membership : null;
}

export function getRoomPermissions(input: RoomAccessInput): RoomPermissions {
  const authenticated = Boolean(input.userId?.trim());
  const membershipRecord = membershipFor(input.userId, input.memberships);
  const membership = activeMembership(input.userId, input.memberships);
  const isPublic = input.visibility === "public";
  const mutedUntil = membership?.mutedUntil ? Date.parse(membership.mutedUntil) : Number.NaN;
  const muted = Boolean(membership?.mutedUntil) && (!Number.isFinite(mutedUntil) || mutedUntil > (input.now ?? new Date()).getTime());
  const moderator = membership?.role === "owner" || membership?.role === "moderator";
  const removed = membershipRecord?.status === "removed";

  return {
    canDiscover: authenticated && isPublic && !removed,
    canRead: authenticated && !removed && (isPublic || Boolean(membership)),
    canJoin: authenticated && isPublic && !membership && !removed,
    canPost: authenticated && Boolean(membership) && !muted,
    canManagePins: authenticated && Boolean(moderator),
    canModerate: authenticated && Boolean(moderator),
    canInvite: authenticated && Boolean(moderator),
    canLeave: authenticated && Boolean(membership) && membership?.role !== "owner",
  };
}

export interface RoomMessageInput {
  clientMessageId: string;
  body: string;
  replyToId?: string | null;
  resourceUrl?: string | null;
}

export function validateRoomMessageInput(value: unknown): value is RoomMessageInput {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const input = value as Record<string, unknown>;
  if (typeof input.clientMessageId !== "string" || !/^[A-Za-z0-9_-]{8,128}$/.test(input.clientMessageId)) return false;
  if (typeof input.body !== "string") return false;
  const body = input.body.trim();
  if (!body || body.length > 4_000 || /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/.test(body)) return false;
  if (input.replyToId !== undefined && input.replyToId !== null &&
    (typeof input.replyToId !== "string" || input.replyToId.length > 100)) return false;
  if (input.resourceUrl !== undefined && input.resourceUrl !== null) {
    if (typeof input.resourceUrl !== "string" || input.resourceUrl.length > 2_000) return false;
    try {
      const url = new URL(input.resourceUrl);
      if (url.protocol !== "https:" || url.username || url.password) return false;
    } catch {
      return false;
    }
  }
  return true;
}

export interface RoomMessagePermissionInput {
  actorId: string;
  authorId: string;
  memberships: readonly RoomMembership[];
  hiddenAt?: string | null;
  deletedAt?: string | null;
}

export function canEditRoomMessage(input: RoomMessagePermissionInput): boolean {
  const membership = activeMembership(input.actorId, input.memberships);
  return Boolean(membership && input.actorId === input.authorId && !input.hiddenAt && !input.deletedAt);
}

export function canRemoveRoomMessage(input: RoomMessagePermissionInput): boolean {
  const membership = activeMembership(input.actorId, input.memberships);
  const moderator = membership?.role === "owner" || membership?.role === "moderator";
  return Boolean(membership && !input.deletedAt && (input.actorId === input.authorId || moderator));
}

export function canRemoveRoomMember(actor: RoomMembership | null, target: RoomMembership): boolean {
  if (!actor || actor.status !== "active" || target.status !== "active" || actor.userId === target.userId) return false;
  if (actor.role === "owner") return target.role !== "owner";
  return actor.role === "moderator" && target.role === "member";
}

export const REPORT_REASONS = ["spam", "harassment", "unsafe_content", "misinformation", "other"] as const;
export type ReportReason = typeof REPORT_REASONS[number];

export function validateReportReason(value: unknown): value is ReportReason {
  return typeof value === "string" && REPORT_REASONS.includes(value as ReportReason);
}
