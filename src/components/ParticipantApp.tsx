import { useEffect, useState } from "react";
import { addDoc, onSnapshot, query, setDoc, updateDoc, where } from "firebase/firestore";
import { CheckCircle2, Loader2 } from "lucide-react";
import { col, docIn } from "../firebase";
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
            <div key={c.id} className={`rounded-2xl border p-5 ${canSelect ? "bg-white border-gray-200 hover:border-[#E8503A]/40" : "bg-white border-gray-200"}`}>
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
  const [board, setBoard] = useState<BoardChallenge | null>(null);

  useEffect(() => {
    return onSnapshot(docIn("groupSolutions", group.id), (s) => {
      const data = s.data() as GroupSolution | undefined;
      if (document.activeElement?.id !== "initial-box") setInitialSolution(data?.initialSolution || "");
      if (document.activeElement?.id !== "revised-box") setRevisedSolution(data?.revisedSolution || "");
    });
  }, [group.id]);

  useEffect(() => {
    return onSnapshot(docIn("boardChallenges", group.id), (s) => {
      setBoard(s.exists() ? ({ id: s.id, ...s.data() } as BoardChallenge) : null);
    });
  }, [group.id]);

  async function saveInitial(text: string) {
    setInitialSolution(text);
    await setDoc(docIn("groupSolutions", group.id), {
      groupId: group.id,
      workshopId: workshop.id,
      initialSolution: text,
      initialUpdatedAt: new Date().toISOString(),
    }, { merge: true });
  }

  async function saveRevised(text: string) {
    setRevisedSolution(text);
    await setDoc(docIn("groupSolutions", group.id), {
      groupId: group.id,
      workshopId: workshop.id,
      revisedSolution: text,
      revisedUpdatedAt: new Date().toISOString(),
    }, { merge: true });
  }

  return (
    <Card className="space-y-4">
      <div>
        <Tag color="coral">Your group</Tag>
        <h2 className="text-xl font-black text-[#0A0E2A] mt-2">{group.name}</h2>
        {challenge && <p className="text-gray-500 text-sm mt-1">{challenge.description}</p>}
      </div>

      <div>
        <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-1.5">Initial answer</p>
        {isFacilitator ? (
          <textarea
            id="initial-box"
            value={initialSolution}
            onChange={(e) => saveInitial(e.target.value)}
            rows={7}
            className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-[#E8503A] resize-none"
            placeholder="Write your group's answer here..."
          />
        ) : (
          <p className="text-sm text-[#0A0E2A] bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 whitespace-pre-wrap min-h-[3rem]">
            {initialSolution || "Your facilitator hasn't written an answer yet."}
          </p>
        )}
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

      {board && (
        <div>
          <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-1.5">Revised answer (after the board's challenge)</p>
          {isFacilitator ? (
            <textarea
              id="revised-box"
              value={revisedSolution}
              onChange={(e) => saveRevised(e.target.value)}
              rows={6}
              className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-[#E8503A] resize-none"
              placeholder="How does your group respond to the board's pushback?"
            />
          ) : (
            <p className="text-sm text-[#0A0E2A] bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 whitespace-pre-wrap min-h-[3rem]">
              {revisedSolution || "Your facilitator hasn't written a revised answer yet."}
            </p>
          )}
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
      <Tag color="coral">Your commitment</Tag>
      <h2 className="text-xl font-black text-[#0A0E2A]">What will you do in the next 30 days?</h2>
      <p className="text-gray-500 text-sm">
        This one is personal, not a group answer — write down ONE concrete action you personally commit to taking in the next 30 days.
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

  const challenge = groupChallenges.find((c) => c.id === myGroup.challengeId);

  return (
    <div className="min-h-screen bg-[#F4F6FB] py-10 px-4">
      <div className="max-w-2xl mx-auto space-y-6">
        <div className="text-center space-y-3">
          <div className="flex justify-center"><ROAILogo size="md" /></div>
          <h1 className="text-2xl font-black text-[#0A0E2A]">{workshop.name}</h1>
          <p className="text-gray-400 text-sm">Welcome back, {participant.name}.</p>
        </div>

        <GroupWorkspace group={myGroup} challenge={challenge} workshop={workshop} isFacilitator={isFacilitator} />

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
