import { useEffect, useMemo, useState } from "react";
import { onSnapshot, query, setDoc, updateDoc, where } from "firebase/firestore";
import { CheckCircle2, FileBarChart, LogOut, Loader2, PlayCircle, Users } from "lucide-react";
import { col, docIn } from "../firebase";
import { Accordion, Btn, Card, FacilitatorBadge, ROAILogo, StepTabs, Tag, TabIntro, TextArea } from "../ui";
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
  const members = group.participantIds
    .map((id) => participants.find((p) => p.id === id))
    .filter(Boolean) as Participant[];

  return (
    <div>
      <TabIntro>
        Your group's members and the survey answers they gave before the workshop — useful background before you dive in.
      </TabIntro>
      <div className="space-y-2">
        {members.map((m) => {
          const r = responses.find((r) => r.participantId === m.id);
          return (
            <Accordion
              key={m.id}
              title={
                <span className="flex items-center gap-2">
                  {m.name}
                  {m.role === "facilitator" && <FacilitatorBadge />}
                </span>
              }
              subtitle={m.email || undefined}
              right={r ? <Tag color="green">survey on file</Tag> : <Tag>no survey</Tag>}
            >
              {r ? (
                <div className="space-y-2 text-xs text-gray-600">
                  <div><span className="font-semibold text-gray-400 uppercase tracking-wide text-[10px]">AI relationship: </span>{r.aiRelationship}</div>
                  <div><span className="font-semibold text-gray-400 uppercase tracking-wide text-[10px]">Future vision: </span>{r.futureVision}</div>
                  <div><span className="font-semibold text-gray-400 uppercase tracking-wide text-[10px]">Opportunities/challenges: </span>{r.opportunitiesChallenges}</div>
                </div>
              ) : (
                <p className="text-xs text-gray-400">No survey answers on file for this participant.</p>
              )}
            </Accordion>
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
      <TabIntro>{challenge?.description}</TabIntro>

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
      if (document.activeElement?.id !== "report-steps-box") setSteps((data?.recommendedNextSteps || []).join("\n"));
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
        Review your group's closing report and edit anything that needs a tweak, then submit it for the admin's approval.
      </TabIntro>

      <div className="flex items-center gap-2 mb-4">
        <Tag color={report.status === "approved" ? "green" : report.status === "submitted" ? "coral" : "default"}>
          {report.status === "approved" ? "Approved by admin" : report.status === "submitted" ? "Submitted — pending approval" : "Draft"}
        </Tag>
        {locked && <span className="text-xs text-gray-400">This report is approved and can no longer be edited.</span>}
      </div>

      <Card className="space-y-3">
        <TextArea
          label="Executive summary"
          value={summary}
          onChange={(v) => saveField("executiveSummary", v, setSummary)}
          rows={3}
          disabled={locked}
        />
        <TextArea
          label="Key insight"
          value={insight}
          onChange={(v) => saveField("keyInsight", v, setInsight)}
          rows={2}
          disabled={locked}
        />
        <TextArea
          label="How your thinking evolved"
          value={evolution}
          onChange={(v) => saveField("evolution", v, setEvolution)}
          rows={3}
          disabled={locked}
        />
        <TextArea
          label="Recommended next steps (one per line)"
          value={steps}
          onChange={saveSteps}
          rows={4}
          disabled={locked}
        />
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

export default function ParticipantApp({ workshopId }: { workshopId: string }) {
  const [workshop, setWorkshop] = useState<Workshop | null>(null);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [participant, setParticipant] = useState<Participant | null>(null);
  const [challenges, setChallenges] = useState<Challenge[]>([]);
  const [responses, setResponses] = useState<SurveyResponse[]>([]);
  const [myGroup, setMyGroup] = useState<Group | null>(null);
  const [loading, setLoading] = useState(true);
  const [section, setSection] = useState<"myGroup" | "workshop" | "report">("workshop");

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
        <button onClick={logOut} className="text-xs font-semibold text-gray-500 hover:text-[#14121F] flex items-center gap-1">
          <LogOut className="w-3.5 h-3.5" /> Log out
        </button>
      </div>

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
    </div>
  );
}
