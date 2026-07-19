import { useEffect, useMemo, useState } from "react";
import { onSnapshot, query, setDoc, updateDoc, where } from "firebase/firestore";
import { LogOut, Loader2 } from "lucide-react";
import { col, docIn } from "../firebase";
import { Btn, Card, ROAILogo, Tag } from "../ui";
import { GROUP_STEP_LABELS } from "../types";
import type {
  BoardChallenge,
  Challenge,
  Group,
  GroupSolution,
  Participant,
  Workshop,
} from "../types";

function sessionKey(workshopId: string) {
  return `fow_session_${workshopId}`;
}

async function generateBoardChallenge(challenge: Challenge, solution: string, groupName: string) {
  const res = await fetch("/api/generate-board-challenge", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      challenge: { title: challenge.title, description: challenge.description },
      solution,
      groupName,
    }),
  });
  if (!res.ok) throw new Error((await res.json()).error || "Request failed");
  return res.json();
}

function Waiting({ message }: { message: string }) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-[#F4F6FB] px-6">
      <div className="max-w-md text-center space-y-4">
        <Loader2 className="animate-spin w-6 h-6 mx-auto text-[#E8503A]" />
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
    <div className="min-h-screen bg-[#F4F6FB] flex items-center justify-center px-6">
      <div className="max-w-sm w-full space-y-6">
        <div className="flex justify-center"><ROAILogo size="lg" /></div>
        <Card className="space-y-4">
          <div className="text-center space-y-1">
            <h1 className="text-xl font-black text-[#0A0E2A]">{workshop.name}</h1>
            <p className="text-gray-400 text-sm">Facilitator access — find your name to enter your group.</p>
          </div>
          <div>
            <label className="block text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-1.5">Your name</label>
            <select
              value={selectedId}
              onChange={(e) => setSelectedId(e.target.value)}
              className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-[#E8503A]"
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
              className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-[#E8503A]"
            />
          </div>
          {error && <p className="text-red-500 text-sm font-medium">{error}</p>}
          <Btn variant="coral" onClick={submit} loading={submitting} className="w-full justify-center">Enter</Btn>
        </Card>
      </div>
    </div>
  );
}

function ChallengePicker({
  group,
  challenges,
  canSelect,
}: {
  group: Group;
  challenges: Challenge[];
  canSelect: boolean;
}) {
  async function select(challengeId: string) {
    for (const c of challenges) {
      await updateDoc(docIn("challenges", c.id), { status: c.id === challengeId ? "selected" : "option" });
    }
    await updateDoc(docIn("groups", group.id), { challengeId });
  }

  return (
    <div className="min-h-screen bg-[#F4F6FB] py-10 px-4">
      <div className="max-w-2xl mx-auto space-y-6">
        <div className="text-center space-y-3">
          <div className="flex justify-center"><ROAILogo size="md" /></div>
          <h1 className="text-2xl font-black text-[#0A0E2A]">Pick your challenge</h1>
          <p className="text-gray-400 text-sm">
            {canSelect
              ? "As facilitator, choose the challenge your group will work on."
              : "Your facilitator is choosing the challenge your group will work on."}
          </p>
        </div>
        <div className="space-y-3">
          {challenges.map((c) => (
            <div key={c.id} className="rounded-2xl border p-5 bg-white border-gray-200">
              <div className="font-bold text-[#0A0E2A]">{c.title}</div>
              <p className="text-sm text-gray-500 mt-1">{c.description}</p>
              {canSelect && (
                <Btn variant="coral" className="mt-3 text-xs px-3 py-1.5" onClick={() => select(c.id)}>Select this challenge</Btn>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function GroupWorkspace({
  group,
  challenge,
  workshop,
  isFacilitator,
}: {
  group: Group;
  challenge: Challenge | undefined;
  workshop: Workshop;
  isFacilitator: boolean;
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

  const step = group.currentStep || "initial";

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
    if (step !== "board" || !isFacilitator || board || generatingBoard || !challenge) return;
    if (!solutionDoc?.initialSolution) return;
    setGeneratingBoard(true);
    generateBoardChallenge(challenge, solutionDoc.initialSolution, group.name)
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
  }, [step, isFacilitator, board, challenge, solutionDoc?.initialSolution]);

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

  return (
    <Card className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <Tag color="coral">Your group</Tag>
          <h2 className="text-xl font-black text-[#0A0E2A] mt-2">{group.name}</h2>
          {challenge && <p className="text-gray-500 text-sm mt-1">{challenge.description}</p>}
        </div>
        {step !== "done" && (
          <div className="text-right">
            <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400">{GROUP_STEP_LABELS[step]}</p>
          </div>
        )}
      </div>

      {/* Step 1: Initial answer */}
      {step === "initial" && (
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400">Question 1 — Initial answer</p>
          </div>
          {isFacilitator ? (
            <div className="space-y-2">
              <textarea
                id="initial-box"
                value={initialSolution}
                onChange={(e) => saveField("initialSolution", e.target.value, setInitialSolution)}
                rows={7}
                className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-[#E8503A] resize-none"
                placeholder="Write your group's answer here..."
              />
              <Btn variant="coral" onClick={submitInitial} loading={saving} disabled={!initialSolution.trim()}>
                Submit & continue
              </Btn>
            </div>
          ) : (
            <p className="text-sm text-[#0A0E2A] bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 whitespace-pre-wrap min-h-[3rem]">
              {initialSolution || "Your facilitator hasn't written an answer yet."}
            </p>
          )}
        </div>
      )}

      {/* Step 2: Board challenge + revised answer */}
      {step === "board" && (
        <>
          <div>
            <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-1.5">Your initial answer</p>
            <p className="text-sm text-[#0A0E2A] bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 whitespace-pre-wrap">{initialSolution}</p>
          </div>

          {!board ? (
            <p className="text-sm text-gray-400 flex items-center gap-2"><Loader2 className="w-4 h-4 animate-spin" /> The board is reviewing your answer...</p>
          ) : (
            <div>
              <p className="text-[10px] font-bold uppercase tracking-widest text-[#E8503A] mb-2">The C-level board is challenging your answer</p>
              <div className="grid sm:grid-cols-2 gap-2">
                {board.personaChallenges.map((pc, i) => (
                  <div key={i} className="bg-[#0A0E2A] rounded-xl p-3 text-sm">
                    <div className="text-[#E8503A] font-bold text-xs uppercase tracking-widest mb-1">{pc.role}</div>
                    <div className="text-white/90">{pc.objection}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {board && (
            <div>
              <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-1.5">Revised answer</p>
              {isFacilitator ? (
                <div className="space-y-2">
                  <textarea
                    id="revised-box"
                    value={revisedSolution}
                    onChange={(e) => saveField("revisedSolution", e.target.value, setRevisedSolution)}
                    rows={6}
                    className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-[#E8503A] resize-none"
                    placeholder="How does your group respond to the board's pushback?"
                  />
                  <Btn variant="coral" onClick={submitRevised} loading={saving} disabled={!revisedSolution.trim()}>
                    Submit & continue
                  </Btn>
                </div>
              ) : (
                <p className="text-sm text-[#0A0E2A] bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 whitespace-pre-wrap min-h-[3rem]">
                  {revisedSolution || "Your facilitator hasn't written a revised answer yet."}
                </p>
              )}
            </div>
          )}
        </>
      )}

      {/* Step 3: 30/60/90-day actions */}
      {step === "actions" && (
        <div className="space-y-4">
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
              {isFacilitator ? (
                <textarea
                  id={`${f.id}-box`}
                  value={f.value}
                  onChange={(e) => saveField(f.id, e.target.value, f.setter)}
                  rows={3}
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-[#E8503A] resize-none"
                />
              ) : (
                <p className="text-sm text-[#0A0E2A] bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 whitespace-pre-wrap min-h-[2.5rem]">
                  {f.value || "Not written yet."}
                </p>
              )}
            </div>
          ))}
          {isFacilitator && (
            <Btn variant="coral" onClick={submitActions} loading={saving} disabled={!action30.trim() && !action60.trim() && !action90.trim()}>
              Submit & finish
            </Btn>
          )}
        </div>
      )}

      {/* Done */}
      {step === "done" && (
        <div className="space-y-4">
          <p className="text-green-600 text-sm font-medium">Your group has completed all the activities. Nice work!</p>
          <div className="space-y-3 text-sm">
            <div><p className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-1">Initial answer</p><p className="text-gray-600 whitespace-pre-wrap">{initialSolution}</p></div>
            <div><p className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-1">Revised answer</p><p className="text-gray-600 whitespace-pre-wrap">{revisedSolution}</p></div>
            <div><p className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-1">30 days</p><p className="text-gray-600 whitespace-pre-wrap">{action30}</p></div>
            <div><p className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-1">60 days</p><p className="text-gray-600 whitespace-pre-wrap">{action60}</p></div>
            <div><p className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-1">90 days</p><p className="text-gray-600 whitespace-pre-wrap">{action90}</p></div>
          </div>
        </div>
      )}
    </Card>
  );
}

export default function ParticipantApp({ workshopId }: { workshopId: string }) {
  const [workshop, setWorkshop] = useState<Workshop | null>(null);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [participant, setParticipant] = useState<Participant | null>(null);
  const [challenges, setChallenges] = useState<Challenge[]>([]);
  const [myGroup, setMyGroup] = useState<Group | null>(null);
  const [loading, setLoading] = useState(true);

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
      <div className="min-h-screen flex items-center justify-center bg-[#F4F6FB] px-6">
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
  const isFacilitator = participant.role === "facilitator";

  if (!myGroup.challengeId) {
    if (groupChallenges.length === 0) {
      return <Waiting message="Your challenge options are being prepared. Sit tight." />;
    }
    return <ChallengePicker group={myGroup} challenges={groupChallenges} canSelect={isFacilitator} />;
  }

  if (workshop.status === "setup") {
    return <Waiting message="Your challenge is set — the workshop hasn't started yet. Sit tight." />;
  }

  const challenge = groupChallenges.find((c) => c.id === myGroup.challengeId);

  return (
    <div className="min-h-screen bg-[#F4F6FB] py-10 px-4">
      <div className="max-w-2xl mx-auto space-y-6">
        <div className="text-center space-y-2">
          <div className="flex justify-center"><ROAILogo size="md" /></div>
          <h1 className="text-2xl font-black text-[#0A0E2A]">{workshop.name}</h1>
          <p className="text-gray-400 text-sm flex items-center justify-center gap-2">
            Welcome back, {participant.name}.
            <button onClick={logOut} className="text-[#E8503A] font-bold inline-flex items-center gap-1">
              <LogOut className="w-3.5 h-3.5" /> Log out
            </button>
          </p>
        </div>

        <GroupWorkspace group={myGroup} challenge={challenge} workshop={workshop} isFacilitator={isFacilitator} />
      </div>
    </div>
  );
}
