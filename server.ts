import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import { fileURLToPath } from "url";
import dotenv from "dotenv";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const ADMIN_SECRET = process.env.ADMIN_SECRET;
const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;
const PORT = process.env.PORT || 3001;

function requireAdmin(req: express.Request, res: express.Response, next: express.NextFunction) {
  const secret = req.headers["x-admin-secret"] as string;
  if (!secret || secret !== ADMIN_SECRET) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  next();
}

async function callClaude(prompt: string): Promise<string> {
  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": ANTHROPIC_API_KEY!,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: "claude-sonnet-4-5",
      max_tokens: 4000,
      messages: [{ role: "user", content: prompt }],
    }),
  });
  if (!response.ok) {
    const err = await response.text();
    throw new Error("Claude error: " + err);
  }
  const data = await response.json();
  return data.content?.[0]?.text ?? "";
}

function capKnowledgeBase(knowledgeBase: string | undefined): string {
  if (!knowledgeBase) return "";
  const MAX_CHARS = 40000; // keeps prompts within a sane budget even with several documents
  return knowledgeBase.length > MAX_CHARS ? knowledgeBase.slice(0, MAX_CHARS) + "\n...[truncated]" : knowledgeBase;
}

async function startServer() {
  const app = express();
  app.use(express.json());
  app.use((req, res, next) => {
    res.header("Access-Control-Allow-Origin", "*");
    res.header("Access-Control-Allow-Headers", "Content-Type, x-admin-secret");
    res.header("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
    if (req.method === "OPTIONS") { res.sendStatus(200); return; }
    next();
  });

  app.post("/api/verify-admin", (req, res) => {
    const { adminSecret } = req.body;
    if (adminSecret === ADMIN_SECRET) res.json({ ok: true });
    else res.status(401).json({ error: "Unauthorized" });
  });

  // Step 1 — Generate challenge OPTIONS for a specific group, from that
  // group's members' (externally-collected) survey answers. Strategic,
  // board-level framing since these are for C-level executives.
  app.post("/api/generate-group-challenges", requireAdmin, async (req, res) => {
    if (!ANTHROPIC_API_KEY) { res.status(500).json({ error: "ANTHROPIC_API_KEY not configured" }); return; }
    const { workshop, groupName, responses, numOptions, knowledgeBase } = req.body;
    if (!responses?.length) { res.status(400).json({ error: "No survey responses provided for this group" }); return; }
    const n = Math.max(2, Math.min(5, Number(numOptions) || 3));
    const kb = capKnowledgeBase(knowledgeBase);

    const responseLines = (responses || []).map((r: any) =>
      "Participant: " + r.participantName +
      " | Current AI relationship: " + r.aiRelationship +
      " | Future-of-work vision: " + r.futureVision +
      " | Opportunities/challenges they see: " + r.opportunitiesChallenges
    ).join("\n---\n");

    const prompt =
      "You are an expert facilitator for the ROAI Institute, designing challenge options for ONE small group of C-level executives in a workshop on AI and the future of work.\n" +
      "Synthesize the pre-work survey answers of THIS GROUP's members below into EXACTLY " + n + " candidate challenge options. The group (or the facilitator on their behalf) will pick ONE to work on.\n\n" +
      "WORKSHOP: " + workshop.name + "\n" +
      "GROUP: " + groupName + "\n" +
      "GROUP MEMBERS' SURVEY RESPONSES:\n" + responseLines + "\n\n" +
      (kb
        ? "WORKSHOP REFERENCE MATERIALS (this workshop's specific knowledge base — ground the challenges in this, not in generic AI content):\n" + kb + "\n\n"
        : "") +
      "RULES:\n" +
      "- Generate EXACTLY " + n + " options, no more no less.\n" +
      "- Pitch these at C-LEVEL / BOARDROOM altitude: strategic, decision-forcing questions about AI, organizational redesign, or the future of work — the kind of question a CEO or CHRO would want a real answer to, not a tactical or how-to question.\n" +
      "- Ground each option in patterns you actually see across THIS group's responses (their AI relationship stage, their vision for how AI changes their work, and the opportunities/challenges they named)." +
      (kb ? " Each option must also be at least tangentially connected to the workshop reference materials above — don't invent challenges unrelated to what this workshop is actually about." : "") + "\n" +
      "- The " + n + " options must be genuinely distinct from each other, each offering a different strategic angle, so the group has a real choice.\n" +
      "- Do NOT mention any real company or participant names. Use generic framing ('your organisation').\n" +
      "- Return ONLY valid JSON, nothing else.\n\n" +
      "Return this exact JSON:\n" +
      "{\n" +
      '  "challenges": [\n' +
      "    {\n" +
      '      "title": "Short, boardroom-level challenge title (max 12 words), phrased as something the group must decide or solve",\n' +
      '      "description": "2-3 sentence description of the strategic challenge and why it matters, grounded in the group\'s survey patterns",\n' +
      '      "themes": ["theme 1", "theme 2"]\n' +
      "    }\n" +
      "  ]\n" +
      "}";

    try {
      const raw = await callClaude(prompt);
      const parsed = JSON.parse(raw.replace(/```json|```/g, "").trim());
      res.json(parsed);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // Step 3 — Simulated C-level Board Challenge on a group's solution
  // No requireAdmin here on purpose: this is triggered automatically by the
  // group's facilitator when their timed activity moves from "initial" to
  // "board", so the workshop can run without the admin manually stepping in
  // for every group.
  app.post("/api/generate-board-challenge", async (req, res) => {
    if (!ANTHROPIC_API_KEY) { res.status(500).json({ error: "ANTHROPIC_API_KEY not configured" }); return; }
    const { challenge, solution, groupName, knowledgeBase } = req.body;
    if (!solution) { res.status(400).json({ error: "No solution provided" }); return; }
    const kb = capKnowledgeBase(knowledgeBase);

    const prompt =
      "You are simulating a panel of 4 governance committee members challenging a proposed answer from a workshop group at a C-level executive workshop.\n" +
      (kb
        ? "Ground every objection in SPECIFICS from the workshop's own reference materials below — cite or clearly reference concrete points from them, don't rely on generic AI-strategy talk.\n\n" +
          "WORKSHOP REFERENCE MATERIALS:\n" + kb + "\n\n"
        : "No specific workshop reference materials were provided — challenge them on solid general executive/strategic judgment instead.\n\n") +
      "CHALLENGE: " + challenge.title + "\n" +
      challenge.description + "\n\n" +
      "GROUP ANSWER by " + groupName + ":\n" +
      solution + "\n\n" +
      "The four committee perspectives to simulate:\n" +
      "- Board Committee Member: overall strategy, growth, competitive positioning, and accountability to shareholders/stakeholders.\n" +
      "- Finance Committee Member: cost, ROI, budget discipline, measurable value.\n" +
      "- Technology Committee Member: feasibility, data readiness, technical risk, architecture.\n" +
      "- Talent Committee Member: people impact — both the workforce/frontline experience AND the HR/people-strategy implications (hiring, training, culture, change management).\n\n" +
      "Write ONE short punchy challenge per committee member — maximum 1-2 sentences. Be blunt and direct, the way a real executive would push back in a room.\n\n" +
      "Return ONLY valid JSON:\n" +
      "{\n" +
      '  "personaChallenges": [\n' +
      '    { "role": "Board Committee Member", "objection": "One sharp sentence." },\n' +
      '    { "role": "Finance Committee Member", "objection": "One sharp sentence." },\n' +
      '    { "role": "Technology Committee Member", "objection": "One sharp sentence." },\n' +
      '    { "role": "Talent Committee Member", "objection": "One sharp sentence." }\n' +
      "  ]\n" +
      "}";

    try {
      const raw = await callClaude(prompt);
      const parsed = JSON.parse(raw.replace(/```json|```/g, "").trim());
      res.json(parsed);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // A short AI briefing on how the group is composed, from their pre-work
  // survey answers — shown to the facilitator in "My group" so they walk in
  // with a sense of who they've got, not just a list of names.
  app.post("/api/generate-group-insight", async (req, res) => {
    if (!ANTHROPIC_API_KEY) { res.status(500).json({ error: "ANTHROPIC_API_KEY not configured" }); return; }
    const { groupName, responses } = req.body;
    if (!responses?.length) { res.status(400).json({ error: "No survey responses provided for this group" }); return; }

    const responseLines = (responses || []).map((r: any) =>
      "Participant: " + r.participantName +
      " | Current AI relationship: " + r.aiRelationship +
      " | Future-of-work vision: " + r.futureVision +
      " | Opportunities/challenges they see: " + r.opportunitiesChallenges
    ).join("\n---\n");

    const prompt =
      "You are briefing a workshop facilitator on the group they're about to run, based on their members' pre-work survey answers.\n\n" +
      "GROUP: " + groupName + "\n" +
      "MEMBERS' SURVEY RESPONSES:\n" + responseLines + "\n\n" +
      "Write a short briefing (3-4 sentences, one paragraph, no headers or bullet points) that helps the facilitator understand " +
      "who's in the room: where the group broadly stands on AI maturity, where views converge or diverge, and anything " +
      "notably useful to know before facilitating this specific group. Be specific to what's actually in their answers, not generic.\n\n" +
      "Return ONLY valid JSON:\n" +
      '{ "insight": "the paragraph" }';

    try {
      const raw = await callClaude(prompt);
      const parsed = JSON.parse(raw.replace(/```json|```/g, "").trim());
      res.json(parsed);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // Report tab — one report PER GROUP, generated after the workshop is
  // marked closed: how their thinking evolved from the initial answer
  // through the board's challenge to their revised answer, plus their
  // 30/60/90-day actions.
  app.post("/api/generate-group-report", requireAdmin, async (req, res) => {
    if (!ANTHROPIC_API_KEY) { res.status(500).json({ error: "ANTHROPIC_API_KEY not configured" }); return; }
    const { workshop, group, challenge, solution, personaChallenges } = req.body;
    if (!group || !challenge) { res.status(400).json({ error: "Missing group or challenge data" }); return; }

    const boardBlock = (personaChallenges || []).map((pc: any) => "- " + pc.role + ": " + pc.objection).join("\n");

    const prompt =
      "You are a senior AI strategy advisor writing a short report on ONE group's work during a C-level executive workshop on AI and the future of work, for the ROAI Institute.\n\n" +
      "WORKSHOP: " + workshop.name + "\n" +
      "GROUP: " + group.name + "\n" +
      "CHALLENGE: " + challenge.title + " — " + challenge.description + "\n\n" +
      "THEIR SOLUTION:\n" + (solution?.initialSolution || "Not submitted") + "\n\n" +
      "BOARD FEEDBACK:\n" + (boardBlock || "Not generated") + "\n\n" +
      "REVIEWED SOLUTION (after the board's feedback):\n" + (solution?.revisedSolution || "Not submitted") + "\n\n" +
      "30/60/90-DAY ACTIONS:\n" +
      "30 days: " + (solution?.action30 || "Not submitted") + "\n" +
      "60 days: " + (solution?.action60 || "Not submitted") + "\n" +
      "90 days: " + (solution?.action90 || "Not submitted") + "\n\n" +
      "Write a short, specific report on this group's work. Reference actual content, don't be generic.\n\n" +
      "Return ONLY valid JSON:\n" +
      "{\n" +
      '  "executiveSummary": "2-3 sentence summary of this group\'s challenge and solution",\n' +
      '  "keyInsight": "1-2 sentence core strategic takeaway from this group\'s work",\n' +
      '  "evolution": "2-3 sentences on how their thinking changed (or didn\'t) between their solution and their reviewed solution, in response to the board\'s feedback",\n' +
      '  "recommendedNextSteps": ["step 1", "step 2", "step 3"]\n' +
      "}";

    try {
      const raw = await callClaude(prompt);
      const parsed = JSON.parse(raw.replace(/```json|```/g, "").trim());
      res.json(parsed);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // Firebase web config, read at runtime from env vars and handed to the
  // client via fetch. This is what lets the frontend be built ONCE at image
  // build time (fast, normal cold starts) instead of rebuilding on every
  // container start just to bake in these values. These are Firebase's
  // public web-app config values — safe to serve unauthenticated.
  app.get("/api/firebase-config", (_req, res) => {
    res.json({
      apiKey: process.env.VITE_FIREBASE_API_KEY,
      authDomain: process.env.VITE_FIREBASE_AUTH_DOMAIN,
      projectId: process.env.VITE_FIREBASE_PROJECT_ID,
      storageBucket: process.env.VITE_FIREBASE_STORAGE_BUCKET,
      messagingSenderId: process.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
      appId: process.env.VITE_FIREBASE_APP_ID,
    });
  });

  // Vite dev / Static prod
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get(/^(?!\/api).*/, (_req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(Number(PORT), "0.0.0.0", () => {
    console.log("Server running on http://localhost:" + PORT);
  });
}

startServer();
