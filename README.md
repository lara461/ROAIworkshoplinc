# ROAI Institute — Future of Work Action Workshop

Customized variant of the ROAI Institute workshop facilitation tool, for a workshop about **AI and the future of work**. Same backend/frontend architecture as the base tool (Express + Vite server, Firestore for real-time state, Claude for content generation), organized into three admin tabs — **Pre-workshop**, **Workshop**, **Presentation**.

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
- `ADMIN_SECRET` — a password of your choice for the facilitator dashboard
- `VITE_FIREBASE_*` — the six values from Firebase Console → Project Settings → General → Your apps → Web app

`.env` is git-ignored.

### 3. Firebase
Reads its Firebase web config at runtime from env vars (served via `/api/firebase-config`, so the frontend builds once at image-build time). Writes to its own prefixed Firestore collections (`fow_*`). Publish `firestore.rules`.

### 4. Run
```bash
npm run dev
```

## Workshop flow

### Pre-workshop tab
1. **Import participants + survey answers** — upload the export from your external survey tool. Email is optional; add an "Email" column yourself if your export doesn't include one. A downloadable template is available.
2. **See each participant's survey answers** inline (expand "survey" next to their name).
3. **Mark facilitators** — a fixed property of the person.
4. **Create groups manually** — max 4 participants, **max 1 facilitator per group**.
5. **Generate challenges for all groups at once** — one button, C-level/boardroom framing, editable after generation. Either the admin or the group's facilitator can select which option the group works on.
6. **Launch workshop** — once at least one group has a challenge selected. This starts every group's first timed activity and switches you to the Workshop tab. From here on, each group runs itself — you generally won't need to intervene until the Presentation tab.

### Workshop tab — 3 timed group activities (15 min each), driven by the facilitator
Each group moves through this sequence on its own, with a visible 15-minute countdown per step (the countdown is informational — the facilitator advances manually with a "Submit & continue" button whenever they're ready, not forced by the clock):

1. **Question 1** — facilitator writes and submits the group's initial answer; other members see it read-only, live.
2. **C-level board challenge + revised answer** — as soon as the group enters this step, the board challenge is generated automatically (no admin action needed): 4 simulated committee members raise objections, grounded in the ROAI F1–F6 framework:
   - **Board Committee Member** (strategy, growth, competitive positioning)
   - **Finance Committee Member** (cost, ROI, budget discipline)
   - **Technology Committee Member** (feasibility, data readiness, technical risk)
   - **Talent Committee Member** (workforce/frontline impact AND HR/people-strategy implications)

   The facilitator then writes and submits a revised answer in response.
3. **30 / 60 / 90-day actions** — immediately after the revised answer, still a group activity written by the facilitator: three fields — what the organization will do in the next 30 days (immediate moves), 60 days (needs some planning/buy-in), and 90 days (structural/strategic change). Submitting marks the group as done.

The admin's Workshop tab is a live read-only view of every group's progress, plus a manual "regenerate board challenge" fallback button in case the automatic one needs a redo.

### Presentation tab
Open `/present/:workshopId` on the room screen, click through groups to bring each one up (challenge, initial answer, board challenge, revised answer, and the 30/60/90 actions). "Mark workshop as closed" when done.

## Participant access
**One shared link per workshop** (`/w/:workshopId`) for everyone — participants and facilitators alike. On landing, pick your name from a list and confirm with your email (matched against the imported record, or saved on first entry if none was on file). The session is remembered on that device; a **Log out** button lets someone switch profiles on a shared device.

## Structure
```
server.ts                          — Backend Express + Claude API endpoints
src/App.tsx                        — Path-based router (/admin, /w/:workshopId, /present/:id)
src/components/AdminApp.tsx         — Pre-workshop / Workshop / Presentation tabs
src/components/ParticipantApp.tsx   — Login, challenge picker, timed 3-activity group stepper
src/components/PresentationView.tsx — Public plenary/big-screen view
src/firebase.ts                     — Lazy Firestore init (fow_* collections)
src/types.ts                        — Shared types, step labels, timer duration
src/csvImport.ts                    — CSV/XLSX parsing (tolerant of export preamble rows)
src/ui.tsx                          — Shared UI primitives matching ROAI brand
firestore.rules                     — Firestore security rules
firebase-blueprint.json             — Data model reference
```

## Deploy

### Deploying on Google Cloud Run via GitHub
1. Push to a GitHub repo (`.env` is git-ignored).
2. Cloud Run → Create Service → "Continuously deploy from a repository" → build type **Dockerfile**.
3. In **Variables & Secrets**, set: `ANTHROPIC_API_KEY`, `ADMIN_SECRET`, `VITE_FIREBASE_API_KEY`, `VITE_FIREBASE_AUTH_DOMAIN`, `VITE_FIREBASE_PROJECT_ID`, `VITE_FIREBASE_STORAGE_BUCKET`, `VITE_FIREBASE_MESSAGING_SENDER_ID`, `VITE_FIREBASE_APP_ID`.
4. Every push to the connected branch triggers a new build & deploy.

The frontend builds once, at image-build time — Firebase config is fetched at runtime, so cold starts stay fast.

## Security note
`/api/generate-board-challenge` intentionally does **not** require the admin secret — it's called directly by whichever facilitator's device enters that step, so groups can run their 3 activities without the admin manually stepping in for each one. The Anthropic API key itself stays server-side either way. If the workshop link were ever exposed beyond intended participants, this endpoint could be called more than intended — an acceptable trade-off for an internal live-workshop tool, but worth knowing.
