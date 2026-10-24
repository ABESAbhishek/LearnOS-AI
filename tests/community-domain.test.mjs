import test from "node:test";
import assert from "node:assert/strict";
import {
  applyCommunityEvent,
  buildMostImprovedLeaderboard,
  buildPublicLeaderboard,
  leaderboardPeriodBounds,
  leaderboardPeriodKey,
} from "../src/lib/community/scoring.ts";
import {
  canEditRoomMessage,
  canRemoveRoomMember,
  canRemoveRoomMessage,
  getRoomPermissions,
  validateReportReason,
  validateRoomMessageInput,
} from "../src/lib/community/rooms.ts";
import {
  acceptBattleInvite,
  cancelBattle,
  createBattle,
  createBattleRematch,
  declineBattleInvite,
  expireBattle,
  getBattleQuestionForClient,
  getBattleResults,
  startBattle,
  submitBattleAnswer,
  validateBattleQuestionSet,
} from "../src/lib/community/battles.ts";

const now = new Date("2026-10-24T12:00:00.000Z");

function event(overrides = {}) {
  return {
    userId: "learner-a",
    eventId: "practice:attempt-1",
    sourceId: "attempt-1",
    kind: "practice_attempt",
    occurredAt: now.toISOString(),
    verified: true,
    ...overrides,
  };
}

function award(awards, overrides) {
  return applyCommunityEvent(awards, event(overrides), now);
}

function makeAward(userId, eventId, day, kind = "practice_attempt") {
  return applyCommunityEvent([], {
    userId,
    eventId,
    sourceId: eventId,
    kind,
    occurredAt: `${day}T12:00:00.000Z`,
    verified: true,
  }, new Date(`${day}T12:00:00.000Z`)).awards[0];
}

function questions() {
  return Array.from({ length: 5 }, (_, index) => ({
    id: `graphs-q-${index + 1}`,
    topic: "Graphs",
    subtopic: "Traversal",
    difficulty: "Foundational",
    prompt: `Question ${index + 1}?`,
    options: ["One", "Two", "Three", "Four"],
    correctOption: index % 4,
    explanation: `Explanation ${index + 1}.`,
  }));
}

test("community awards require server verification, stable IDs, and obey daily caps", () => {
  let awards = [];
  let result = award(awards, {});
  assert.equal(result.reason, "awarded");
  assert.equal(result.awards[0].points, 4);
  assert.equal(result.awards[0].reason, "Completed a validated practice attempt");
  assert.equal(result.awards[0].policyVersion, 1);
  awards = result.awards;

  result = award(awards, {});
  assert.equal(result.reason, "duplicate");
  assert.equal(result.awards.length, 1);
  assert.equal(award([], { verified: false }).reason, "invalid_event");
  assert.equal(award([], { points: 1_000_000 }).awards[0].points, 4);

  for (let index = 2; index <= 5; index += 1) {
    awards = award(awards, { eventId: `attempt-${index}`, sourceId: `attempt-${index}` }).awards;
  }
  result = award(awards, { eventId: "attempt-6", sourceId: "attempt-6" });
  assert.equal(result.reason, "daily_limit");
  assert.equal(result.awards.length, 5);
});

test("community scoring normalizes timestamps and rejects malformed or future events", () => {
  assert.equal(award([], { occurredAt: "not-a-date" }).reason, "invalid_event");
  assert.equal(award([], { occurredAt: "2026-10-25T00:00:00.000Z" }).reason, "invalid_event");
  assert.equal(award([], { eventId: "" }).reason, "invalid_event");
  const result = applyCommunityEvent([], event({ occurredAt: "2026-10-24T12:00:00-04:00" }), new Date("2026-10-24T17:00:00.000Z"));
  assert.equal(result.awards[0].occurredAt, "2026-10-24T16:00:00.000Z");
  assert.equal(result.awards[0].periodDay, "2026-10-24");
});

test("leaderboard windows use UTC ISO weeks and calendar months", () => {
  assert.equal(leaderboardPeriodKey(new Date("2026-10-25T23:30:00.000Z"), "week"), "2026-W43");
  assert.equal(leaderboardPeriodKey(new Date("2026-10-26T00:30:00.000Z"), "week"), "2026-W44");
  assert.equal(leaderboardPeriodKey(new Date("2026-10-31T23:59:00.000Z"), "month"), "2026-10");
  assert.equal(leaderboardPeriodKey(new Date("2026-11-01T00:01:00.000Z"), "month"), "2026-11");
  const bounds = leaderboardPeriodBounds("2026-W44", "week");
  assert.equal(bounds.start.toISOString(), "2026-10-26T00:00:00.000Z");
  assert.equal(bounds.end.toISOString(), "2026-11-02T00:00:00.000Z");
  assert.equal(leaderboardPeriodBounds("2026-W54", "week"), null);
});

test("public leaderboards use only opted-in profiles and omit identity fields", () => {
  const awards = [
    makeAward("public-a", "pa-1", "2026-10-20", "practice_attempt"),
    makeAward("public-a", "pa-2", "2026-10-21", "helpful_answer"),
    makeAward("private-b", "pb-1", "2026-10-20", "practice_attempt"),
    makeAward("friends-c", "fc-1", "2026-10-20", "practice_attempt"),
  ];
  const profiles = [
    { userId: "public-a", displayName: "Ari", visibility: "public", email: "hidden@example.com" },
    { userId: "private-b", displayName: "Bea", visibility: "private" },
    { userId: "friends-c", displayName: "Cai", visibility: "friends" },
  ];
  const result = buildPublicLeaderboard({
    awards,
    profiles,
    category: "overall",
    period: "week",
    periodKey: "2026-W43",
  });
  assert.deepEqual(result.rows, [{ rank: 1, displayName: "Ari", score: 10 }]);
  assert.equal("userId" in result.rows[0], false);
  assert.equal("email" in result.rows[0], false);
});

test("consistency counts active UTC days rather than message or event volume", () => {
  const awards = [
    makeAward("a", "a1", "2026-10-20", "practice_attempt"),
    makeAward("a", "a2", "2026-10-20", "helpful_answer"),
    makeAward("a", "a3", "2026-10-20", "battle_participation"),
    makeAward("a", "a4", "2026-10-21", "practice_attempt"),
    makeAward("b", "b1", "2026-10-20", "practice_attempt"),
    makeAward("b", "b2", "2026-10-22", "practice_attempt"),
  ];
  const result = buildPublicLeaderboard({
    awards,
    profiles: [
      { userId: "a", displayName: "A", visibility: "public" },
      { userId: "b", displayName: "B", visibility: "public" },
    ],
    category: "consistency",
    period: "week",
    periodKey: "2026-W43",
  });
  assert.deepEqual(result.rows.map(({ displayName, score }) => [displayName, score]), [["A", 2], ["B", 2]]);
});

test("most-improved requires comparable history and normalizes points per active day", () => {
  const awards = [];
  for (const day of ["2026-10-13", "2026-10-14", "2026-10-15"]) {
    awards.push(makeAward("a", `prev-${day}`, day, "practice_attempt"));
  }
  for (const day of ["2026-10-20", "2026-10-21", "2026-10-22"]) {
    awards.push(makeAward("a", `current-${day}`, day, "skill_demonstration"));
  }
  awards.push(makeAward("b", "too-little-history", "2026-10-21", "practice_attempt"));
  const result = buildMostImprovedLeaderboard({
    awards,
    profiles: [
      { userId: "a", displayName: "Ari", visibility: "public" },
      { userId: "b", displayName: "Bea", visibility: "public" },
    ],
    period: "week",
    currentPeriodKey: "2026-W43",
  });
  assert.equal(result.status, "ready");
  assert.equal(result.previousPeriodKey, "2026-W42");
  assert.equal(result.rows.length, 1);
  assert.equal(result.rows[0].displayName, "Ari");
  assert.equal(result.rows[0].changePerActiveDay, 4);
});

test("private rooms require active membership and public rooms still require a signed-in identity", () => {
  const memberships = [{ userId: "owner", role: "owner", status: "active" }];
  assert.equal(getRoomPermissions({ visibility: "private", userId: "guest", memberships }).canRead, false);
  assert.equal(getRoomPermissions({ visibility: "private", userId: "owner", memberships }).canRead, true);
  assert.equal(getRoomPermissions({ visibility: "public", userId: null, memberships: [] }).canRead, false);
  assert.equal(getRoomPermissions({ visibility: "public", userId: "guest", memberships: [] }).canJoin, true);
  assert.equal(getRoomPermissions({ visibility: "public", userId: "guest", memberships: [] }).canPost, false);
});

test("removed members cannot rediscover, read, or rejoin public rooms", () => {
  const removed = [{ userId: "former-member", role: "member", status: "removed" }];
  const permissions = getRoomPermissions({ visibility: "public", userId: "former-member", memberships: removed });
  assert.equal(permissions.canDiscover, false);
  assert.equal(permissions.canRead, false);
  assert.equal(permissions.canJoin, false);
});

test("muted members cannot post and room moderation roles are hierarchical", () => {
  const now = new Date("2026-10-24T12:00:00.000Z");
  const muted = [{ userId: "member", role: "member", status: "active", mutedUntil: "2026-10-24T13:00:00.000Z" }];
  assert.equal(getRoomPermissions({ visibility: "public", userId: "member", memberships: muted, now }).canPost, false);
  assert.equal(getRoomPermissions({ visibility: "public", userId: "member", memberships: muted, now: new Date("2026-10-24T14:00:00.000Z") }).canPost, true);
  const malformedMute = [{ userId: "member", role: "member", status: "active", mutedUntil: "not-a-date" }];
  assert.equal(getRoomPermissions({ visibility: "public", userId: "member", memberships: malformedMute, now }).canPost, false);

  const owner = { userId: "owner", role: "owner", status: "active" };
  const moderator = { userId: "mod", role: "moderator", status: "active" };
  const member = { userId: "member", role: "member", status: "active" };
  assert.equal(canRemoveRoomMember(owner, moderator), true);
  assert.equal(canRemoveRoomMember(moderator, member), true);
  assert.equal(canRemoveRoomMember(moderator, owner), false);
  assert.equal(canRemoveRoomMember(member, moderator), false);
  assert.equal(canRemoveRoomMember(owner, owner), false);
});

test("message and report validators reject unsafe values and constrain links", () => {
  const valid = { clientMessageId: "message-123", body: "Use BFS for this graph.", resourceUrl: "https://example.edu/graphs" };
  assert.equal(validateRoomMessageInput(valid), true);
  assert.equal(validateRoomMessageInput({ ...valid, resourceUrl: "javascript:alert(1)" }), false);
  assert.equal(validateRoomMessageInput({ ...valid, resourceUrl: "https://user:pass@example.edu/" }), false);
  assert.equal(validateRoomMessageInput({ ...valid, body: "\u0000" }), false);
  assert.equal(validateRoomMessageInput({ ...valid, body: "x".repeat(4_001) }), false);
  assert.equal(validateRoomMessageInput({ ...valid, clientMessageId: "x" }), false);
  assert.equal(validateReportReason("harassment"), true);
  assert.equal(validateReportReason("share-private-report"), false);
});

test("message edits are author-only; moderators can remove, but not edit, member messages", () => {
  const memberships = [
    { userId: "owner", role: "owner", status: "active" },
    { userId: "member", role: "member", status: "active" },
  ];
  const input = { actorId: "member", authorId: "member", memberships };
  assert.equal(canEditRoomMessage(input), true);
  assert.equal(canEditRoomMessage({ ...input, actorId: "owner" }), false);
  assert.equal(canRemoveRoomMessage({ ...input, actorId: "owner" }), true);
  assert.equal(canEditRoomMessage({ ...input, deletedAt: now.toISOString() }), false);
});

test("battle invitations, readiness, answer keys, and cancellation obey the state machine", () => {
  const battle = createBattle({ id: "battle-1", creatorId: "a", opponentId: "b", topic: "Graphs", createdAt: now.toISOString() });
  assert.ok(battle);
  assert.equal(battle.state, "invited");
  assert.equal(acceptBattleInvite(battle, "a", now.toISOString()), null);
  assert.equal(acceptBattleInvite(battle, "b", new Date(now.getTime() - 1).toISOString()), null);
  assert.equal(startBattle(battle, "a", questions(), now.toISOString()), null);
  const accepted = acceptBattleInvite(battle, "b", now.toISOString());
  assert.equal(accepted.state, "ready");
  assert.equal(startBattle(accepted, "a", questions(), new Date(now.getTime() - 1).toISOString()), null);
  const started = startBattle(accepted, "a", questions(), now.toISOString());
  assert.equal(started.state, "in_progress");
  const publicQuestion = getBattleQuestionForClient(started.questions[0]);
  assert.equal("correctOption" in publicQuestion, false);
  assert.equal("explanation" in publicQuestion, false);
  assert.equal(getBattleResults(started, "a"), null);
  assert.equal(cancelBattle(started, "a"), null);
  assert.equal(declineBattleInvite(battle, "b").state, "cancelled");
  assert.equal(createBattle({ id: "same-user", creatorId: "a", opponentId: "a", topic: "Graphs", createdAt: now.toISOString() }), null);
});

test("battles use equivalent validated question sets and reject duplicate or invalid answers", () => {
  const questionsSet = questions();
  assert.equal(validateBattleQuestionSet(questionsSet, "Graphs"), true);
  assert.equal(validateBattleQuestionSet(questionsSet.slice(0, 4), "Graphs"), false);
  assert.equal(validateBattleQuestionSet([...questionsSet, questionsSet[0]], "Graphs"), false);
  assert.equal(validateBattleQuestionSet(questionsSet.map((question) => ({ ...question, topic: "Trees" })), "Graphs"), false);

  const battle = createBattle({ id: "battle-2", creatorId: "a", opponentId: "b", topic: "Graphs", createdAt: now.toISOString() });
  const ready = acceptBattleInvite(battle, "b", now.toISOString());
  const started = startBattle(ready, "a", questionsSet, now.toISOString());
  assert.equal(submitBattleAnswer(started, "outsider", questionsSet[0].id, 0, now.toISOString()), null);
  assert.equal(submitBattleAnswer(started, "a", questionsSet[0].id, 4, now.toISOString()), null);
  const first = submitBattleAnswer(started, "a", questionsSet[0].id, questionsSet[0].correctOption, now.toISOString());
  assert.equal(first.state, "in_progress");
  assert.equal(submitBattleAnswer(first, "a", questionsSet[0].id, 0, now.toISOString()), null);
});

test("battle scores are correctness-based, results are participant-only, and rematches create fresh invites", () => {
  const initial = createBattle({ id: "battle-3", creatorId: "a", opponentId: "b", topic: "Graphs", createdAt: now.toISOString() });
  const ready = acceptBattleInvite(initial, "b", now.toISOString());
  let active = startBattle(ready, "a", questions(), now.toISOString());
  for (const question of active.questions) {
    active = submitBattleAnswer(active, "a", question.id, question.correctOption, now.toISOString());
    active = submitBattleAnswer(active, "b", question.id, (question.correctOption + 1) % 4, now.toISOString());
  }
  assert.equal(active.state, "completed");
  assert.equal(getBattleResults(active, "outsider"), null);
  const result = getBattleResults(active, "a");
  assert.equal(result.scores.find((score) => score.userId === "a").correctCount, 5);
  assert.equal(result.scores.find((score) => score.userId === "b").correctCount, 0);
  assert.equal(result.review.length, 5);
  assert.equal(result.review[0].answers.length, 2);
  const malformedCompleted = { ...active, answers: { a: active.answers.a, b: {} } };
  assert.equal(getBattleResults(malformedCompleted, "a"), null);
  assert.equal(createBattleRematch(active, "battle-4", now.toISOString()).state, "invited");
  assert.equal(createBattleRematch(active, "battle-4", "bad-date"), null);
});

test("battle expiration is server-time based and never changes a completed result", () => {
  const battle = createBattle({ id: "battle-expire", creatorId: "a", opponentId: "b", topic: "Graphs", createdAt: now.toISOString() });
  assert.equal(expireBattle(battle, new Date(now.getTime() + 1_000)), null);
  assert.equal(expireBattle(battle, new Date(now.getTime() + 24 * 60 * 60_000)).state, "expired");
  const declined = declineBattleInvite(battle, "b");
  assert.equal(expireBattle(declined, new Date(now.getTime() + 48 * 60 * 60_000)), null);
});
