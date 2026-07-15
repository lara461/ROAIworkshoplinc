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

// ROAI Framework (F1-F6) + Research Findings (R1-R17) — same backbone as the base tool
const ROAI_FRAMEWORK =
  "=== ROAI CLASS FRAMEWORK — for persona challenges only (F1-F6) ===\n" +
  "F1. THREE AI PARADIGMS: Analytical AI (predict/optimize), Generative AI (understand/create), Agentic AI (act/orchestrate 5-10x leverage)\n" +
  "F2. AI-NATIVE ORGANISATION 6 AREAS: AI Strategic Intent & Vision | Governance & Ethics (AI Council) | AI Money Map | Curated Data | AI-Native Workforce | Operational AI Technology\n" +
  "F3. VALUE CREATION MATRIX: Q1 Building Products (custom, customer-facing) | Q2 Scaling Growth (standardized, customer-facing) | Q3 Operational Efficiencies (internal) | Q4 Quality & Risk. Rule: never skip Q3 before Q4.\n" +
  "F4. AI MONEY MAP: Prioritized AI investments with measurable outcomes by functional domain, P&L, geography.\n" +
  "F5. FIVE AI VALUE PATTERNS: Knowledge & Decision Support | Customer Interaction | Workflow Automation | Risk & Control | Expert Productivity\n" +
  "F6. SIX-STAGE MATURITY: Stage 0 pilots | Stage 1 production | Stage 2 pre-assessment | Stage 3 post-assessment (first inflection) | Stage 4 aggregated | Stage 5 formal reporting (second inflection)\n" +
  "\n" +
  "=== RESEARCH FINDINGS — for facilitator suggestions only (R1-R17) ===\n" +
  "R1. 90% of organizations get some AI value but only 45% achieve HIGH value. The gap is management discipline, not technology. [See: ROAI Economic Maturity 2026, p.5]\n" +
  "R2. CFO ADVANTAGE: When CFO owns AI value accountability, 76% achieve high value vs 32% for functional leads. Only 2% of companies use this model. [See: ROAI Economic Maturity 2026, p.10]\n" +
  "R3. MIXED APPROACH: Organizations using BOTH employee productivity tools AND targeted enterprise solutions achieve 63.5% high value vs 31% narrow/deep only and 20% broad/shallow only. [See: ROAI Economic Maturity 2026, p.7]\n" +
  "R4. HEADCOUNT PARADOX: 60%+ of organizations reduced or froze hiring IN ANTICIPATION of AI. Only 2% made reductions from actual AI deployment. Ratio is 30:1 anticipatory vs actual. [See: HBR Jan 2026 - Companies Are Laying Off Workers Because of AI Potential, p.4]\n" +
  "R5. Klarna cut 40% of workforce then had to rehire because quality dropped. Announcing layoffs before AI delivers results risks employee cynicism and reduced adoption. [See: HBR Jan 2026 - Companies Are Laying Off Workers Because of AI Potential, p.5]\n" +
  "R6. INDIVIDUAL vs ORGANISATIONAL PRODUCTIVITY: 10-15% individual productivity gains rarely translate to org-wide efficiency. Requires disciplined process redesign. [See: HBR Jan 2026 - Companies Are Laying Off Workers Because of AI Potential, p.3]\n" +
  "R7. PRODUCT ORIENTATION: Treating AI as a product (not a project) is the single most cited factor for AI value. Brings structure for proposing benefit, reviewing over time, and stakeholder accountability. [See: HBR March 2026 - 7 Factors That Drive Returns on AI Investments, p.6]\n" +
  "R8. DATA READINESS: 55% cite unready data as the #1 inhibitor to AI value. 47% say lack of standard framework is #2. Even high-value companies feel they are improvising. [See: ROAI Economic Maturity 2026, p.14]\n" +
  "R9. TRAINING GAP: 58% have not trained employees in AI. 29% of leaders lack AI fluency. Organizations that invest in BOTH see +23 percentage point advantage in value realization. [See: ROAI Economic Maturity 2026, p.15]\n" +
  "R10. EMPLOYEE RESISTANCE MYTH: Only 13% cite employee resistance as an inhibitor. Employees are not resisting AI — they are waiting for leadership, frameworks, and training. [See: ROAI Economic Maturity 2026, p.15]\n" +
  "R11. SHORT vs LONG-TERM: Capital One EVP: a focus on short-term value is why many enterprises never make the transformation that unlocks long-term value. [See: HBR March 2026 - 7 Factors That Drive Returns on AI Investments, p.3]\n" +
  "R12. AGENTIC AI SIGNAL: Agentic AI adopters are 22% more likely to report high value. One bank runs 150 digital employees through performance reviews like human staff. [See: ROAI Economic Maturity 2026, p.9]\n" +
  "R13. AMERICAN PARADOX: US leads in AI vendor development but lags in value capture (38% high value vs 50%+ in Germany, UK, UAE, Japan, Australia). [See: ROAI Economic Maturity 2026, p.9]\n" +
  "R14. MEASUREMENT = VALUE: Organizations with formal AI value reporting achieve 69% high value vs 15% with no reporting. 71% of CIOs say their role is at risk if they cannot demonstrate AI value within 2 years. [See: ROAI Economic Maturity 2026, p.12-13]\n" +
  "R15. STAGE 3 BOTTLENECK: 30% of organizations are stuck at Stage 3 for a median of 6 years. Fix requires common metrics AND finance involvement in standardization. [See: ROAI Economic Maturity 2026, p.13]\n" +
  "R16. VALUE ENABLERS: Top enablers: effective implementation (56%), governance & PM (49%), easy-to-adopt technology (47%), process redesign (46%), employee training (42%). [See: ROAI Economic Maturity 2026, p.14]\n" +
  "R17. AI TYPE VALUE: 50% get most value from Analytical AI, 40% Rule-Based AI, only 9% Generative AI, 2% Agentic AI. Generative AI is hardest to measure and lowest value reported. [See: HBR March 2026 - 7 Factors That Drive Returns on AI Investments, p.5]\n";

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
    const { workshop, groupName, responses, numOptions } = req.body;
    if (!responses?.length) { res.status(400).json({ error: "No survey responses provided for this group" }); return; }
    const n = Math.max(2, Math.min(5, Number(numOptions) || 3));

    const responseLines = (responses || []).map((r: any) =>
      "Participant: " + r.participantName +
      " | Org size: " + r.orgSize +
      " | Current AI relationship: " + r.aiRelationship +
      " | Biggest concern: " + r.biggestConcern +
      " | Move timeline: " + r.moveTimeline +
      " | Future-of-work vision: " + r.futureVision +
      " | Ownership preference: " + r.ownershipPreference +
      " | Employee freedom stance: " + r.employeeFreedom +
      " | Open answer on future of work: " + r.futureOfWorkView
    ).join("\n---\n");

    const prompt =
      "You are an expert facilitator for the ROAI Institute, designing challenge options for ONE small group of C-level executives in a workshop on AI and the future of work.\n" +
      "Synthesize the pre-work survey answers of THIS GROUP's members below into EXACTLY " + n + " candidate challenge options. The group (or the facilitator on their behalf) will pick ONE to work on.\n\n" +
      "WORKSHOP: " + workshop.name + "\n" +
      "GROUP: " + groupName + "\n" +
      "GROUP MEMBERS' SURVEY RESPONSES:\n" + responseLines + "\n\n" +
      "RULES:\n" +
      "- Generate EXACTLY " + n + " options, no more no less.\n" +
      "- Pitch these at C-LEVEL / BOARDROOM altitude: strategic, decision-forcing questions about AI, organizational redesign, or the future of work — the kind of question a CEO or CHRO would want a real answer to, not a tactical or how-to question.\n" +
      "- Ground each option in patterns you actually see across THIS group's responses (their concerns, timelines, ownership preferences, employee-freedom stance).\n" +
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
  app.post("/api/generate-board-challenge", requireAdmin, async (req, res) => {
    if (!ANTHROPIC_API_KEY) { res.status(500).json({ error: "ANTHROPIC_API_KEY not configured" }); return; }
    const { challenge, solution, groupName } = req.body;
    if (!solution) { res.status(400).json({ error: "No solution provided" }); return; }

    const prompt =
      "You are simulating a panel of C-suite executives on an advisory board challenging a proposed answer from a workshop group.\n" +
      "Use ONLY the ROAI Institute class framework tools F1-F6 below. Do not reference research findings.\n\n" +
      ROAI_FRAMEWORK + "\n\n" +
      "CHALLENGE: " + challenge.title + "\n" +
      challenge.description + "\n\n" +
      "GROUP ANSWER by " + groupName + ":\n" +
      solution + "\n\n" +
      "Write ONE short punchy challenge per persona — maximum 1-2 sentences. Be blunt and direct, the way a real executive would push back in a room.\n" +
      "Each roaiTools entry must be an exact name from F1-F6 only.\n\n" +
      "Return ONLY valid JSON:\n" +
      "{\n" +
      '  "personaChallenges": [\n' +
      '    { "role": "CEO", "objection": "One sharp sentence.", "roaiTools": ["Value Creation Matrix"] },\n' +
      '    { "role": "CFO", "objection": "One sharp sentence.", "roaiTools": ["AI Money Map"] },\n' +
      '    { "role": "CIO", "objection": "One sharp sentence.", "roaiTools": ["Three AI Paradigms"] },\n' +
      '    { "role": "CHRO", "objection": "One sharp sentence.", "roaiTools": ["AI-Native Workforce"] },\n' +
      '    { "role": "Legal", "objection": "One sharp sentence.", "roaiTools": ["Governance & Ethics"] },\n' +
      '    { "role": "Frontline Employee", "objection": "One sharp sentence.", "roaiTools": ["Workflow Automation Pattern"] }\n' +
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

  // Final — Workshop report (executive summary across challenges, groups, and 30-day commitments)
  app.post("/api/generate-report", requireAdmin, async (req, res) => {
    if (!ANTHROPIC_API_KEY) { res.status(500).json({ error: "ANTHROPIC_API_KEY not configured" }); return; }
    const { workshop, participants, challenges, groups, solutions, commitments } = req.body;
    if (!workshop) { res.status(400).json({ error: "No workshop data" }); return; }

    const groupBlock = (groups || []).map((g: any) => {
      const sol = (solutions || []).find((s: any) => s.groupId === g.id);
      const challenge = (challenges || []).find((c: any) => c.id === g.challengeId);
      return "GROUP: " + g.name + "\nChallenge: " + (challenge?.title || "N/A") +
        "\nInitial answer: " + (sol?.initialSolution || "Not submitted") +
        "\nRevised answer (after board challenge): " + (sol?.revisedSolution || "Not submitted");
    }).join("\n\n---\n\n");

    const commitmentLines = (commitments || []).map((c: any) => "- " + c.action).join("\n");

    const prompt =
      "You are a senior AI strategy advisor summarizing a C-level executive workshop on AI and the future of work for the ROAI Institute.\n\n" +
      "WORKSHOP: " + workshop.name + "\nDATE: " + workshop.date + "\nPARTICIPANTS: " + (participants || []).length + " executives\n\n" +
      "CHALLENGES EXPLORED:\n" + (challenges || []).map((c: any) => "- " + c.title + ": " + c.description).join("\n") + "\n\n" +
      "GROUP OUTCOMES:\n" + groupBlock + "\n\n" +
      "INDIVIDUAL 30-DAY COMMITMENTS:\n" + commitmentLines + "\n\n" +
      "Write a comprehensive executive workshop report. Be specific, reference actual content.\n\n" +
      "Return ONLY valid JSON:\n" +
      "{\n" +
      '  "executiveSummary": "3-4 sentence summary",\n' +
      '  "keyThemes": ["theme 1", "theme 2", "theme 3"],\n' +
      '  "groupHighlights": [{ "groupName": "name", "challenge": "title", "coreInsight": "2-3 sentences", "boldMove": "most ambitious element" }],\n' +
      '  "commitmentPatterns": "2-3 sentences on patterns across the individual 30-day commitments",\n' +
      '  "recommendedNextSteps": ["step 1", "step 2", "step 3"],\n' +
      '  "closingNote": "2-sentence inspiring close"\n' +
      "}";

    try {
      const raw = await callClaude(prompt);
      const parsed = JSON.parse(raw.replace(/```json|```/g, "").trim());
      res.json(parsed);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
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
