/**
 * Server-domain scoring policy for a future shared leaderboard.
 *
 * Callers must derive user IDs and verification evidence from an authenticated
 * backend request. This module is intentionally not a client-side XP source.
 */

export const COMMUNITY_SCORE_POLICY = {
  version: 1,
  events: {
    practice_attempt: { points: 4, dailyLimit: 5, reason: "Completed a validated practice attempt" },
    skill_demonstration: { points: 8, dailyLimit: 2, reason: "Demonstrated a skill in validated practice" },
    helpful_answer: { points: 6, dailyLimit: 3, reason: "Answer marked helpful by a room moderator" },
    battle_participation: { points: 6, dailyLimit: 2, reason: "Completed a knowledge battle" },
  },
} as const;

export type CommunityEventKind = keyof typeof COMMUNITY_SCORE_POLICY.events;
export type LeaderboardPeriod = "week" | "month";
export type LeaderboardCategory = "overall" | "mastery" | "consistency" | "community";

export interface VerifiedCommunityEvent {
  userId: string;
  eventId: string;
  sourceId: string;
  kind: CommunityEventKind;
  occurredAt: string;
  verified: true;
}

export interface CommunityAward {
  userId: string;
  eventId: string;
  sourceId: string;
  kind: CommunityEventKind;
  occurredAt: string;
  periodDay: string;
  points: number;
  reason: string;
  policyVersion: number;
}

export interface AwardResult {
  awards: CommunityAward[];
  awarded: boolean;
  reason: "awarded" | "invalid_event" | "duplicate" | "daily_limit";
}

const EVENT_KINDS = Object.keys(COMMUNITY_SCORE_POLICY.events) as CommunityEventKind[];
const MAX_TEXT_LENGTH = 180;

function cleanId(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0 && value.trim().length <= MAX_TEXT_LENGTH;
}

function utcDay(isoDate: string): string {
  return new Date(isoDate).toISOString().slice(0, 10);
}

function parseVerifiedEvent(value: unknown, now: Date): VerifiedCommunityEvent | null {
  if (!Number.isFinite(now.getTime())) return null;
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const event = value as Record<string, unknown>;
  if (!cleanId(event.userId) || !cleanId(event.eventId) || !cleanId(event.sourceId)) return null;
  if (event.verified !== true || typeof event.kind !== "string" || !EVENT_KINDS.includes(event.kind as CommunityEventKind)) return null;
  if (typeof event.occurredAt !== "string" || !Number.isFinite(Date.parse(event.occurredAt))) return null;
  const timestamp = Date.parse(event.occurredAt);
  if (timestamp > now.getTime() + 5 * 60_000) return null;
  return {
    userId: event.userId.trim(),
    eventId: event.eventId.trim(),
    sourceId: event.sourceId.trim(),
    kind: event.kind as CommunityEventKind,
    occurredAt: new Date(timestamp).toISOString(),
    verified: true,
  };
}

/** Apply a server-verified event once, with a per-user UTC-day cap. */
export function applyCommunityEvent(
  awards: readonly CommunityAward[],
  input: unknown,
  now = new Date(),
): AwardResult {
  const event = parseVerifiedEvent(input, now);
  if (!event) return { awards: [...awards], awarded: false, reason: "invalid_event" };
  if (awards.some((award) => award.userId === event.userId && award.eventId === event.eventId)) {
    return { awards: [...awards], awarded: false, reason: "duplicate" };
  }

  const rule = COMMUNITY_SCORE_POLICY.events[event.kind];
  const periodDay = utcDay(event.occurredAt);
  const dailyCount = awards.filter((award) =>
    award.userId === event.userId && award.kind === event.kind && award.periodDay === periodDay,
  ).length;
  if (dailyCount >= rule.dailyLimit) return { awards: [...awards], awarded: false, reason: "daily_limit" };

  const award: CommunityAward = {
    userId: event.userId,
    eventId: event.eventId,
    sourceId: event.sourceId,
    kind: event.kind,
    occurredAt: event.occurredAt,
    periodDay,
    points: rule.points,
    reason: rule.reason,
    policyVersion: COMMUNITY_SCORE_POLICY.version,
  };
  return { awards: [...awards, award], awarded: true, reason: "awarded" };
}

export interface LeaderboardProfile {
  userId: string;
  displayName: string;
  visibility: "public" | "friends" | "private";
}

export interface LeaderboardRow {
  rank: number;
  displayName: string;
  score: number;
}

export interface LeaderboardResult {
  category: LeaderboardCategory;
  period: LeaderboardPeriod;
  periodKey: string;
  rows: LeaderboardRow[];
}

function isoWeekKey(date: Date): string {
  const thursday = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
  thursday.setUTCDate(thursday.getUTCDate() + 3 - ((thursday.getUTCDay() + 6) % 7));
  const weekYear = thursday.getUTCFullYear();
  const firstThursday = new Date(Date.UTC(weekYear, 0, 4));
  firstThursday.setUTCDate(firstThursday.getUTCDate() + 3 - ((firstThursday.getUTCDay() + 6) % 7));
  const week = 1 + Math.round((thursday.getTime() - firstThursday.getTime()) / 604_800_000);
  return `${weekYear}-W${String(week).padStart(2, "0")}`;
}

export function leaderboardPeriodKey(date: Date, period: LeaderboardPeriod): string {
  if (!Number.isFinite(date.getTime())) throw new Error("A valid period date is required.");
  return period === "week"
    ? isoWeekKey(date)
    : `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}`;
}

export function leaderboardPeriodBounds(key: string, period: LeaderboardPeriod): { start: Date; end: Date } | null {
  if (period === "month") {
    const match = /^(\d{4})-(0[1-9]|1[0-2])$/.exec(key);
    if (!match) return null;
    const start = new Date(Date.UTC(Number(match[1]), Number(match[2]) - 1, 1));
    return { start, end: new Date(Date.UTC(start.getUTCFullYear(), start.getUTCMonth() + 1, 1)) };
  }

  const match = /^(\d{4})-W(0[1-9]|[1-4]\d|5[0-3])$/.exec(key);
  if (!match) return null;
  const year = Number(match[1]);
  const week = Number(match[2]);
  const jan4 = new Date(Date.UTC(year, 0, 4));
  const firstMonday = new Date(Date.UTC(year, 0, 4 - ((jan4.getUTCDay() + 6) % 7)));
  const start = new Date(firstMonday.getTime() + (week - 1) * 604_800_000);
  if (isoWeekKey(start) !== key) return null;
  return { start, end: new Date(start.getTime() + 604_800_000) };
}

function categoryIncludes(kind: CommunityEventKind, category: LeaderboardCategory): boolean {
  if (category === "mastery") return kind === "skill_demonstration";
  if (category === "community") return kind === "helpful_answer" || kind === "battle_participation";
  return true;
}

function buildRows(scores: Map<string, number>, profiles: readonly LeaderboardProfile[]): LeaderboardRow[] {
  const nameByUser = new Map(profiles
    .filter((profile) => profile.visibility === "public" && cleanId(profile.displayName))
    .map((profile) => [profile.userId, profile.displayName.trim().slice(0, 60)]));
  const sorted = [...scores.entries()]
    .flatMap(([userId, score]) => {
      const displayName = nameByUser.get(userId);
      return displayName && score > 0 ? [{ displayName, score }] : [];
    })
    .sort((left, right) => right.score - left.score || left.displayName.localeCompare(right.displayName));

  let previousScore: number | undefined;
  let previousRank = 0;
  return sorted.map((row, index) => {
    if (row.score !== previousScore) previousRank = index + 1;
    previousScore = row.score;
    return { ...row, rank: previousRank };
  });
}

export function buildPublicLeaderboard(input: {
  awards: readonly CommunityAward[];
  profiles: readonly LeaderboardProfile[];
  category: LeaderboardCategory;
  period: LeaderboardPeriod;
  periodKey: string;
}): LeaderboardResult {
  const bounds = leaderboardPeriodBounds(input.periodKey, input.period);
  const scores = new Map<string, number>();
  const activeDaysByUser = new Map<string, Set<string>>();
  if (bounds) {
    for (const award of input.awards) {
      const timestamp = Date.parse(award.occurredAt);
      if (!Number.isFinite(timestamp) || timestamp < bounds.start.getTime() || timestamp >= bounds.end.getTime()) continue;
      if (!categoryIncludes(award.kind, input.category)) continue;
      if (input.category === "consistency") {
        const days = activeDaysByUser.get(award.userId) ?? new Set<string>();
        days.add(utcDay(award.occurredAt));
        activeDaysByUser.set(award.userId, days);
      } else {
        scores.set(award.userId, (scores.get(award.userId) ?? 0) + award.points);
      }
    }
  }
  if (input.category === "consistency") {
    for (const [userId, activeDays] of activeDaysByUser) scores.set(userId, activeDays.size);
  }
  return {
    category: input.category,
    period: input.period,
    periodKey: input.periodKey,
    rows: buildRows(scores, input.profiles),
  };
}

export interface ImprovementResult {
  period: LeaderboardPeriod;
  currentPeriodKey: string;
  previousPeriodKey: string;
  rows: Array<LeaderboardRow & { changePerActiveDay: number }>;
  status: "ready" | "insufficient_data";
}

export function buildMostImprovedLeaderboard(input: {
  awards: readonly CommunityAward[];
  profiles: readonly LeaderboardProfile[];
  period: LeaderboardPeriod;
  currentPeriodKey: string;
  minimumActiveDays?: number;
}): ImprovementResult {
  const currentBounds = leaderboardPeriodBounds(input.currentPeriodKey, input.period);
  const previousDate = currentBounds ? new Date(currentBounds.start.getTime() - 1) : new Date(Number.NaN);
  const previousPeriodKey = Number.isFinite(previousDate.getTime())
    ? leaderboardPeriodKey(previousDate, input.period)
    : "";
  const previousBounds = leaderboardPeriodBounds(previousPeriodKey, input.period);
  const minimumActiveDays = Math.max(2, Math.min(14, Math.floor(input.minimumActiveDays ?? 3)));
  const eligibleProfiles = input.profiles.filter((profile) => profile.visibility === "public" && cleanId(profile.displayName));
  const rows: Array<LeaderboardRow & { changePerActiveDay: number }> = [];

  if (currentBounds && previousBounds) {
    for (const profile of eligibleProfiles) {
      const current = input.awards.filter((award) => award.userId === profile.userId && Date.parse(award.occurredAt) >= currentBounds.start.getTime() && Date.parse(award.occurredAt) < currentBounds.end.getTime());
      const previous = input.awards.filter((award) => award.userId === profile.userId && Date.parse(award.occurredAt) >= previousBounds.start.getTime() && Date.parse(award.occurredAt) < previousBounds.end.getTime());
      const currentDays = new Set(current.map((award) => award.periodDay)).size;
      const previousDays = new Set(previous.map((award) => award.periodDay)).size;
      if (currentDays < minimumActiveDays || previousDays < minimumActiveDays) continue;
      const currentRate = current.reduce((sum, award) => sum + award.points, 0) / currentDays;
      const previousRate = previous.reduce((sum, award) => sum + award.points, 0) / previousDays;
      if (previousRate <= 0) continue;
      const changePerActiveDay = Number((currentRate - previousRate).toFixed(2));
      if (changePerActiveDay <= 0) continue;
      rows.push({
        rank: 0,
        displayName: profile.displayName.trim().slice(0, 60),
        score: changePerActiveDay,
        changePerActiveDay,
      });
    }
  }

  rows.sort((left, right) => right.changePerActiveDay - left.changePerActiveDay || left.displayName.localeCompare(right.displayName));
  let previousScore: number | undefined;
  let previousRank = 0;
  rows.forEach((row, index) => {
    if (row.changePerActiveDay !== previousScore) previousRank = index + 1;
    row.rank = previousRank;
    previousScore = row.changePerActiveDay;
  });

  return {
    period: input.period,
    currentPeriodKey: input.currentPeriodKey,
    previousPeriodKey,
    rows,
    status: rows.length ? "ready" : "insufficient_data",
  };
}
