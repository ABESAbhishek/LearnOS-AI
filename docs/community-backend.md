# Community backend readiness

## Current implementation state

The current app has a browser display-name session and browser-local course, profile, document, and activity storage. It has no server-verifiable learner identity, shared database, migration runner, or realtime transport. `/friends`, `/messages`, `/rooms`, and `/challenges` therefore remain explicit unavailable states. Do not replace them with local records presented as shared activity.

The new `src/lib/community` modules contain pure domain rules for verified awards, public leaderboard projections, room permissions, message validation, and battle transitions. They are testable policy code only. They do not persist data, authenticate callers, deliver realtime events, or make these routes operational. Any future API must derive the user ID from a verified server session and read/write authoritative events through the shared backend.

The existing global tutor and document-grounded tutor continue to use the existing server-side AI router. Gemini and Groq credentials are configured in the current local environment; their secret values are not read or logged here. No community discussion or battle data is sent to an AI provider because those records do not exist.

## Selected target architecture

Use one Supabase project for Supabase Auth, PostgreSQL with Row Level Security, and Supabase Realtime. This keeps shared identity, room membership, messages, battle state, and the learning-event ledger in one authorization boundary. Supabase's Next.js SSR integration uses cookie sessions; database policies should use `auth.uid()` and every exposed table must have explicit grants and RLS policies. See the official [Next.js SSR setup](https://supabase.com/docs/guides/auth/server-side/creating-a-client) and [RLS guidance](https://supabase.com/docs/guides/database/postgres/row-level-security).

The client must never receive a secret/service-role key. Prefer user-scoped server clients and RLS. If a future administrative job requires a secret key, keep it server-only and limit it to that job.

## Required setup before shared features can be connected

1. Create a Supabase project and configure the intended sign-in method. Configure production email delivery or OAuth redirect URLs before enabling real accounts.
2. Add `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` to local and deployment environments. These values are currently absent. Adding them alone will not enable community routes; the app does not yet instantiate Supabase clients.
3. Implement a reviewed, repeatable migration for profiles, rooms, memberships, messages/replies, pins, reports/moderation audit, battle sessions/participants/questions/submissions, and the event ledger. Enable RLS and least-privilege grants on every exposed table. Store answer keys so participants cannot read them before the result stage.
4. Connect verified auth sessions to server routes and the existing local learning profile through an explicit, idempotent user-approved import. Keep current local progress intact until that import path is tested; never use display names or client-supplied user IDs as identity.
5. Add private room message subscriptions with membership authorization, bounded history queries, and server-side message writes. Test authorization and RLS against a real Supabase project before enabling room UI.
6. Route all score creation through a server-only verified-event writer with unique `(user_id, event_id)` constraints. Public rankings must include only profiles opted into public visibility. Friends-only and room rankings remain unsupported until their authoritative membership data exists.
7. Generate battle questions with the existing AI router or a verified existing bank, validate them before start, and keep answer keys server-only. Persist submissions and results transactionally; emit learning evidence and awards once after the battle completes.

## Scoring policy in code

`src/lib/community/scoring.ts` centralizes a versioned policy and idempotent ledger projection:

| Verified event | Points | Per-user UTC-day cap |
| --- | ---: | ---: |
| Validated practice attempt | 4 | 5 |
| Skill demonstration | 8 | 2 |
| Moderator-marked helpful answer | 6 | 3 |
| Completed battle participation | 6 | 2 |

Only the four event classes above are defined. Merely opening a page, sending a message, or calling an AI route has no award. Battle participation uses the same fixed award regardless of winner or response speed. The module requires `verified: true`, a stable event ID, a source ID, a valid timestamp, and a configured daily cap; these checks are not a substitute for authenticating and verifying the event at the server/database boundary.

Weekly periods use UTC ISO weeks and monthly periods use UTC calendar months. Public leaderboards return only display names for profiles marked `public`; private and friends-only profiles are excluded. Consistency counts distinct active days. Most-improved compares points per active day over adjacent equal-length periods and requires at least three active days in each period. These projections do not yet have a shared ledger or public UI.

## Verification boundary

Unit tests cover the domain rules and state transitions without credentials. They do not prove Supabase RLS, account creation, shared persistence, realtime delivery, moderation workflows, or multiplayer results. Those require project configuration and multi-account browser verification before the unavailable routes can be enabled.
