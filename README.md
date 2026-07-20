# ROAI Institute — AI-Native Workshop Tool

Customized variant of the ROAI Institute workshop facilitation tool, for a workshop about **AI and the future of work**. Same backend/frontend architecture as the base tool (Express + Vite server, Firestore for real-time state, Claude for content generation), organized into five admin tabs — **Knowledge Base**, **Group & Challenge**, **Workshop**, **Presentation**, **Report**.

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

### Knowledge Base tab (do this first)
Upload or paste the material this workshop is actually about — briefs, prior reports, slide notes, anything specific to it (`.pdf`, `.txt`, `.md` files, or just paste text — PDF text is extracted right in the browser, no server round-trip). This is optional but recommended: both the generated challenges and the C-level board's feedback are grounded in it instead of generic AI-strategy content. No knowledge base uploaded means challenges are grounded in survey answers only, and the board falls back to general executive judgment. Note: scanned/image-only PDFs won't yield extractable text — paste the content manually in that case.

### Group & Challenge tab
1. **Import participants + survey answers** — upload the export from your external survey tool. Email is optional; add an "Email" column yourself if your export doesn't include one. A downloadable template is available.
2. **See each participant's survey answers** inline (expand "survey" next to their name).
3. **Mark facilitators** — a fixed property of the person.
4. **Create groups manually** — max 7 participants (facilitator included), **max 1 facilitator per group**. Groups can be edited after creation — add or remove members any time before launch.
5. **Generate challenges for all groups at once** — one button, grounded in each group's survey answers plus the Knowledge Base (if any), C-level/boardroom framing, editable after generation. Picking which option a group works on is the **facilitator's call, on their own link** — the admin can edit wording but doesn't select for them.
6. **Launch workshop** — a button sitting right on the Participants / Groups / Challenges tab row (not up in the header, next to utility actions like Edit/copy-link — it's the primary next step for this workflow, so it lives with it). Enabled once at least one group has challenge *options* generated (picking one is the facilitator's job, and it's the first thing they do once the workshop is live — not a precondition for launching). This unlocks every group's first activity (starting with picking their challenge) and switches you to the Workshop tab. From here on, each group runs itself — you generally won't need to intervene until the Presentation tab.

### Workshop tab — 3 group activities, driven by the facilitator
The facilitator's own experience (at `/w/:workshopId`, after logging in with name + email) mirrors the admin's — a sidebar on desktop, a bottom tab bar on mobile — with three sections:

- **My group** — the group's members and the survey answers they gave beforehand, as background before diving in.
- **Workshop** — the actual activity, navigated with step tabs (Question 1 / Board & revised answer / 30/60/90 actions). Steps not yet reached are locked, but once reached the facilitator can tab back to review earlier ones — nothing is hidden once it's been done.
- **Report** — appears once the admin has generated it (see below); the facilitator can review, edit, and submit it for approval.

Each group moves through the Workshop section's 3 activities on its own, at its own pace — the facilitator advances with a "Submit & continue" button whenever they're ready:

1. **Pick the challenge** — right after launch, the facilitator picks which of the generated options their group works on. Then **Question 1** — facilitator writes and submits the group's initial answer.
2. **C-level board challenge + revised answer** — as soon as the group enters this step, the board challenge is generated automatically (no admin action needed): 4 simulated committee members raise objections, grounded in the workshop's own **Knowledge Base** (not a generic framework):
   - **Board Committee Member** (strategy, growth, competitive positioning)
   - **Finance Committee Member** (cost, ROI, budget discipline)
   - **Technology Committee Member** (feasibility, data readiness, technical risk)
   - **Talent Committee Member** (workforce/frontline impact AND HR/people-strategy implications)

   The facilitator then writes and submits a revised answer in response.
3. **30 / 60 / 90-day actions** — immediately after the revised answer, still written by the facilitator: three fields — what the organization will do in the next 30 days (immediate moves), 60 days (needs some planning/buy-in), and 90 days (structural/strategic change). Submitting marks the group as done.

The admin's Workshop tab is a live 3-column board (Question 1 / Board & revised answer / 30/60/90 actions) — every group appears as a card in whichever column matches its current activity, so you can see at a glance who's ahead and who's behind. Tap a group's card to open a popup with everything it's done so far — **Challenge**, **Their solution**, **Board feedback**, **Reviewed solution**, **30/60/90-day actions** — plus a manual "regenerate board challenge" fallback button in case the automatic one needs a redo.

### Presentation tab
Open `/present/:workshopId` on the room screen. Pick which group is presenting, then reveal only the part(s) they're actually talking about (Challenge / Their solution / Board feedback / Reviewed solution / 30/60/90 actions) — no group ever covers everything in their readout, so show just what's relevant as they go, one or more sections at a time.

### Report tab — with a facilitator approval workflow
Groups appear as tabs, same as elsewhere — pick one, generate its report (executive summary, key insight, how their thinking evolved, recommended next steps). A report goes through three states:

1. **Draft** — the admin generates it; the facilitator can see and edit it from their own link's Report section.
2. **Submitted** — the facilitator submits it for approval once it looks right. They can keep editing after submitting — the admin always sees the latest.
3. **Approved** — the admin approves it from the Report tab. Once approved, the facilitator can no longer edit it (the admin still can, via **Edit**, and can always **Reopen for edits** to send it back to draft).

Mark the workshop as closed when it's over, right from the same tab row; if you close it by mistake before everyone's done, **Reopen workshop** puts it back into active mode without touching any reports you've already generated.

## Access — two separate links

**Facilitator link** (`/w/:workshopId`) — send only to people assigned as facilitators. On landing, they pick their name from a list of facilitators (only) and confirm with their email, then land in their own 3-section dashboard — **My group** (members + survey background), **Workshop** (the 3-activity stepper), **Report** (once generated, editable, with a submit-for-approval flow). Session is remembered on that device; a **Log out** button switches profiles on a shared device.

**Public groups link** (`/groups/:workshopId`) — share with everyone else. No login. Shows every group's name and members; tapping a group opens a read-only, live view of that group's challenge, initial answer, board challenge, revised answer, and 30/60/90 actions — it updates the moment the facilitator saves or resubmits a step.

Both links are shown (and copyable) at the top of the admin dashboard once a workshop is open.

## Structure
```
server.ts                          — Backend Express + Claude API endpoints
src/App.tsx                        — Path-based router (/admin, /w/:workshopId, /groups/:workshopId, /present/:id)
src/components/AdminApp.tsx         — Knowledge Base / Group & Challenge / Workshop / Presentation / Report tabs
src/components/ParticipantApp.tsx   — Facilitator-only login; My group / Workshop / Report dashboard (sidebar desktop, bottom bar mobile)
src/components/PublicGroupsView.tsx — Public, no-login: browse groups and their live progress
src/components/PresentationView.tsx — Admin-driven single-screen plenary view
src/firebase.ts                     — Lazy Firestore init (fow_* collections)
src/types.ts                        — Shared types, step labels, presentation section keys
src/csvImport.ts                    — CSV/XLSX parsing (tolerant of export preamble rows)
src/pdfExtract.ts                   — Client-side PDF text extraction (pdfjs-dist) for the Knowledge Base
src/ui.tsx                          — Shared UI primitives matching ROAI brand
firestore.rules                     — Firestore security rules
firebase-blueprint.json             — Data model reference
```

## Mobile (admin)
The admin dashboard has a dedicated mobile layout below the `lg` breakpoint — desktop is untouched. The sidebar becomes a fixed bottom tab bar, the header's link/edit buttons collapse into a single "⋯" menu, group/step tab rows scroll horizontally instead of wrapping, and card padding tightens up. Nothing about the desktop experience changes.

## Deploy

### Deploying on Google Cloud Run via GitHub
1. Push to a GitHub repo (`.env` is git-ignored).
2. Cloud Run → Create Service → "Continuously deploy from a repository" → build type **Dockerfile**.
3. In **Variables & Secrets**, set: `ANTHROPIC_API_KEY`, `ADMIN_SECRET`, `VITE_FIREBASE_API_KEY`, `VITE_FIREBASE_AUTH_DOMAIN`, `VITE_FIREBASE_PROJECT_ID`, `VITE_FIREBASE_STORAGE_BUCKET`, `VITE_FIREBASE_MESSAGING_SENDER_ID`, `VITE_FIREBASE_APP_ID`.
4. Every push to the connected branch triggers a new build & deploy.

The frontend builds once, at image-build time — Firebase config is fetched at runtime, so cold starts stay fast.

## Security note
`/api/generate-board-challenge` intentionally does **not** require the admin secret — it's called directly by whichever facilitator's device enters that step, so groups can run their 3 activities without the admin manually stepping in for each one. The Anthropic API key itself stays server-side either way. If the workshop link were ever exposed beyond intended participants, this endpoint could be called more than intended — an acceptable trade-off for an internal live-workshop tool, but worth knowing.
