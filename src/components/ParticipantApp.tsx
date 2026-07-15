import { useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import { addDoc, doc, onSnapshot, query, setDoc, updateDoc, where } from "firebase/firestore";
import { CheckCircle2, Loader2 } from "lucide-react";
import { col, db, docIn } from "../firebase";
import { SURVEY_QUESTIONS } from "../types";
import type {
  BoardChallenge,
  Challenge,
  Commitment,
  Group,
  GroupSolution,
  Participant,
  Workshop,
} from "../types";

function Card({ children }: { children: ReactNode }) {
  return <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-6 space-y-4">{children}</div>;
}

function ChoiceQuestion({
  label,
  options,
  value,
  onChange,
}: {
  label: string;
  options: readonly string[];
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div className="space-y-2">
      <p className="font-medium text-slate-100">{label}</p>
      <div className="grid gap-2">
        {options.map((opt) => (
          <button
            key={opt}
            onClick={() => onChange(opt)}
            className={`text-left px-4 py-2 rounded-lg border text-sm transition ${
              value === opt
                ? "bg-sky-500/20 border-sky-500 text-sky-200"
                : "bg-slate-800/50 border-slate-700 text-slate-300 hover:border-slate-500"
            }`}
          >
            {opt}
          </button>
        ))}
      </div>
    </div>
  );
}

function SurveyForm({ participant, workshop }: { participant: Participant; workshop: Workshop }) {
  const [orgSize, setOrgSize] = useState("");
  const [aiRelationship, setAiRelationship] = useState("");
  const [biggestConcern, setBiggestConcern] = useState("");
  const [futureOfWorkView, setFutureOfWorkView] = useState("");
  const [moveTimeline, setMoveTimeline] = useState("");
  const [futureVision, setFutureVision] = useState("");
  const [ownershipPreference, setOwnershipPreference] = useState("");
  const [employeeFreedom, setEmployeeFreedom] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const complete =
    orgSize &&
    aiRelationship &&
    biggestConcern &&
    futureOfWorkView.trim().length > 0 &&
    moveTimeline &&
    futureVision &&
    ownershipPreference &&
    employeeFreedom;

  async function submit() {
    setSubmitting(true);
    try {
      await addDoc(col.surveyResponses, {
        participantId: participant.id,
        workshopId: workshop.id,
        orgSize,
        aiRelationship,
        biggestConcern,
        futureOfWorkView,
        moveTimeline,
        futureVision,
        ownershipPreference,
        employeeFreedom,
        createdAt: new Date().toISOString(),
      });
      await updateDoc(docIn("participants", participant.id), { status: "survey_done" });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6 py-10 px-4">
      <div className="text-center space-y-1">
        <div className="text-sm uppercase tracking-[0.3em] text-sky-400">ROAI Institute</div>
        <h1 className="text-2xl font-semibold">Pre-work survey</h1>
        <p className="text-slate-400 text-sm">{workshop.name} — a few questions before we meet.</p>
      </div>
      <Card>
        <ChoiceQuestion
          label={"Q1 — " + SURVEY_QUESTIONS.orgSize.label}
          options={SURVEY_QUESTIONS.orgSize.options}
          value={orgSize}
          onChange={setOrgSize}
        />
      </Card>
      <Card>
        <ChoiceQuestion
          label={"Q2 — " + SURVEY_QUESTIONS.aiRelationship.label}
          options={SURVEY_QUESTIONS.aiRelationship.options}
          value={aiRelationship}
          onChange={setAiRelationship}
        />
      </Card>
      <Card>
        <ChoiceQuestion
          label={"Q3 — " + SURVEY_QUESTIONS.biggestConcern.label}
          options={SURVEY_QUESTIONS.biggestConcern.options}
          value={biggestConcern}
          onChange={setBiggestConcern}
        />
      </Card>
      <Card>
        <p className="font-medium text-slate-100">{"Q4 — " + SURVEY_QUESTIONS.futureOfWorkView.label}</p>
        <textarea
          value={futureOfWorkView}
          onChange={(e) => setFutureOfWorkView(e.target.value)}
          rows={4}
          className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm"
          placeholder="Share your thoughts..."
        />
      </Card>
      <Card>
        <ChoiceQuestion
          label={"Q5 — " + SURVEY_QUESTIONS.moveTimeline.label}
          options={SURVEY_QUESTIONS.moveTimeline.options}
          value={moveTimeline}
          onChange={setMoveTimeline}
        />
      </Card>
      <Card>
        <ChoiceQuestion
          label={"Q6 — " + SURVEY_QUESTIONS.futureVision.label}
          options={SURVEY_QUESTIONS.futureVision.options}
          value={futureVision}
          onChange={setFutureVision}
        />
      </Card>
      <Card>
        <ChoiceQuestion
          label={"Q7 — " + SURVEY_QUESTIONS.ownershipPreference.label}
          options={SURVEY_QUESTIONS.ownershipPreference.options}
          value={ownershipPreference}
          onChange={setOwnershipPreference}
        />
      </Card>
      <Card>
        <ChoiceQuestion
          label={"Q8 — " + SURVEY_QUESTIONS.employeeFreedom.label}
          options={SURVEY_QUESTIONS.employeeFreedom.options}
          value={employeeFreedom}
          onChange={setEmployeeFreedom}
        />
      </Card>
      <button
        onClick={submit}
        disabled={!complete || submitting}
        className="w-full bg-sky-500 hover:bg-sky-400 disabled:opacity-40 disabled:cursor-not-allowed text-slate-950 font-medium rounded-lg px-4 py-3"
      >
        {submitting ? <Loader2 className="animate-spin inline w-4 h-4" /> : "Submit survey"}
      </button>
    </div>
  );
}

function Waiting({ message }: { message: string }) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-[#0b1220] text-slate-100 px-6">
      <div className="max-w-md text-center space-y-3">
        <Loader2 className="animate-spin w-6 h-6 mx-auto text-sky-400" />
        <p className="text-slate-300">{message}</p>
      </div>
    </div>
  );
}

function ChallengeSelection({
  participant,
  workshop,
  challenges,
}: {
  participant: Participant;
  workshop: Workshop;
  challenges: Challenge[];
}) {
  const [selected, setSelected] = useState<string | null>(null);
  const [signupId, setSignupId] = useState<string | null>(null);

  useEffect(() => {
    return onSnapshot(query(col.groupSignups, where("participantId", "==", participant.id)), (snap) => {
      const d = snap.docs[0];
      if (d) {
        setSignupId(d.id);
        setSelected((d.data() as any).challengeId);
      }
    });
  }, [participant.id]);

  async function choose(challengeId: string) {
    setSelected(challengeId);
    if (signupId) {
      await updateDoc(docIn("groupSignups", signupId), { challengeId });
    } else {
      const ref = await addDoc(col.groupSignups, {
        workshopId: workshop.id,
        challengeId,
        participantId: participant.id,
        createdAt: new Date().toISOString(),
      });
      setSignupId(ref.id);
    }
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6 py-10 px-4">
      <div className="text-center space-y-1">
        <div className="text-sm uppercase tracking-[0.3em] text-sky-400">ROAI Institute</div>
        <h1 className="text-2xl font-semibold">Pick your challenge</h1>
        <p className="text-slate-400 text-sm">Choose the challenge you want to work on in a small group (max 4 people).</p>
      </div>
      <div className="space-y-3">
        {challenges.map((c) => (
          <button
            key={c.id}
            onClick={() => choose(c.id)}
            className={`w-full text-left rounded-2xl border p-5 transition ${
              selected === c.id ? "bg-sky-500/10 border-sky-500" : "bg-slate-900/60 border-slate-800 hover:border-slate-600"
            }`}
          >
            <div className="font-medium text-slate-100">{c.title}</div>
            <p className="text-sm text-slate-400 mt-1">{c.description}</p>
          </button>
        ))}
      </div>
      {selected && (
        <p className="text-center text-emerald-400 text-sm flex items-center justify-center gap-1">
          <CheckCircle2 className="w-4 h-4" /> You're signed up. You can change your choice until groups are locked.
        </p>
      )}
    </div>
  );
}

function GroupWorkspace({
  group,
  challenge,
  workshop,
}: {
  group: Group;
  challenge: Challenge | undefined;
  workshop: Workshop;
}) {
  const [solutionText, setSolutionText] = useState("");
  const [board, setBoard] = useState<BoardChallenge | null>(null);

  useEffect(() => {
    return onSnapshot(docIn("groupSolutions", group.id), (s) => {
      const data = s.data() as GroupSolution | undefined;
      setSolutionText((current) => (data?.solution !== undefined && document.activeElement?.id !== "solution-box" ? data.solution : current));
    });
  }, [group.id]);

  useEffect(() => {
    return onSnapshot(docIn("boardChallenges", group.id), (s) => {
      setBoard(s.exists() ? ({ id: s.id, ...s.data() } as BoardChallenge) : null);
    });
  }, [group.id]);

  async function save(text: string) {
    setSolutionText(text);
    await setDoc(docIn("groupSolutions", group.id), {
      groupId: group.id,
      workshopId: workshop.id,
      solution: text,
      updatedAt: new Date().toISOString(),
    });
  }

  return (
    <Card>
      <div>
        <p className="text-xs uppercase tracking-wide text-sky-400">Your group</p>
        <h2 className="text-xl font-semibold">{group.name}</h2>
        {challenge && <p className="text-slate-400 text-sm mt-1">{challenge.description}</p>}
      </div>
      <div>
        <p className="text-sm text-slate-300 mb-1">Write your group's answer together (shared live with your teammates):</p>
        <textarea
          id="solution-box"
          value={solutionText}
          onChange={(e) => save(e.target.value)}
          rows={8}
          className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm"
          placeholder="Type your group's answer here..."
        />
      </div>
      {board && (
        <div>
          <p className="text-sm text-slate-300 mb-2">The board is challenging your answer:</p>
          <div className="grid sm:grid-cols-2 gap-2">
            {board.personaChallenges.map((pc, i) => (
              <div key={i} className="bg-slate-800/60 rounded-lg p-3 text-sm">
                <div className="text-sky-400 font-semibold">{pc.role}</div>
                <div className="text-slate-300">{pc.objection}</div>
              </div>
            ))}
          </div>
        </div>
      )}
    </Card>
  );
}

function CommitmentForm({ participant, workshop }: { participant: Participant; workshop: Workshop }) {
  const [action, setAction] = useState("");
  const [existing, setExisting] = useState<Commitment | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    return onSnapshot(query(col.commitments, where("participantId", "==", participant.id)), (snap) => {
      const d = snap.docs[0];
      if (d) {
        const data = { id: d.id, ...d.data() } as Commitment;
        setExisting(data);
        setAction(data.action);
      }
    });
  }, [participant.id]);

  async function submit() {
    if (!action.trim()) return;
    setSubmitting(true);
    try {
      if (existing) {
        await updateDoc(docIn("commitments", existing.id), { action });
      } else {
        await addDoc(col.commitments, {
          participantId: participant.id,
          workshopId: workshop.id,
          action,
          createdAt: new Date().toISOString(),
        });
      }
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Card>
      <p className="text-xs uppercase tracking-wide text-sky-400">Step 5 — your commitment</p>
      <h2 className="text-xl font-semibold">What will you do in the next 30 days?</h2>
      <p className="text-slate-400 text-sm">
        Based on today's discussion, write down ONE concrete action you personally commit to taking in the next 30 days.
      </p>
      <textarea
        value={action}
        onChange={(e) => setAction(e.target.value)}
        rows={4}
        className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm"
        placeholder="In the next 30 days, I will..."
      />
      <button
        onClick={submit}
        disabled={submitting || !action.trim()}
        className="bg-sky-500 hover:bg-sky-400 disabled:opacity-40 text-slate-950 font-medium rounded-lg px-4 py-2 text-sm"
      >
        {existing ? "Update commitment" : "Submit commitment"}
      </button>
      {existing && <p className="text-emerald-400 text-xs flex items-center gap-1"><CheckCircle2 className="w-3.5 h-3.5" /> Saved</p>}
    </Card>
  );
}

export default function ParticipantApp({ token }: { token: string }) {
  const [participant, setParticipant] = useState<Participant | null>(null);
  const [workshop, setWorkshop] = useState<Workshop | null>(null);
  const [surveyDone, setSurveyDone] = useState<boolean | null>(null);
  const [challenges, setChallenges] = useState<Challenge[]>([]);
  const [myGroup, setMyGroup] = useState<Group | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    return onSnapshot(query(col.participants, where("token", "==", token)), (snap) => {
      const d = snap.docs[0];
      if (!d) {
        setNotFound(true);
        setLoading(false);
        return;
      }
      setParticipant({ id: d.id, ...d.data() } as Participant);
    });
  }, [token]);

  useEffect(() => {
    if (!participant) return;
    return onSnapshot(docIn("workshops", participant.workshopId), (s) => {
      setWorkshop(s.exists() ? ({ id: s.id, ...s.data() } as Workshop) : null);
      setLoading(false);
    });
  }, [participant?.workshopId]);

  useEffect(() => {
    if (!participant) return;
    return onSnapshot(query(col.surveyResponses, where("participantId", "==", participant.id)), (snap) => {
      setSurveyDone(snap.docs.length > 0);
    });
  }, [participant?.id]);

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
  if (notFound || !participant) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0b1220] text-slate-100 px-6">
        <p className="text-slate-400">This link isn't valid. Please check the link you received.</p>
      </div>
    );
  }
  if (!workshop) return <Waiting message="Workshop not found." />;

  if (!surveyDone) return <SurveyForm participant={participant} workshop={workshop} />;

  if (workshop.status === "survey" || workshop.status === "challenges_ready") {
    return <Waiting message="Thanks! We'll open group selection shortly. Sit tight." />;
  }

  if (workshop.status === "groups_open" && !myGroup) {
    return <ChallengeSelection participant={participant} workshop={workshop} challenges={challenges} />;
  }

  const challenge = myGroup ? challenges.find((c) => c.id === myGroup.challengeId) : undefined;

  return (
    <div className="max-w-2xl mx-auto space-y-6 py-10 px-4">
      <div className="text-center space-y-1">
        <div className="text-sm uppercase tracking-[0.3em] text-sky-400">ROAI Institute</div>
        <h1 className="text-2xl font-semibold">{workshop.name}</h1>
        <p className="text-slate-400 text-sm">Welcome back, {participant.name}.</p>
      </div>

      {myGroup ? (
        <GroupWorkspace group={myGroup} challenge={challenge} workshop={workshop} />
      ) : (
        <Card>
          <p className="text-slate-400 text-sm">Groups are being finalized — check back in a moment.</p>
        </Card>
      )}

      {workshop.status === "commitments" && <CommitmentForm participant={participant} workshop={workshop} />}
      {workshop.status === "closed" && (
        <Card>
          <p className="text-emerald-400 text-sm">Thank you for participating in the workshop!</p>
        </Card>
      )}
    </div>
  );
}
