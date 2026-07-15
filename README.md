# ROAI Institute — Future of Work Action Workshop

Customized variant of the ROAI Institute workshop facilitation tool, for a workshop about **AI and the future of work**. Same backend/frontend architecture as the base tool (Express + Vite server, Firestore for real-time state, Claude for content generation, admin view + unique per-participant links), with a new import-based pre-work flow, manually-formed groups, per-group challenge generation, and a facilitator role.

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
- `VITE_FIREBASE_*` — the six values from Firebase Console → Project Settings → General → Your apps → Web app

`.env` is git-ignored — no secret ever gets committed.

### 3. Firebase
Reads its Firebase web config from the `VITE_FIREBASE_*` env vars, and writes to its own prefixed Firestore collections (`fow_*`) so it can safely coexist with other ROAI Institute tools in the same project. Publish `firestore.rules`.

### 4. Run
```bash
npm run dev
```

## Workshop flow

### Pre-work (outside the tool)
The pre-work survey is run externally (e.g. Google Forms, Typeform). No survey step happens inside the tool.

### Setup (admin, in `/admin`)
1. **Import participants + survey answers** — upload a CSV or Excel file with one row per participant (name, email, optional role, and the 8 survey answers). A downloadable template is provided. Participants can also be added one by one, with a Participant/Facilitator toggle.
2. **Mark facilitators** — a fixed property of the person (not the group). Facilitators are the ones who will write their group's answers; everyone still writes their own 30-day commitment individually.
3. **Create groups manually** — pick up to 4 participants per group. Groups exist before any challenge does.
4. **Generate challenge options per group** — for each group, Claude synthesizes 2–5 candidate challenges (default 3) from THAT group's members' survey answers, pitched at C-level/boardroom altitude. Both the admin and the group's facilitator can select which option the group will work on, and both can edit the title/description afterward.

### In the room
5. **Initial answer** — only the group's facilitator can write it (on their own link); other members see it read-only, updating live.
6. **C-level board challenge** — the admin requests a simulated board challenge for the group's initial answer: Claude plays CEO, CFO, CIO, CHRO, Legal, and a Frontline Employee, each raising one objection, grounded in the ROAI F1–F6 framework.
7. **Revised answer** — after seeing the board's pushback, the facilitator writes a revised answer; other members again see it read-only.
8. **Plenary presentation** — admin opens `/present/:workshopId` on the room screen and clicks through groups; each group's challenge, initial answer, board challenge, and revised answer appear live.
9. **30-day commitment** — admin opens this step; every participant (facilitators included) writes their own personal action on their own link. This one is never written on someone's behalf.

### Wrap-up
Admin can generate a final executive report in one click.

## Structure
```
server.ts                          — Backend Express + Claude API endpoints
src/App.tsx                        — Path-based router (/admin, /w/:token, /present/:id)
src/components/AdminApp.tsx         — Facilitator dashboard: import, groups, challenges, presentation, commitments
src/components/ParticipantApp.tsx   — Challenge picker (facilitator), group workspace, individual commitment
src/components/PresentationView.tsx — Public plenary/big-screen view
src/firebase.ts                     — Firestore setup (fow_* collections)
src/types.ts                        — Shared types + import column definitions
src/csvImport.ts                    — CSV/XLSX parsing for the participants+survey import
src/ui.tsx                          — Shared UI primitives (Btn, Field, Tag, ROAILogo...) matching ROAI brand
firestore.rules                     — Firestore security rules
firebase-blueprint.json             — Data model reference
```

## Deploy

### Deploying on Google Cloud Run via GitHub
1. Push this project to a GitHub repo (`.env` and any Firebase config file are git-ignored).
2. Cloud Run → Create Service → "Continuously deploy from a repository" → connect the repo → build type **Dockerfile**.
3. In the service's **Variables & Secrets**, set: `ANTHROPIC_API_KEY`, `ADMIN_SECRET`, `VITE_FIREBASE_API_KEY`, `VITE_FIREBASE_AUTH_DOMAIN`, `VITE_FIREBASE_PROJECT_ID`, `VITE_FIREBASE_STORAGE_BUCKET`, `VITE_FIREBASE_MESSAGING_SENDER_ID`, `VITE_FIREBASE_APP_ID`.
4. Every push to the connected branch triggers a new build & deploy automatically.

Note: the frontend is built at **container startup** (see `Dockerfile`), so the Cloud Run env vars — only available once the container starts — get baked into the JS bundle. Adds a few seconds to cold start.
