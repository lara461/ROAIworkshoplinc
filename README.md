# ROAI Institute — Future of Work Action Workshop

Customized variant of the ROAI Institute workshop facilitation tool, for a workshop about **AI and the future of work**. Same backend/frontend architecture as the base tool (Express + Vite server, Firestore for real-time state, Claude for content generation), organized into three phases — **Pre-workshop**, **Workshop**, **Report** — matching the structure of previous ROAI workshop tools.

## Setup

### 1. Install dependencies
```bash
npm install
```

### 2. Environment variables
```bash
cp .env.example .env
```
- `ANTHROPIC_API_KEY` — from the [Anthropic Console](https://console.anthropic.com)
- `ADMIN_SECRET` — a password of your choice for the facilitator
- `VITE_FIREBASE_*` — the six values from Firebase Console → Project Settings → General → Your apps → Web app

`.env` is git-ignored — no secret ever gets committed.

### 3. Firebase
Reads its Firebase web config at **runtime** from env vars (served to the browser via `/api/firebase-config`, so the frontend builds once at image-build time). Writes to its own prefixed Firestore collections (`fow_*`). Publish `firestore.rules`.

### 4. Run
```bash
npm run dev
```

## Workshop flow

The admin dashboard (`/admin`) is organized into three tabs, matching previous ROAI workshops:

### Pre-workshop tab
1. **Import participants + survey answers** — upload the export from your external survey tool (currently 3 questions: current AI relationship, future-of-work vision, opportunities/challenges with AI and the workforce). Handles exports with extra metadata rows automatically (e.g. FormAssembly's preamble lines). Add an "Email" column yourself if your export doesn't include one — email is otherwise optional. A downloadable template is available. Participants can also be added one by one.
2. **See each participant's survey answers** — click "survey" next to a participant's name in the list to expand their actual answers inline.
3. **Mark facilitators** — a fixed property of the person. Facilitators are the ones who write their group's answers.
4. **Create groups manually** — pick up to 4 participants per group, **max 1 facilitator per group** (enforced when building the group).
5. **Generate challenges for all groups at once** — one button generates challenge options (default 3, C-level/boardroom framing) for every group that doesn't have any yet, each set drawn from that specific group's members' survey answers. Options are editable (title + description) after generation, and either the admin or the group's facilitator can select which one the group works on.

### Workshop tab
6. **Question 1 (initial answer)** — written by the group's facilitator on their own device; other members see it read-only, live. The facilitator has an explicit **Submit** button (separate from auto-saving as they type) so the admin can see at a glance who's done.
7. **C-level board challenge** — admin requests it once the initial answer is submitted: Claude plays CEO, CFO, CIO, CHRO, Legal, and a Frontline Employee, grounded in the ROAI F1–F6 framework.
8. **Revised answer** — after seeing the board's pushback, the facilitator writes and submits a revised answer (own Submit button).
9. **Plenary presentation** — admin opens `/present/:workshopId` on the room screen and clicks through groups live.
10. **30-day commitment** — admin opens this step; every **non-facilitator** participant writes and submits their own personal action on their own profile. Facilitators don't see this question at all — it's individual, not a group answer, and facilitators already did their part on the group work.

### Report tab
11. **One report per group** — admin generates a report for each group individually: executive summary, key strategic insight, how the group's thinking evolved from the initial to the revised answer after the board's challenge, and recommended next steps. Regeneratable any time.
12. **Mark workshop as closed** when done.

## Participant access
There's **one shared link per workshop** (`/w/:workshopId`) — no per-participant tokens. When someone opens it, they pick their name from a list and confirm with their email (matched against the imported record, or saved on first entry if none was on file). Their session is remembered on that device (localStorage) so refreshing doesn't log them out; a "Not you?" link lets someone switch profiles on a shared device.

## Structure
```
server.ts                          — Backend Express + Claude API endpoints
src/App.tsx                        — Path-based router (/admin, /w/:workshopId, /present/:id)
src/components/AdminApp.tsx         — Facilitator dashboard: Pre-workshop / Workshop / Report tabs
src/components/ParticipantApp.tsx   — Name+email login, challenge picker, group workspace, commitment
src/components/PresentationView.tsx — Public plenary/big-screen view
src/firebase.ts                     — Lazy Firestore init (fow_* collections), config fetched at runtime
src/types.ts                        — Shared types + import column definitions
src/csvImport.ts                    — CSV/XLSX parsing (tolerant of export preamble rows)
src/ui.tsx                          — Shared UI primitives matching ROAI brand
firestore.rules                     — Firestore security rules
firebase-blueprint.json             — Data model reference
```

## Deploy

### Deploying on Google Cloud Run via GitHub
1. Push this project to a GitHub repo (`.env` is git-ignored).
2. Cloud Run → Create Service → "Continuously deploy from a repository" → connect the repo → build type **Dockerfile**.
3. In **Variables & Secrets**, set: `ANTHROPIC_API_KEY`, `ADMIN_SECRET`, `VITE_FIREBASE_API_KEY`, `VITE_FIREBASE_AUTH_DOMAIN`, `VITE_FIREBASE_PROJECT_ID`, `VITE_FIREBASE_STORAGE_BUCKET`, `VITE_FIREBASE_MESSAGING_SENDER_ID`, `VITE_FIREBASE_APP_ID`.
4. Every push to the connected branch triggers a new build & deploy.

The frontend builds **once, at image-build time** — Firebase config is fetched at runtime via `/api/firebase-config`, so cold starts stay fast.
