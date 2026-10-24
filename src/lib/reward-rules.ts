import type { GamificationState } from "../types/learning";

export const REWARD_RULES = {
  lesson: 20,
  practice: 10,
  diagnostic: 15,
  noteQuiz: 10,
  dailyQuest: 15,
  masteryMilestone: 25,
} as const;

export const WEEKLY_LEARNING_GOAL_DAYS = 4;
export const XP_MILESTONES = [100, 250, 500, 1_000] as const;

export function getNextXPMilestone(xp: number): number | null {
  return XP_MILESTONES.find((milestone) => xp < milestone) ?? null;
}

export type RewardKind = keyof typeof REWARD_RULES;

export interface RewardEvent {
  id: string;
  kind: RewardKind;
  localDate: string;
  badge?: string;
}

export interface RewardResult {
  state: GamificationState;
  xpAwarded: number;
  duplicate: boolean;
}

export const INITIAL_GAMIFICATION_STATE: GamificationState = {
  xp: 0,
  currentStreak: 0,
  bestStreak: 0,
  lastActivityDate: null,
  activityDates: [],
  rewardedEventIds: [],
  badges: [],
};

export function localDateKey(date = new Date()): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function awardLearningEvent(state: GamificationState, event: RewardEvent): RewardResult {
  if (!event.id || state.rewardedEventIds.includes(event.id)) {
    return { state, xpAwarded: 0, duplicate: true };
  }
  if (!isDateKey(event.localDate)) return { state, xpAwarded: 0, duplicate: false };

  const activityDates = [...new Set([...state.activityDates, event.localDate])].slice(-400);
  const currentStreak = nextStreak(state.lastActivityDate, state.currentStreak, event.localDate);
  const xpAwarded = REWARD_RULES[event.kind];
  const nextXP = Math.min(1_000_000, state.xp + xpAwarded);
  const milestoneBadges = XP_MILESTONES
    .filter((milestone) => state.xp < milestone && nextXP >= milestone)
    .map((milestone) => `${milestone} XP milestone`);
  const badges = [...new Set([
    ...state.badges,
    ...(event.badge ? [event.badge] : []),
    ...milestoneBadges,
  ])].slice(-100);

  return {
    state: {
      ...state,
      xp: nextXP,
      currentStreak,
      bestStreak: Math.max(state.bestStreak, currentStreak),
      lastActivityDate: event.localDate,
      activityDates,
      rewardedEventIds: [...state.rewardedEventIds, event.id].slice(-2_000),
      badges,
    },
    xpAwarded,
    duplicate: false,
  };
}

export function weeklyActiveDays(activityDates: readonly string[], currentDate: string): number {
  if (!isDateKey(currentDate)) return 0;
  const date = parseLocalDate(currentDate);
  const monday = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const daysSinceMonday = (monday.getDay() + 6) % 7;
  monday.setDate(monday.getDate() - daysSinceMonday);
  const sunday = new Date(monday.getFullYear(), monday.getMonth(), monday.getDate());
  sunday.setDate(sunday.getDate() + 6);
  const startKey = localDateKey(monday);
  const endKey = localDateKey(sunday);
  return new Set(activityDates.filter((day) => isDateKey(day) && day >= startKey && day <= endKey)).size;
}

function nextStreak(previousDate: string | null, previousStreak: number, today: string): number {
  if (previousDate === today) return previousStreak;
  if (!previousDate || !isDateKey(previousDate)) return 1;
  const yesterday = parseLocalDate(today);
  yesterday.setDate(yesterday.getDate() - 1);
  return localDateKey(yesterday) === previousDate ? previousStreak + 1 : 1;
}

function isDateKey(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  return localDateKey(parseLocalDate(value)) === value;
}

function parseLocalDate(value: string): Date {
  const [year, month, day] = value.split("-").map(Number);
  return new Date(year, month - 1, day);
}
