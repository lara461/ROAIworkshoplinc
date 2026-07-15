import { useEffect, useState } from "react";
import { addDoc, onSnapshot, query, setDoc, updateDoc, where } from "firebase/firestore";
import { CheckCircle2, Loader2 } from "lucide-react";
import { col, docIn } from "../firebase";
import { SURVEY_QUESTIONS } from "../types";
import { Btn, Card, ROAILogo, Tag } from "../ui";
import type {
  BoardChallenge,
  Challenge,
  Commitment,
  Group,
  GroupSolution,
  Participant,
  Workshop,
} from "../types";

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
      <p className="font-bold text-[#0A0E2A]">{label}</p>
      <div className="grid gap-2">
        {options.map((opt) => (
          <button
            key={opt}
            onClick={() => onChange(opt)}
            className={`text-left px-4 py-2.5 rounded-xl border text-sm transition-all ${
              value === opt
                ? "bg-[#E8503A]/5 border-[#E8503A] text-[#0A0E2A] font-medium"
                : "bg-gray-50 border-gray-200 text-gray-600 hover:border-[#E8503A]/40"
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
    <div className="min-h-screen bg-[#F4F6FB] py-10 px-4">
      <div className="max-w-2xl mx-auto space-y-6">
        <div className="text-center space-y-3">
          <div className="flex justify-center"><ROAILogo size="md" /></div>
          <h1 className="text-2xl font-black text-[#0A0E2A]">Pre-work survey</h1>
          <p className="text-gray-400 text-sm">{workshop.name} — a few questions before we meet.</p>
        </div>
        <Card><ChoiceQuestion label={"Q1 — " + SURVEY_QUESTIONS.orgSize.label} options={SURVEY_QUESTIONS.orgSize.options} value={orgSize} onChange={setOrgSize} /></Card>
        <Card><ChoiceQuestion label={"Q2 — " + SURVEY_QUESTIONS.aiRelationship.label} options={SURVEY_QUESTIONS.aiRelationship.options} value={aiRelationship} onChange={setAiRelationship} /></Card>
        <Card><ChoiceQuestion label={"Q3 — " + SURVEY_QUESTIONS.biggestConcern.label} options={SURVEY_QUESTIONS.biggestConcern.options} value={biggestConcern} onChange={setBiggestConcern} /></Card>
        <Card>
          <p className="font-bold text-[#0A0E2A] mb-2">{"Q4 — " + SURVEY_QUESTIONS.futureOfWorkView.label}</p>
          <textarea
            value={futureOfWorkView}
            onChange={(e) => setFutureOfWorkView(e.target.value)}
            rows={4}
            className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-[#E8503A] resize-none"
            placeholder="Share your thoughts..."
          />
        </Card>
        <Card><ChoiceQuestion label={"Q5 — " + SURVEY_QUESTIONS.moveTimeline.label} options={SURVEY_QUESTIONS.moveTimeline.options} value={moveTimeline} onChange={setMoveTimeline} /></Card>
        <Card><ChoiceQuestion label={"Q6 — " + SURVEY_QUESTIONS.futureVision.label} options={SURVEY_QUESTIONS.futureVision.options} value={futureVision} onChange={setFutureVision} /></Card>
        <Card><ChoiceQuestion label={"Q7 — " + SURVEY_QUESTIONS.ownershipPreference.label} options={SURVEY_QUESTIONS.ownershipPreference.options} value={ownershipPreference} onChange={setOwnershipPreference} /></Card>
        <Card><ChoiceQuestion label={"Q8 — " + SURVEY_QUESTIONS.employeeFreedom.label} options={SURVEY_QUESTIONS.employeeFreedom.options} value={employeeFreedom} onChange={setEmployeeFreedom} /></Card>
        <Btn variant="coral" onClick={submit} disabled={!complete} loading={submitting} className="w-full justify-center">
          Submit survey
        </Btn>
      </div>
    </div>
  );
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
    <div className="min-h-screen bg-[#F4F6FB] py-10 px-4">
      <div className="max-w-2xl mx-auto space-y-6">
        <div className="text-center space-y-3">
          <div className="flex justify-center"><ROAILogo size="md" /></div>
          <h1 className="text-2xl font-black text-[#0A0E2A]">Pick your challenge</h1>
          <p className="text-gray-400 text-sm">Choose the challenge you want to work on in a small group (max 4 people).</p>
        </div>
        <div className="space-y-3">
          {challenges.map((c) => (
            <button
              key={c.id}
              onClick={() => choose(c.id)}
              className={`w-full text-left rounded-2xl border p-5 transition-all ${
                selected === c.id ? "bg-[#E8503A]/5 border-[#E8503A]" : "bg-white border-gray-200 hover:border-[#E8503A]/40"
              }`}
            >
              <div className="font-bold text-[#0A0E2A]">{c.title}</div>
              <p className="text-sm text-gray-500 mt-1">{c.description}</p>
            </button>
          ))}
        </div>
        {selected && (
          <p className="text-center text-green-600 text-sm font-medium flex items-center justify-center gap-1.5">
            <CheckCircle2 className="w-4 h-4" /> You're signed up. You can change your choice until groups are locked.
          </p>
        )}
      </div>
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
    <Card className="space-y-4">
      <div>
        <Tag color="coral">Your group</Tag>
        <h2 className="text-xl font-black text-[#0A0E2A] mt-2">{group.name}</h2>
        {challenge && <p className="text-gray-500 text-sm mt-1">{challenge.description}</p>}
      </div>
      <div>
        <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-1.5">
          Write your group's answer together (shared live with your teammates)
        </p>
        <textarea
          id="solution-box"
          value={solutionText}
          onChange={(e) => save(e.target.value)}
          rows={8}
          className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-[#E8503A] resize-none"
          placeholder="Type your group's answer here..."
        />
      </div>
      {board && (
        <div>
          <p className="text-[10px] font-bold uppercase tracking-widest text-[#E8503A] mb-2">The board is challenging your answer</p>
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
    <Card className="space-y-4">
      <Tag color="coral">Step 5 — your commitment</Tag>
      <h2 className="text-xl font-black text-[#0A0E2A]">What will you do in the next 30 days?</h2>
      <p className="text-gray-500 text-sm">
        Based on today's discussion, write down ONE concrete action you personally commit to taking in the next 30 days.
      </p>
      <textarea
        value={action}
        onChange={(e) => setAction(e.target.value)}
        rows={4}
        className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-[#E8503A] resize-none"
        placeholder="In the next 30 days, I will..."
      />
      <Btn variant="coral" onClick={submit} disabled={!action.trim()} loading={submitting}>
        {existing ? "Update commitment" : "Submit commitment"}
      </Btn>
      {existing && <p className="text-green-600 text-xs font-medium flex items-center gap-1"><CheckCircle2 className="w-3.5 h-3.5" /> Saved</p>}
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
      <div className="min-h-screen flex items-center justify-center bg-[#F4F6FB] px-6">
        <p className="text-gray-500">This link isn't valid. Please check the link you received.</p>
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
    <div className="min-h-screen bg-[#F4F6FB] py-10 px-4">
      <div className="max-w-2xl mx-auto space-y-6">
        <div className="text-center space-y-3">
          <div className="flex justify-center"><ROAILogo size="md" /></div>
          <h1 className="text-2xl font-black text-[#0A0E2A]">{workshop.name}</h1>
          <p className="text-gray-400 text-sm">Welcome back, {participant.name}.</p>
        </div>

        {myGroup ? (
          <GroupWorkspace group={myGroup} challenge={challenge} workshop={workshop} />
        ) : (
          <Card>
            <p className="text-gray-400 text-sm">Groups are being finalized — check back in a moment.</p>
          </Card>
        )}

        {workshop.status === "commitments" && <CommitmentForm participant={participant} workshop={workshop} />}
        {workshop.status === "closed" && (
          <Card>
            <p className="text-green-600 text-sm font-medium">Thank you for participating in the workshop!</p>
          </Card>
        )}
      </div>
    </div>
  );
}
