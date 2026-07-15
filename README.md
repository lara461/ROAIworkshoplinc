# ROAI Institute — Future of Work Action Workshop

Customized variant of the ROAI Institute workshop facilitation tool, for a workshop about **AI and the future of work**. Same backend/frontend architecture as the base "Executive AI Workshop Facilitator" tool (Express + Vite server, Firestore for real-time state, Claude for content generation, admin view + unique per-participant links), with a new pre-work survey and a new 5-step in-room flow.

## Setup

### 1. Install dependencies
```bash
npm install
```

### 2. Environment variables
```bash
cp .env.example .env
```
Then fill in:
- `ANTHROPIC_API_KEY` — from the [Anthropic Console](https://console.anthropic.com)
- `ADMIN_SECRET` — a password of your choice for the facilitator
- `VITE_FIREBASE_*` — the six values from Firebase Console → Project Settings → General → Your apps → Web app (see step 3)

`.env` is git-ignored — no secret ever gets committed, so no GitHub secret-scanning alert on push.

### 3. Firebase
No config file to edit anymore. This tool reads its Firebase web config purely from the `VITE_FIREBASE_*` env vars above at build time, and writes to its **own, prefixed Firestore collections** (`fow_*`) so it can safely coexist with other ROAI Institute tools in the same project. Use the same Firebase project as your other workshops, or create a fresh one — either way, just copy its six web-app config values into `.env` (locally) or into the Cloud Run service's env vars (in production).

Publish the rules in `firestore.rules` (same permissive rules as the base tool — tighten before using with sensitive data if needed).

### 4. Run
```bash
npm run dev
```
App runs on `http://localhost:3001`.

## Workshop flow

### Pre-work (before the session)
1. Admin creates the workshop at `/admin` and adds participants (name + email). Each participant gets a unique link (`/w/:token`).
2. Participants open their link and complete the 8-question pre-work survey (org size, current AI relationship, biggest concern, open reflection on the future of work, timeline to act, vision for AI's role, ownership preference, employee-freedom stance).

### In the room
1. **Define the challenges** — once responses are in, the admin clicks "Generate challenges." Claude synthesizes the survey answers into a configurable number (2–8, default 5) of concrete challenges, then the admin publishes them.
2. **Form groups** — participants pick the challenge that interests them most, live. When the admin locks group formation, the tool automatically splits any challenge with more than 4 sign-ups into evenly-sized sub-groups (e.g. 5 → 3+2, 9 → 3+3+3), so no group ever exceeds 4 people.
3. **C-level challenge** — for each group, the admin requests a simulated board challenge: Claude plays CEO, CFO, CIO, CHRO, Legal, and a Frontline Employee, each raising one sharp objection to the group's answer, grounded in the same ROAI F1–F6 framework used by the base tool. (If you'd rather have real C-level executives in the room challenge each group live instead of the simulation, that's a small follow-up change — happy to add a manual-entry screen for that instead.)
4. **Plenary presentation** — the admin opens `/present/:workshopId` on the room screen and clicks through groups one at a time; each group's challenge, answer, and board challenge appear live.
5. **30-day commitment** — the admin opens the commitment step; every participant, on their own link, writes the one action they personally commit to in the next 30 days.

### Wrap-up
The admin can generate a final executive report (summary, key themes, group highlights, patterns across commitments, next steps) with one click.

## Structure
```
server.ts                          — Backend Express + Claude API endpoints
src/App.tsx                        — Path-based router (/admin, /w/:token, /present/:id)
src/components/AdminApp.tsx         — Facilitator dashboard, drives all 5 steps
src/components/ParticipantApp.tsx   — Survey, group selection, group workspace, commitment
src/components/PresentationView.tsx — Public plenary/big-screen view
src/firebase.ts                     — Firestore setup (fow_* collections)
src/types.ts                        — Shared types + the 8 survey questions
src/groupSplit.ts                   — Max-4-per-group auto-balancing logic
firestore.rules                     — Firestore security rules
firebase-blueprint.json             — Data model reference
```

## Security
- The Anthropic API key lives server-side only, never exposed to the browser.
- The admin secret is verified server-side on every sensitive request and kept only in React memory (never localStorage).

## Deploy
```bash
npm run build
NODE_ENV=production npm run dev
```
Or build the included `Dockerfile`.

### Deploying on Google Cloud Run via GitHub
1. Push this project to a GitHub repo (make sure `.env` and `firebase-applet-config.json` are never committed — they're in `.gitignore`).
2. Cloud Run → Create Service → "Continuously deploy from a repository" → connect the repo → build type **Dockerfile**.
3. In the service's **Variables & Secrets**, set all of: `ANTHROPIC_API_KEY`, `ADMIN_SECRET`, `VITE_FIREBASE_API_KEY`, `VITE_FIREBASE_AUTH_DOMAIN`, `VITE_FIREBASE_PROJECT_ID`, `VITE_FIREBASE_STORAGE_BUCKET`, `VITE_FIREBASE_MESSAGING_SENDER_ID`, `VITE_FIREBASE_APP_ID`. Use Secret Manager for `ANTHROPIC_API_KEY` and `ADMIN_SECRET`.
4. Every push to the connected branch triggers a new build & deploy automatically.

Note: the frontend is built at **container startup** (see `Dockerfile`), not at image-build time, specifically so these env vars — only available once Cloud Run starts the container — get baked into the JS bundle. This adds a few seconds to cold start, which is fine at workshop scale.
