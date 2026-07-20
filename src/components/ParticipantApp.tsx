import { useEffect, useMemo, useRef, useState } from "react";
import type { CSSProperties } from "react";
import { onSnapshot, query, setDoc, updateDoc, where } from "firebase/firestore";
import { CheckCircle2, FileBarChart, HelpCircle, LogOut, Loader2, Pencil, PlayCircle, Sparkles, Users, X } from "lucide-react";
import { col, docIn } from "../firebase";
import { Btn, Card, FacilitatorBadge, ROAILogo, StepTabs, Tag, TabIntro } from "../ui";
import { cn } from "../utils";
import type {
  BoardChallenge,
  Challenge,
  Group,
  GroupReport,
  GroupSolution,
  KnowledgeDoc,
  Participant,
  SurveyResponse,
  Workshop,
} from "../types";

function sessionKey(workshopId: string) {
  return `fow_session_${workshopId}`;
}

async function generateBoardChallenge(challenge: Challenge, solution: string, groupName: string, knowledgeBase: string) {
  const res = await fetch("/api/generate-board-challenge", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      challenge: { title: challenge.title, description: challenge.description },
      solution,
      groupName,
      knowledgeBase,
    }),
  });
  if (!res.ok) throw new Error((await res.json()).error || "Request failed");
  return res.json();
}

function Waiting({ message }: { message: string }) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-[#FAFAFA] px-6">
      <div className="max-w-md text-center space-y-4">
        <Loader2 className="animate-spin w-6 h-6 mx-auto text-[#DD4B4E]" />
        <p className="text-gray-500">{message}</p>
      </div>
    </div>
  );
}

// ── Landing: pick your name, confirm with email ─────────────────────────
function Login({
  workshop,
  participants,
  onLogin,
}: {
  workshop: Workshop;
  participants: Participant[];
  onLogin: (p: Participant) => void;
}) {
  const [selectedId, setSelectedId] = useState("");
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const sorted = useMemo(() => [...participants].sort((a, b) => a.name.localeCompare(b.name)), [participants]);

  async function submit() {
    setError("");
    const p = participants.find((p) => p.id === selectedId);
    if (!p) { setError("Pick your name from the list."); return; }
    if (!email.trim()) { setError("Enter your email to confirm it's you."); return; }
    setSubmitting(true);
    try {
      if (p.email) {
        if (p.email.trim().toLowerCase() !== email.trim().toLowerCase()) {
          setError("That email doesn't match our records for this name.");
          setSubmitting(false);
          return;
        }
      } else {
        await updateDoc(docIn("participants", p.id), { email: email.trim() });
      }
      localStorage.setItem(sessionKey(workshop.id), p.id);
      onLogin(p);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen bg-white flex items-center justify-center px-6">
      <div className="max-w-sm w-full space-y-6">
        <div className="flex justify-center"><ROAILogo size="md" /></div>
        <div className="w-full">
          <Card className="space-y-4">
            <div className="text-center space-y-1">
              <h1 className="text-xl font-black text-[#14121F]">{workshop.name}</h1>
              <p className="text-gray-400 text-sm">Facilitator access — find your name to enter your group.</p>
            </div>
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-1.5">Your name</label>
              <select
                value={selectedId}
                onChange={(e) => setSelectedId(e.target.value)}
                className="w-full bg-gray-50 border border-gray-200 rounded-md px-4 py-2.5 text-sm outline-none focus:border-[#DD4B4E]"
              >
                <option value="">Select your name...</option>
                {sorted.map((p) => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-1.5">Your email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && submit()}
                placeholder="you@company.com"
                className="w-full bg-gray-50 border border-gray-200 rounded-md px-4 py-2.5 text-sm outline-none focus:border-[#DD4B4E]"
              />
            </div>
            {error && <p className="text-red-500 text-sm font-medium">{error}</p>}
            <Btn variant="coral" onClick={submit} loading={submitting} className="w-full justify-center">Enter</Btn>
          </Card>
        </div>
      </div>
    </div>
  );
}

function ChallengePicker({ group, challenges }: { group: Group; challenges: Challenge[] }) {
  async function select(challengeId: string) {
    for (const c of challenges) {
      await updateDoc(docIn("challenges", c.id), { status: c.id === challengeId ? "selected" : "option" });
    }
    await updateDoc(docIn("groups", group.id), { challengeId });
  }

  return (
    <div>
      <TabIntro>Pick which of these your group will work on for the rest of the workshop. Choose carefully — you can't change it later.</TabIntro>
      <div className="space-y-3">
        {challenges.map((c) => (
          <div key={c.id} className="rounded-md border p-5 bg-white border-gray-200">
            <div className="font-bold text-[#14121F]">{c.title}</div>
            <p className="text-sm text-gray-500 mt-1">{c.description}</p>
            <Btn variant="coral" className="mt-3 text-xs px-3 py-1.5" onClick={() => select(c.id)}>Select this challenge</Btn>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── "My group" section: members + the survey answers they gave beforehand ─
function MyGroupSection({
  group,
  participants,
  responses,
}: {
  group: Group;
  participants: Participant[];
  responses: SurveyResponse[];
}) {
  const [generatingInsight, setGeneratingInsight] = useState(false);
  const members = group.participantIds
    .map((id) => participants.find((p) => p.id === id))
    .filter(Boolean) as Participant[];

  async function runInsight() {
    const responsePayload = members.map((m) => {
      const r = responses.find((r) => r.participantId === m.id);
      return {
        participantName: m.name,
        aiRelationship: r?.aiRelationship || "",
        futureVision: r?.futureVision || "",
        opportunitiesChallenges: r?.opportunitiesChallenges || "",
      };
    });
    setGeneratingInsight(true);
    try {
      const res = await fetch("/api/generate-group-insight", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ groupName: group.name, responses: responsePayload }),
      });
      if (!res.ok) throw new Error((await res.json()).error || "Request failed");
      const { insight } = await res.json();
      await updateDoc(docIn("groups", group.id), { groupInsight: insight });
    } catch (e: any) {
      // quiet failure — the briefing is a nice-to-have, not blocking
      console.error(e);
    } finally {
      setGeneratingInsight(false);
    }
  }

  useEffect(() => {
    if (group.groupInsight || generatingInsight) return;
    const hasAnySurvey = members.some((m) => responses.some((r) => r.participantId === m.id));
    if (!hasAnySurvey) return;
    runInsight();
  }, [group.id, group.groupInsight]);

  return (
    <div>
      <TabIntro>
        Your group's members and the survey answers they gave before the workshop — useful background before you dive in.
      </TabIntro>

      <div data-tour="groupInsight" className="border-l-4 border-[#3545A3] bg-[#3545A3]/5 rounded-r-lg p-4 mb-4">
        <div className="flex items-center justify-between mb-1.5">
          <div className="flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-[#3545A3]" />
            <p className="text-xs font-bold uppercase tracking-widest text-[#3545A3]">AI briefing on this group</p>
          </div>
          <button onClick={runInsight} disabled={generatingInsight} className="text-xs text-gray-400 hover:text-[#3545A3] disabled:opacity-50">
            {generatingInsight ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : "Regenerate"}
          </button>
        </div>
        {group.groupInsight ? (
          <p className="text-sm text-[#14121F]">{group.groupInsight}</p>
        ) : generatingInsight ? (
          <p className="text-sm text-gray-400 flex items-center gap-2"><Loader2 className="w-3.5 h-3.5 animate-spin" /> Putting together a briefing on your group...</p>
        ) : (
          <p className="text-sm text-gray-400">No survey answers on file yet to brief from.</p>
        )}
      </div>

      <div className="space-y-3">
        {members.map((m) => {
          const r = responses.find((r) => r.participantId === m.id);
          return (
            <Card key={m.id}>
              <div className="flex items-center justify-between mb-2">
                <span className="font-bold text-[#14121F] flex items-center gap-2">
                  {m.name}
                  {m.role === "facilitator" && <FacilitatorBadge />}
                </span>
                {r ? <Tag color="green">survey on file</Tag> : <Tag>no survey</Tag>}
              </div>
              {m.email && <p className="text-xs text-gray-400 mb-2">{m.email}</p>}
              {r ? (
                <div className="space-y-2 text-xs text-gray-600">
                  <div><span className="font-semibold text-gray-400 uppercase tracking-wide text-[10px]">AI relationship: </span>{r.aiRelationship}</div>
                  <div><span className="font-semibold text-gray-400 uppercase tracking-wide text-[10px]">Future vision: </span>{r.futureVision}</div>
                  <div><span className="font-semibold text-gray-400 uppercase tracking-wide text-[10px]">Opportunities/challenges: </span>{r.opportunitiesChallenges}</div>
                </div>
              ) : (
                <p className="text-xs text-gray-400">No survey answers on file for this participant.</p>
              )}
            </Card>
          );
        })}
        {members.length === 0 && <p className="text-gray-400 text-sm">No members in your group yet.</p>}
      </div>
    </div>
  );
}

// ── "Workshop" section: the 3 timed activities, navigable via step tabs ──
function WorkshopSection({
  group,
  challenge,
  groupChallenges,
  workshop,
}: {
  group: Group;
  challenge: Challenge | undefined;
  groupChallenges: Challenge[];
  workshop: Workshop;
}) {
  const [initialSolution, setInitialSolution] = useState("");
  const [revisedSolution, setRevisedSolution] = useState("");
  const [action30, setAction30] = useState("");
  const [action60, setAction60] = useState("");
  const [action90, setAction90] = useState("");
  const [solutionDoc, setSolutionDoc] = useState<GroupSolution | null>(null);
  const [board, setBoard] = useState<BoardChallenge | null>(null);
  const [saving, setSaving] = useState(false);
  const [generatingBoard, setGeneratingBoard] = useState(false);
  const [knowledgeDocs, setKnowledgeDocs] = useState<KnowledgeDoc[]>([]);
  const [kbLoaded, setKbLoaded] = useState(false);
  const [activeStep, setActiveStep] = useState<"initial" | "board" | "actions">("initial");

  const currentStep = group.currentStep || "initial";

  function reachedIndex(step: Group["currentStep"]) {
    if (step === "board") return 1;
    if (step === "actions" || step === "done") return 2;
    return 0;
  }
  const reached = reachedIndex(currentStep);

  useEffect(() => {
    const idx = reachedIndex(group.currentStep);
    setActiveStep(idx === 0 ? "initial" : idx === 1 ? "board" : "actions");
  }, [group.id, group.currentStep]);

  useEffect(() => {
    return onSnapshot(query(col.knowledgeDocs, where("workshopId", "==", workshop.id)), (snap) => {
      setKnowledgeDocs(snap.docs.map((d) => ({ id: d.id, ...d.data() } as KnowledgeDoc)));
      setKbLoaded(true);
    });
  }, [workshop.id]);

  useEffect(() => {
    return onSnapshot(docIn("groupSolutions", group.id), (s) => {
      const data = s.data() as GroupSolution | undefined;
      setSolutionDoc(data || null);
      if (document.activeElement?.id !== "initial-box") setInitialSolution(data?.initialSolution || "");
      if (document.activeElement?.id !== "revised-box") setRevisedSolution(data?.revisedSolution || "");
      if (document.activeElement?.id !== "action30-box") setAction30(data?.action30 || "");
      if (document.activeElement?.id !== "action60-box") setAction60(data?.action60 || "");
      if (document.activeElement?.id !== "action90-box") setAction90(data?.action90 || "");
    });
  }, [group.id]);

  useEffect(() => {
    return onSnapshot(docIn("boardChallenges", group.id), (s) => {
      setBoard(s.exists() ? ({ id: s.id, ...s.data() } as BoardChallenge) : null);
    });
  }, [group.id]);

  // Auto-generate the board challenge once the group enters the "board"
  // step, so the facilitator doesn't need the admin to trigger it.
  useEffect(() => {
    if (currentStep !== "board" || board || generatingBoard || !challenge || !kbLoaded) return;
    if (!solutionDoc?.initialSolution) return;
    setGeneratingBoard(true);
    const knowledgeBase = knowledgeDocs.map((d) => `--- ${d.name} ---\n${d.content}`).join("\n\n");
    generateBoardChallenge(challenge, solutionDoc.initialSolution, group.name, knowledgeBase)
      .then(({ personaChallenges }) =>
        setDoc(docIn("boardChallenges", group.id), {
          groupId: group.id,
          workshopId: workshop.id,
          personaChallenges,
          createdAt: new Date().toISOString(),
        })
      )
      .catch((e) => alert(e.message))
      .finally(() => setGeneratingBoard(false));
  }, [currentStep, board, challenge, solutionDoc?.initialSolution, kbLoaded]);

  async function saveField(field: string, value: string, setter: (v: string) => void) {
    setter(value);
    await setDoc(docIn("groupSolutions", group.id), {
      groupId: group.id,
      workshopId: workshop.id,
      [field]: value,
    }, { merge: true });
  }

  async function submitInitial() {
    setSaving(true);
    try {
      await setDoc(docIn("groupSolutions", group.id), {
        groupId: group.id,
        workshopId: workshop.id,
        initialSolution,
        initialSubmitted: true,
        initialSubmittedAt: new Date().toISOString(),
      }, { merge: true });
      await updateDoc(docIn("groups", group.id), { currentStep: "board", stepStartedAt: new Date().toISOString() });
    } finally {
      setSaving(false);
    }
  }

  async function submitRevised() {
    setSaving(true);
    try {
      await setDoc(docIn("groupSolutions", group.id), {
        groupId: group.id,
        workshopId: workshop.id,
        revisedSolution,
        revisedSubmitted: true,
        revisedSubmittedAt: new Date().toISOString(),
      }, { merge: true });
      await updateDoc(docIn("groups", group.id), { currentStep: "actions", stepStartedAt: new Date().toISOString() });
    } finally {
      setSaving(false);
    }
  }

  async function submitActions() {
    setSaving(true);
    try {
      await setDoc(docIn("groupSolutions", group.id), {
        groupId: group.id,
        workshopId: workshop.id,
        action30,
        action60,
        action90,
        actionsSubmitted: true,
        actionsSubmittedAt: new Date().toISOString(),
      }, { merge: true });
      await updateDoc(docIn("groups", group.id), { currentStep: "done" });
    } finally {
      setSaving(false);
    }
  }

  if (workshop.status === "setup") {
    return <TabIntro>The workshop hasn't started yet. Sit tight — you'll pick your challenge as soon as it launches.</TabIntro>;
  }

  if (!group.challengeId) {
    if (groupChallenges.length === 0) {
      return <TabIntro>Your challenge options are being prepared by the admin. Check back shortly.</TabIntro>;
    }
    return <ChallengePicker group={group} challenges={groupChallenges} />;
  }

  return (
    <div>
      <TabIntro>
        Move between the tabs below to work through your group's 3 activities. You can tab back anytime to review
        what you've already written, but you can only edit the activity you're currently on.
      </TabIntro>

      <div className="border-l-4 border-[#3545A3] bg-[#3545A3]/5 rounded-r-lg p-4 mb-6">
        <p className="text-xs font-bold uppercase tracking-widest text-[#3545A3] mb-1">Your challenge</p>
        <p className="font-bold text-[#14121F]">{challenge?.title}</p>
        <p className="text-sm text-gray-600 mt-1">{challenge?.description}</p>
      </div>

      <StepTabs
        steps={[
          { key: "initial", label: "Question 1" },
          { key: "board", label: "Board & revised answer", locked: reached < 1 },
          { key: "actions", label: "30/60/90 actions", locked: reached < 2 },
        ]}
        active={activeStep}
        onChange={(k) => setActiveStep(k as typeof activeStep)}
      />

      {activeStep === "initial" && (
        <Card className="space-y-3">
          <p className="text-sm text-gray-500">
            Write your group's first answer to the challenge above. Once you submit, the C-level board will weigh in —
            you won't be able to edit this afterward, so make sure the group agrees before submitting.
          </p>
          <textarea
            id="initial-box"
            value={initialSolution}
            onChange={(e) => saveField("initialSolution", e.target.value, setInitialSolution)}
            rows={8}
            disabled={currentStep !== "initial"}
            className={cn(
              "w-full bg-gray-50 border border-gray-200 rounded-md px-4 py-2.5 text-sm outline-none resize-none",
              currentStep !== "initial" ? "opacity-60 cursor-not-allowed" : "focus:border-[#DD4B4E]"
            )}
            placeholder="Write your group's answer here..."
          />
          {currentStep === "initial" && (
            <Btn variant="coral" onClick={submitInitial} loading={saving} disabled={!initialSolution.trim()}>
              Submit & continue
            </Btn>
          )}
        </Card>
      )}

      {activeStep === "board" && (
        <Card className="space-y-4">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-1.5">Your initial answer</p>
            <p className="text-sm text-[#14121F] bg-gray-50 border border-gray-200 rounded-md px-4 py-3 whitespace-pre-wrap">{initialSolution}</p>
          </div>

          {!board ? (
            <p className="text-sm text-gray-400 flex items-center gap-2"><Loader2 className="w-4 h-4 animate-spin" /> The board is reviewing your answer...</p>
          ) : (
            <div>
              <p className="text-[10px] font-bold uppercase tracking-widest text-[#DD4B4E] mb-2">The C-level board is challenging your answer</p>
              <div className="grid sm:grid-cols-2 gap-2">
                {board.personaChallenges.map((pc, i) => (
                  <div key={i} className="bg-[#14121F] rounded-md p-3 text-sm">
                    <div className="text-[#DD4B4E] font-bold text-xs uppercase tracking-widest mb-1">{pc.role}</div>
                    <div className="text-white/90">{pc.objection}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {board && (
            <div>
              <p className="text-sm text-gray-500 mb-1.5">
                How does your group respond to the board's pushback? Update your answer in light of their feedback.
              </p>
              <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-1.5">Revised answer</p>
              <textarea
                id="revised-box"
                value={revisedSolution}
                onChange={(e) => saveField("revisedSolution", e.target.value, setRevisedSolution)}
                rows={6}
                disabled={currentStep !== "board"}
                className={cn(
                  "w-full bg-gray-50 border border-gray-200 rounded-md px-4 py-2.5 text-sm outline-none resize-none",
                  currentStep !== "board" ? "opacity-60 cursor-not-allowed" : "focus:border-[#DD4B4E]"
                )}
                placeholder="How does your group respond to the board's pushback?"
              />
              {currentStep === "board" && (
                <Btn variant="coral" onClick={submitRevised} loading={saving} disabled={!revisedSolution.trim()} className="mt-2">
                  Submit & continue
                </Btn>
              )}
            </div>
          )}
        </Card>
      )}

      {activeStep === "actions" && (
        <Card className="space-y-4">
          <p className="text-sm text-gray-500">
            Turn the discussion into action: what will your organization actually do next? Split it across three horizons.
          </p>
          {[
            { id: "action30", label: "Next 30 days — immediate, low-effort moves you can start right away", value: action30, setter: setAction30 },
            { id: "action60", label: "Next 60 days — actions that need some planning or buy-in", value: action60, setter: setAction60 },
            { id: "action90", label: "Next 90 days — structural or strategic changes that take longer to land", value: action90, setter: setAction90 },
          ].map((f) => (
            <div key={f.id}>
              <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-1.5">{f.label}</p>
              <textarea
                id={`${f.id}-box`}
                value={f.value}
                onChange={(e) => saveField(f.id, e.target.value, f.setter)}
                rows={3}
                disabled={currentStep !== "actions"}
                className={cn(
                  "w-full bg-gray-50 border border-gray-200 rounded-md px-4 py-2.5 text-sm outline-none resize-none",
                  currentStep !== "actions" ? "opacity-60 cursor-not-allowed" : "focus:border-[#DD4B4E]"
                )}
              />
            </div>
          ))}
          {currentStep === "actions" && (
            <Btn variant="coral" onClick={submitActions} loading={saving} disabled={!action30.trim() && !action60.trim() && !action90.trim()}>
              Submit & finish
            </Btn>
          )}
          {currentStep === "done" && (
            <p className="text-emerald-600 text-sm font-medium flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4" /> Your group has completed all the activities. Nice work!
            </p>
          )}
        </Card>
      )}
    </div>
  );
}

// ── "Report" section: view/edit the group's closing report, then submit ──
// A borderless, auto-growing text field that reads like plain document text
// until you click into it — no separate "edit mode", just click and type,
// like editing a paragraph in a Google Doc. Saves happen on every change.
function DocField({
  id,
  value,
  onChange,
  placeholder,
  disabled,
  className = "",
}: {
  id: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
}) {
  const ref = useRef<HTMLTextAreaElement>(null);
  useEffect(() => {
    if (ref.current) {
      ref.current.style.height = "auto";
      ref.current.style.height = ref.current.scrollHeight + "px";
    }
  }, [value]);
  return (
    <textarea
      ref={ref}
      id={id}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      disabled={disabled}
      rows={1}
      className={cn(
        "w-full bg-transparent border-none outline-none resize-none overflow-hidden px-1.5 -mx-1.5 py-0.5 rounded-md transition-colors",
        disabled ? "cursor-not-allowed" : "hover:bg-gray-50 focus:bg-gray-50 focus:ring-2 focus:ring-[#DD4B4E]/30",
        className
      )}
    />
  );
}

// Next steps render as a real numbered list until clicked, then swap to a
// plain textarea (one step per line) for editing — reverts to the list on blur.
function NextStepsField({
  value,
  onChange,
  disabled,
}: {
  value: string;
  onChange: (v: string) => void;
  disabled?: boolean;
}) {
  const [editing, setEditing] = useState(false);
  const items = value.split("\n").map((s) => s.trim()).filter(Boolean);

  if (disabled) {
    return (
      <ol className="list-decimal list-inside text-sm text-gray-700 space-y-1">
        {items.map((s, i) => <li key={i}>{s}</li>)}
        {items.length === 0 && <p className="text-gray-400 text-sm">No next steps written yet.</p>}
      </ol>
    );
  }

  if (!editing) {
    return (
      <div onClick={() => setEditing(true)} className="cursor-text rounded-md px-1.5 -mx-1.5 py-0.5 hover:bg-gray-50 transition-colors">
        {items.length > 0 ? (
          <ol className="list-decimal list-inside text-sm text-gray-700 space-y-1">
            {items.map((s, i) => <li key={i}>{s}</li>)}
          </ol>
        ) : (
          <p className="text-gray-400 text-sm">Click to add recommended next steps, one per line...</p>
        )}
      </div>
    );
  }

  return (
    <textarea
      autoFocus
      value={value}
      onChange={(e) => onChange(e.target.value)}
      onBlur={() => setEditing(false)}
      rows={4}
      placeholder="One next step per line..."
      className="w-full bg-gray-50 border border-gray-200 rounded-md px-3 py-2 text-sm outline-none focus:border-[#DD4B4E] resize-none"
    />
  );
}

function ReportSection({ group }: { group: Group }) {
  const [report, setReport] = useState<GroupReport | null>(null);
  const [summary, setSummary] = useState("");
  const [insight, setInsight] = useState("");
  const [evolution, setEvolution] = useState("");
  const [steps, setSteps] = useState("");

  useEffect(() => {
    return onSnapshot(docIn("groupReports", group.id), (s) => {
      const data = s.exists() ? ({ id: s.id, ...s.data() } as GroupReport) : null;
      setReport(data);
      if (document.activeElement?.id !== "report-summary-box") setSummary(data?.executiveSummary || "");
      if (document.activeElement?.id !== "report-insight-box") setInsight(data?.keyInsight || "");
      if (document.activeElement?.id !== "report-evolution-box") setEvolution(data?.evolution || "");
      setSteps((data?.recommendedNextSteps || []).join("\n"));
    });
  }, [group.id]);

  const locked = report?.status === "approved";

  async function saveField(field: string, value: string, setter: (v: string) => void) {
    if (locked) return;
    setter(value);
    await updateDoc(docIn("groupReports", group.id), { [field]: value });
  }

  async function saveSteps(value: string) {
    if (locked) return;
    setSteps(value);
    await updateDoc(docIn("groupReports", group.id), {
      recommendedNextSteps: value.split("\n").map((s) => s.trim()).filter(Boolean),
    });
  }

  async function submitForApproval() {
    await updateDoc(docIn("groupReports", group.id), { status: "submitted" });
  }

  if (!report) {
    return <TabIntro>Your group's report hasn't been generated yet — check back once the admin has created it from their side.</TabIntro>;
  }

  return (
    <div>
      <TabIntro>
        This is your group's report, ready to edit right here — click into any line to change it, it saves as you go.
        Submit it for the admin's approval once it looks right.
      </TabIntro>

      <div className="flex items-center gap-2 mb-4">
        <Tag color={report.status === "approved" ? "green" : report.status === "submitted" ? "coral" : "default"}>
          {report.status === "approved" ? "Approved by admin" : report.status === "submitted" ? "Submitted — pending approval" : "Draft"}
        </Tag>
        {locked && <span className="text-xs text-gray-400">This report is approved and can no longer be edited.</span>}
      </div>

      <Card className="space-y-6">
        <div>
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-black text-[#14121F]">{group.name} — Workshop Report</h2>
            {!locked && (
              <span className="flex items-center gap-1 text-[10px] font-semibold text-gray-400 shrink-0 ml-3">
                <Pencil className="w-3 h-3" /> click to edit
              </span>
            )}
          </div>
          <DocField
            id="report-summary-box"
            value={summary}
            onChange={(v) => saveField("executiveSummary", v, setSummary)}
            placeholder="Executive summary..."
            disabled={locked}
            className="text-base text-gray-700 mt-2"
          />
        </div>

        <div className="border-l-4 border-[#3545A3] bg-[#3545A3]/5 rounded-r-lg p-4">
          <p className="text-[10px] font-bold uppercase tracking-widest text-[#3545A3] mb-1">Key insight</p>
          <DocField
            id="report-insight-box"
            value={insight}
            onChange={(v) => saveField("keyInsight", v, setInsight)}
            placeholder="The core strategic takeaway..."
            disabled={locked}
            className="text-sm text-[#14121F]"
          />
        </div>

        <div>
          <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-1">How their thinking evolved</p>
          <DocField
            id="report-evolution-box"
            value={evolution}
            onChange={(v) => saveField("evolution", v, setEvolution)}
            placeholder="How the board's feedback changed (or didn't) the group's answer..."
            disabled={locked}
            className="text-sm text-gray-700"
          />
        </div>

        <div>
          <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-1.5">Recommended next steps</p>
          <NextStepsField value={steps} onChange={saveSteps} disabled={locked} />
        </div>

        {!locked && report.status === "draft" && (
          <Btn variant="coral" onClick={submitForApproval}>Submit for approval</Btn>
        )}
        {!locked && report.status === "submitted" && (
          <p className="text-xs text-gray-400">Already submitted — you can keep editing, the admin sees your latest changes.</p>
        )}
      </Card>
    </div>
  );
}

function onboardingKey(workshopId: string, participantId: string) {
  return `fow_onboarded_${workshopId}_${participantId}`;
}

type TourTarget = "help" | "myGroup" | "groupInsight" | "workshop" | "report";

const ONBOARDING_SLIDES: { icon: any; title: string; body: string; target?: TourTarget }[] = [
  {
    icon: Sparkles,
    title: "Welcome, facilitator",
    body: "Quick tour of everything you'll use here — takes about a minute. You can reopen it anytime with the ? button.",
  },
  {
    icon: HelpCircle,
    title: "Come back anytime",
    body: "This button reopens the tour whenever you want a refresher — nothing to remember, it's always right here.",
    target: "help",
  },
  {
    icon: Users,
    title: "My group",
    body: "Tap here to see your group's members — who they are, what they told us in the pre-workshop survey, and how they're generally feeling about AI.",
    target: "myGroup",
  },
  {
    icon: Sparkles,
    title: "AI briefing on this group",
    body: "We use AI to read through their survey answers and give you a quick sense of how the group feels about AI as a whole, before you even start facilitating.",
    target: "groupInsight",
  },
  {
    icon: PlayCircle,
    title: "Workshop",
    body: "This is where the actual work happens — three quick activities that take your group from a first answer to a fully fleshed-out plan.",
    target: "workshop",
  },
  {
    icon: PlayCircle,
    title: "Moving between the steps",
    body: "Use the tabs at the top of this section to move between the 3 activities. A step you haven't reached yet stays locked, but once you're past one you can always tab back to review what was written.",
  },
  {
    icon: Pencil,
    title: "Step 1 — writing your answer",
    body: "Write your group's first answer to the challenge, then hit \u201cSubmit & continue\u201d once everyone agrees — you won't be able to change it after that, so make sure the group's on the same page first.",
  },
  {
    icon: Sparkles,
    title: "Step 2 — the board's response",
    body: "Once you submit, the C-level board's feedback is generated automatically — nothing to click. Just read their pushback and write your revised answer in response.",
  },
  {
    icon: FileBarChart,
    title: "Report",
    body: "Tap here once your group is done — the admin generates a closing report,",
    target: "report",
  },
  {
    icon: Pencil,
    title: "Editing the report",
    body: "The report reads like a normal document, but click any line and it becomes editable right there — like a Google Doc, it saves as you type. Submit it for the admin's approval once it's ready.",
  },
];

// Finds the on-screen (visible) element for a data-tour key — there are two
// candidates in the DOM (desktop sidebar + mobile bottom bar) but only one
// is actually rendered at a time, depending on the viewport.
function findVisibleTourTarget(key: string): HTMLElement | null {
  const els = document.querySelectorAll<HTMLElement>(`[data-tour="${key}"]`);
  for (const el of Array.from(els)) {
    const r = el.getBoundingClientRect();
    if (r.width > 0 && r.height > 0) return el;
  }
  return null;
}

function OnboardingWizard({
  name,
  onClose,
  onStepTarget,
}: {
  name: string;
  onClose: () => void;
  onStepTarget: (target?: TourTarget) => void;
}) {
  const [step, setStep] = useState(0);
  const [rect, setRect] = useState<DOMRect | null>(null);
  const slide = ONBOARDING_SLIDES[step];
  const Icon = slide.icon;
  const isLast = step === ONBOARDING_SLIDES.length - 1;
  const isDesktop = window.innerWidth >= 1024;

  useEffect(() => {
    onStepTarget(slide.target);
    if (!slide.target) {
      setRect(null);
      return;
    }
    function measure() {
      const el = findVisibleTourTarget(slide.target!);
      if (el) setRect(el.getBoundingClientRect());
    }
    measure();
    // small delay lets the section switch (and any layout shift) settle first
    const t = setTimeout(measure, 60);
    window.addEventListener("resize", measure);
    return () => { clearTimeout(t); window.removeEventListener("resize", measure); };
  }, [step]);

  const PAD = 6;
  const tooltipStyle: CSSProperties = {};
  if (rect) {
    if (isDesktop) {
      tooltipStyle.top = Math.min(rect.top, window.innerHeight - 260);
      tooltipStyle.left = rect.right + 16;
    } else {
      tooltipStyle.bottom = window.innerHeight - rect.top + 12;
      tooltipStyle.left = "50%";
      tooltipStyle.transform = "translateX(-50%)";
    }
  }

  return (
    <div className="fixed inset-0 z-50">
      {/* Dimmed backdrop with a cut-out spotlight around the target, if any */}
      {rect ? (
        <div
          className="fixed transition-all duration-200 pointer-events-none"
          style={{
            top: rect.top - PAD,
            left: rect.left - PAD,
            width: rect.width + PAD * 2,
            height: rect.height + PAD * 2,
            borderRadius: 12,
            boxShadow: "0 0 0 9999px rgba(0,0,0,0.65)",
          }}
        />
      ) : (
        <div className="fixed inset-0 bg-black/60" />
      )}

      {/* Tooltip / welcome card */}
      <div
        className={cn(
          "bg-white rounded-xl border border-gray-200 w-[calc(100vw-2rem)] max-w-sm p-6 relative",
          !rect && "fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2"
        )}
        style={rect ? { position: "fixed", ...tooltipStyle } : undefined}
      >
        <button onClick={onClose} className="absolute top-3 right-3 text-gray-300 hover:text-gray-500">
          <X className="w-4 h-4" />
        </button>

        <div className="w-10 h-10 rounded-lg roai-mark flex items-center justify-center mb-3">
          <Icon className="w-5 h-5 text-white" />
        </div>

        <h2 className="text-base font-black text-[#14121F] mb-1.5">
          {step === 0 ? slide.title.replace("facilitator", name) : slide.title}
        </h2>
        <p className="text-sm text-gray-600 leading-relaxed">{slide.body}</p>

        <div className="flex items-center justify-center gap-1.5 mt-4 mb-3">
          {ONBOARDING_SLIDES.map((_, i) => (
            <span key={i} className={cn("w-1.5 h-1.5 rounded-full", i === step ? "bg-[#DD4B4E]" : "bg-gray-200")} />
          ))}
        </div>

        <div className="flex items-center justify-between">
          <button onClick={onClose} className="text-xs font-semibold text-gray-400 hover:text-gray-600">
            Skip
          </button>
          <div className="flex items-center gap-2">
            {step > 0 && (
              <Btn variant="outline" onClick={() => setStep((s) => s - 1)} className="text-xs px-3 py-1.5">Back</Btn>
            )}
            <Btn variant="coral" onClick={() => (isLast ? onClose() : setStep((s) => s + 1))} className="text-xs px-3 py-1.5">
              {isLast ? "Get started" : "Next"}
            </Btn>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function ParticipantApp({ workshopId }: { workshopId: string }) {
  const [workshop, setWorkshop] = useState<Workshop | null>(null);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [participant, setParticipant] = useState<Participant | null>(null);
  const [challenges, setChallenges] = useState<Challenge[]>([]);
  const [responses, setResponses] = useState<SurveyResponse[]>([]);
  const [myGroup, setMyGroup] = useState<Group | null>(null);
  const [loading, setLoading] = useState(true);
  const [section, setSection] = useState<"myGroup" | "workshop" | "report">("workshop");
  const [showOnboarding, setShowOnboarding] = useState(false);

  useEffect(() => {
    if (!participant) return;
    if (!localStorage.getItem(onboardingKey(workshopId, participant.id))) {
      setShowOnboarding(true);
    }
  }, [participant?.id, workshopId]);

  function dismissOnboarding() {
    if (participant) localStorage.setItem(onboardingKey(workshopId, participant.id), "1");
    setShowOnboarding(false);
  }

  useEffect(() => {
    return onSnapshot(docIn("workshops", workshopId), (s) => {
      setWorkshop(s.exists() ? ({ id: s.id, ...s.data() } as Workshop) : null);
      setLoading(false);
    });
  }, [workshopId]);

  useEffect(() => {
    return onSnapshot(query(col.participants, where("workshopId", "==", workshopId)), (snap) => {
      setParticipants(snap.docs.map((d) => ({ id: d.id, ...d.data() } as Participant)));
    });
  }, [workshopId]);

  useEffect(() => {
    return onSnapshot(query(col.surveyResponses, where("workshopId", "==", workshopId)), (snap) => {
      setResponses(snap.docs.map((d) => ({ id: d.id, ...d.data() } as SurveyResponse)));
    });
  }, [workshopId]);

  useEffect(() => {
    if (participant || participants.length === 0) return;
    const savedId = localStorage.getItem(sessionKey(workshopId));
    if (savedId) {
      const found = participants.find((p) => p.id === savedId);
      if (found) setParticipant(found);
    }
  }, [participants, workshopId, participant]);

  useEffect(() => {
    if (!participant) return;
    const updated = participants.find((p) => p.id === participant.id);
    if (updated) setParticipant(updated);
  }, [participants, participant?.id]);

  useEffect(() => {
    if (!workshop) return;
    return onSnapshot(query(col.challenges, where("workshopId", "==", workshop.id)), (snap) => {
      setChallenges(snap.docs.map((d) => ({ id: d.id, ...d.data() } as Challenge)));
    });
  }, [workshop?.id]);

  useEffect(() => {
    if (!workshop || !participant) return;
    return onSnapshot(query(col.groups, where("workshopId", "==", workshop.id)), (snap) => {
      const found = snap.docs
        .map((d) => ({ id: d.id, ...d.data() } as Group))
        .find((g) => g.participantIds.includes(participant.id));
      setMyGroup(found || null);
    });
  }, [workshop?.id, participant?.id]);

  if (loading) return <Waiting message="Loading your workshop..." />;
  if (!workshop) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#FAFAFA] px-6">
        <p className="text-gray-500">This workshop link isn't valid.</p>
      </div>
    );
  }

  if (!participant) {
    const facilitators = participants.filter((p) => p.role === "facilitator");
    if (facilitators.length === 0) return <Waiting message="No facilitators have been assigned yet. Check back shortly." />;
    return <Login workshop={workshop} participants={facilitators} onLogin={setParticipant} />;
  }

  function logOut() {
    localStorage.removeItem(sessionKey(workshopId));
    setParticipant(null);
  }

  if (!myGroup) {
    return <Waiting message="You'll be assigned to a group shortly. Sit tight." />;
  }

  const groupChallenges = challenges.filter((c) => c.groupId === myGroup.id);
  const challenge = groupChallenges.find((c) => c.id === myGroup.challengeId);

  const navItems = [
    { key: "myGroup" as const, label: "My group", icon: Users },
    { key: "workshop" as const, label: "Workshop", icon: PlayCircle },
    { key: "report" as const, label: "Report", icon: FileBarChart },
  ];

  return (
    <div className="min-h-screen bg-white flex">
      {/* Mobile top bar */}
      <div className="lg:hidden fixed top-0 left-0 right-0 z-40 bg-white border-b border-gray-200 px-4 py-3 flex items-center justify-between">
        <ROAILogo size="sm" />
        <div className="flex items-center gap-3">
          <button data-tour="help" onClick={() => setShowOnboarding(true)} className="text-gray-400 hover:text-[#DD4B4E]" title="Show the quick tour">
            <HelpCircle className="w-4 h-4" />
          </button>
          <button onClick={logOut} className="text-xs font-semibold text-gray-500 hover:text-[#14121F] flex items-center gap-1">
            <LogOut className="w-3.5 h-3.5" /> Log out
          </button>
        </div>
      </div>

      {/* Desktop help button — floating top-right of the screen */}
      <button
        data-tour="help"
        onClick={() => setShowOnboarding(true)}
        title="Show the quick tour"
        className="hidden lg:flex fixed top-4 right-4 z-30 items-center justify-center w-8 h-8 rounded-full bg-white border border-gray-200 text-gray-400 hover:text-[#DD4B4E] hover:border-[#DD4B4E]/40"
      >
        <HelpCircle className="w-4 h-4" />
      </button>

      {/* Sidebar — desktop only */}
      <aside className="hidden lg:flex w-56 shrink-0 border-r border-gray-200 flex-col h-screen sticky top-0">
        <div className="p-5 border-b border-gray-200">
          <ROAILogo size="sm" />
        </div>
        <nav className="flex-1 p-3 space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const active = section === item.key;
            return (
              <button
                key={item.key}
                data-tour={item.key}
                onClick={() => setSection(item.key)}
                className={cn(
                  "w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-semibold transition-colors",
                  active ? "roai-mark text-white" : "text-gray-500 hover:bg-gray-50 hover:text-[#14121F]"
                )}
              >
                <Icon className="w-4 h-4" />
                {item.label}
              </button>
            );
          })}
        </nav>
        <div className="p-3 border-t border-gray-200">
          <button onClick={logOut} className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-semibold text-gray-500 hover:bg-gray-50 hover:text-[#14121F] text-left">
            <LogOut className="w-4 h-4" /> Log out
          </button>
        </div>
      </aside>

      {/* Bottom tab bar — mobile only */}
      <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-white border-t border-gray-200 flex items-stretch">
        {navItems.map((item) => {
          const Icon = item.icon;
          const active = section === item.key;
          return (
            <button
              key={item.key}
              data-tour={item.key}
              onClick={() => setSection(item.key)}
              className={cn(
                "flex-1 flex flex-col items-center justify-center gap-0.5 py-2 text-[10px] font-semibold transition-colors",
                active ? "text-[#DD4B4E]" : "text-gray-400"
              )}
            >
              <Icon className="w-5 h-5" />
              {item.label}
            </button>
          );
        })}
      </nav>

      {/* Main content */}
      <main className="flex-1 min-w-0 px-4 py-4 pt-20 pb-24 lg:px-8 lg:py-8 lg:pt-8 lg:pb-8">
        <div className="max-w-3xl">
          <div className="mb-6">
            <p className="text-xs font-semibold text-gray-400 mb-1">Welcome back, {participant.name}</p>
            <h1 className="text-2xl font-black text-[#14121F]">{myGroup.name}</h1>
          </div>

          {section === "myGroup" && <MyGroupSection group={myGroup} participants={participants} responses={responses} />}
          {section === "workshop" && (
            <WorkshopSection group={myGroup} challenge={challenge} groupChallenges={groupChallenges} workshop={workshop} />
          )}
          {section === "report" && <ReportSection group={myGroup} />}
        </div>
      </main>

      {showOnboarding && (
        <OnboardingWizard
          name={participant.name.split(" ")[0]}
          onClose={dismissOnboarding}
          onStepTarget={(target) => {
            if (target === "groupInsight") setSection("myGroup");
            else if (target === "myGroup" || target === "workshop" || target === "report") setSection(target);
          }}
        />
      )}
    </div>
  );
}
