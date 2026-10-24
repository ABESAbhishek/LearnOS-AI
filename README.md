# LearnOS AI

LearnOS AI is a personalized learning prototype built around the loop **Assess → Learn → Practice → Analyze → Adapt**. The current demo uses a DSA profile while also allowing a syllabus upload to define a different course map.

## Product areas

- `/dashboard` — overview, current focus, progress, and milestones
- `/upload` — page-aware PDF/TXT extraction and syllabus analysis; up to three files, 10 MB combined
- `/assessment` — an eight-question diagnostic with bounded, provisional topic estimates
- `/knowledge-map` — topic mastery and learning gaps
- `/tutor` — targeted explanations, guided steps, and practice; a floating tutor is available across signed-in app routes
- `/plan` — an adaptive four-task study sequence
- `/note2learn` — turn one PDF/TXT note (up to 5 MB) into a summary, flashcards, and a short quiz
- `/quests` — daily goals derived from saved answers and completed quizzes
- `/progress` — evidence-backed estimates, assessment history, and activity totals
- `/achievements` — earned badges and explicit unlock criteria
- `/profile` — local avatar customization, interests, and learning goal
- `/feed` — a private timeline of this learner's saved activity
- `/friends`, `/messages`, `/rooms`, `/challenges` — honest setup states for features that require shared identity and storage

Each route is a dedicated experience. The routes share the LearnOS cream palette, typography, navigation, and motion system.

The dashboard's story strip is built from the learner's actual saved activity and opens an accessible story viewer. The companion card provides deterministic guidance from the current learning profile; it is not a live chat agent. There are no simulated friends, public posts, or shared rooms.

## Run locally

Use Node.js 20.9 or newer for Next.js. The built-in test command uses Node.js 22.6 or newer for TypeScript stripping.

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). Enter a display name on the local demo sign-in screen.

Useful commands:

```bash
npm run lint
npm run typecheck
npm test
npm run build -- --webpack
npm start
```

## Optional AI providers

The app uses server-side provider keys only. Copy `.env.local.example` to `.env.local` and add the keys you choose to configure. Never use `NEXT_PUBLIC_` for provider secrets. `AI_PROVIDER_ORDER` can change the provider order; the default is Gemini, Groq, then Cerebras. The upload analyzer extracts text first and sends bounded page chunks to the configured router. It reports the provider that returned validated output. If no provider is configured or the response is invalid, the upload page shows only locally detected headings and marks difficulty, dependencies, and exam weight as unassessed. Live floating chat requires a configured provider; it is disabled when none is available.

Syllabus analysis accepts at most three files with a 10 MB combined file limit and retains at most 240 pages and 240,000 extracted characters per PDF. Analysis sends no more than 48,000 characters of page-bounded source chunks to the provider. Note2Learn accepts one file up to 5 MB and sends at most 50,000 extracted characters. The original files are discarded after extraction; extracted source text is stored in this browser for document-grounded tutoring. For each tutor question, relevant chunks, the last eight chat messages, and up to six recent practice outcomes (topic, activity type, and correct/review result) are sent to the configured provider. Question IDs, answer choices, and timestamps are not included in that practice context. The tutor verifies returned citation excerpts against retrieved chunks and derives document names/pages from the stored source. PDF support requires selectable text; scanned PDFs are reported as unsupported because OCR is not configured.

## Demo data and persistence

Learning progress, course data, generated note kits, quiz answers, and rewards are stored in this browser under `learnos_learning_state` (schema version 1). Extracted document text and the selected source are saved separately under a browser-local document-library key; tutor conversation history is also local and scoped to the current demo display name. Remove saved sources from `/upload` and use **New conversation** in the tutor to clear its chat. **Reset learning data** clears only the learning-state key. No database or cross-device sync is configured. The local display-name sign-in is a navigation convenience, not authentication or access control; do not use real credentials or sensitive personal data in this prototype.

Avatar customization and learning interests are stored separately in this browser under `learnos_profile_preferences`. Daily quest progress is derived from dated learning evidence; a quest reward can only be claimed after its saved activity meets the displayed criteria. Plan items open the focused lesson, while completed lesson and answer history is recorded from learner activity.

Seeded DSA values are identified as sample data until a learner creates new course data or completes learning activities. Mastery estimates are provisional: they use submitted answers, are bounded per activity, and should not be read as a validated measure of ability. When AI is unavailable for a non-DSA course, the deterministic assessment fallback checks recall of the supplied course map rather than deep subject understanding.

## Prototype security limits

API routes enforce request-size limits, field validation, timeouts, output schema checks, same-origin checks when an `Origin` header is present, and a process-local request throttle. The throttle resets when the server restarts and uses forwarded IP headers that may be supplied by the hosting layer; these controls are best effort for a local prototype. There is no server-side identity, durable storage, or production-grade abuse protection.

Uploaded documents are treated as untrusted educational source material. The AI instructions tell providers not to follow embedded instructions, but model output remains untrusted and is validated before it is used. Do not upload confidential or regulated documents.

## Authentication and shared learning

Google OAuth, server-side user profiles, friendship requests, direct messages, shared study rooms, public social feeds, and friend challenges are **not connected** in this prototype. The repository has no configured Google OAuth credentials or database URL. The browser display-name sign-in is the only available profile entry point, and it must not be treated as a secure session.

The Friends, Messages, Study Rooms, and Friend Challenges routes explain this limitation instead of showing fabricated users or pretending that data syncs. The selected path for a real multi-user release is Supabase Auth, PostgreSQL with Row Level Security, and Supabase Realtime, plus server-side ownership checks for each social operation. No Supabase client, auth route, database schema, or realtime subscription is active yet. Adding project values alone will not enable sign-in; see the setup sequence in [docs/community-backend.md](docs/community-backend.md).

## Community backend status

This workspace still has no server-verifiable identity, shared database, or realtime transport, so rooms, public leaderboards, moderation, and multiplayer battles remain unavailable. The server-domain policies in `src/lib/community/` are tested but do not persist shared state or make those features operational. The selected single-backend target and exact setup blockers are documented in [docs/community-backend.md](docs/community-backend.md). Do not treat local XP or browser activity as a public ranking.
