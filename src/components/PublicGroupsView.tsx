import { useEffect, useState } from "react";
import { onSnapshot, query, where } from "firebase/firestore";
import { ArrowLeft, Loader2 } from "lucide-react";
import { col, docIn } from "../firebase";
import { GROUP_STEP_LABELS } from "../types";
import { Card, ROAILogo, Tag } from "../ui";
import type { BoardChallenge, Challenge, Group, GroupSolution, Participant, Workshop } from "../types";

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

function GroupDetail({
  group,
  members,
  challenge,
  solution,
  board,
  onBack,
}: {
  group: Group;
  members: Participant[];
  challenge: Challenge | undefined;
  solution: GroupSolution | undefined;
  board: BoardChallenge | undefined;
  onBack: () => void;
}) {
  return (
    <div className="max-w-2xl mx-auto space-y-6 py-10 px-4">
      <button onClick={onBack} className="text-[#E8503A] font-bold text-sm inline-flex items-center gap-1.5">
        <ArrowLeft className="w-4 h-4" /> All groups
      </button>

      <div>
        <h1 className="text-2xl font-black text-[#0A0E2A]">{group.name}</h1>
        <p className="text-gray-400 text-sm">{members.map((m) => m.name + (m.role === "facilitator" ? " ★" : "")).join(" · ")}</p>
        <div className="mt-2">
          <Tag color={group.currentStep === "done" ? "green" : "coral"}>{GROUP_STEP_LABELS[group.currentStep || "initial"]}</Tag>
        </div>
      </div>

      {!challenge && <Card><p className="text-gray-400 text-sm">No challenge selected yet.</p></Card>}

      {challenge && (
        <Card>
          <p className="text-[10px] font-bold uppercase tracking-widest text-[#E8503A] mb-1">Challenge</p>
          <p className="font-bold text-[#0A0E2A]">{challenge.title}</p>
          <p className="text-sm text-gray-500 mt-1">{challenge.description}</p>
        </Card>
      )}

      {solution?.initialSolution && (
        <Card>
          <div className="flex items-center justify-between mb-1">
            <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400">Initial answer</p>
            {solution.initialSubmitted && <Tag color="green">submitted</Tag>}
          </div>
          <p className="text-sm text-[#0A0E2A] whitespace-pre-wrap">{solution.initialSolution}</p>
        </Card>
      )}

      {board && (
        <div>
          <p className="text-[10px] font-bold uppercase tracking-widest text-[#E8503A] mb-2">The C-level board's challenge</p>
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

      {solution?.revisedSolution && (
        <Card>
          <div className="flex items-center justify-between mb-1">
            <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400">Revised answer</p>
            {solution.revisedSubmitted && <Tag color="green">submitted</Tag>}
          </div>
          <p className="text-sm text-[#0A0E2A] whitespace-pre-wrap">{solution.revisedSolution}</p>
        </Card>
      )}

      {solution?.actionsSubmitted && (
        <Card>
          <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-2">30 / 60 / 90-day actions</p>
          <div className="grid sm:grid-cols-3 gap-3 text-sm">
            <div><p className="text-[10px] font-bold uppercase tracking-widest text-[#E8503A] mb-1">30 days</p><p className="text-gray-600 whitespace-pre-wrap">{solution.action30}</p></div>
            <div><p className="text-[10px] font-bold uppercase tracking-widest text-[#E8503A] mb-1">60 days</p><p className="text-gray-600 whitespace-pre-wrap">{solution.action60}</p></div>
            <div><p className="text-[10px] font-bold uppercase tracking-widest text-[#E8503A] mb-1">90 days</p><p className="text-gray-600 whitespace-pre-wrap">{solution.action90}</p></div>
          </div>
        </Card>
      )}
    </div>
  );
}

export default function PublicGroupsView({ workshopId }: { workshopId: string }) {
  const [workshop, setWorkshop] = useState<Workshop | null>(null);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [groups, setGroups] = useState<Group[]>([]);
  const [challenges, setChallenges] = useState<Challenge[]>([]);
  const [solutions, setSolutions] = useState<GroupSolution[]>([]);
  const [boards, setBoards] = useState<BoardChallenge[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedGroupId, setSelectedGroupId] = useState<string | null>(null);

  useEffect(() => onSnapshot(docIn("workshops", workshopId), (s) => {
    setWorkshop(s.exists() ? ({ id: s.id, ...s.data() } as Workshop) : null);
    setLoading(false);
  }), [workshopId]);
  useEffect(() => onSnapshot(query(col.participants, where("workshopId", "==", workshopId)), (s) =>
    setParticipants(s.docs.map((d) => ({ id: d.id, ...d.data() } as Participant)))
  ), [workshopId]);
  useEffect(() => onSnapshot(query(col.groups, where("workshopId", "==", workshopId)), (s) =>
    setGroups(s.docs.map((d) => ({ id: d.id, ...d.data() } as Group)))
  ), [workshopId]);
  useEffect(() => onSnapshot(query(col.challenges, where("workshopId", "==", workshopId)), (s) =>
    setChallenges(s.docs.map((d) => ({ id: d.id, ...d.data() } as Challenge)))
  ), [workshopId]);
  useEffect(() => onSnapshot(query(col.groupSolutions, where("workshopId", "==", workshopId)), (s) =>
    setSolutions(s.docs.map((d) => ({ id: d.id, ...d.data() } as GroupSolution)))
  ), [workshopId]);
  useEffect(() => onSnapshot(query(col.boardChallenges, where("workshopId", "==", workshopId)), (s) =>
    setBoards(s.docs.map((d) => ({ id: d.id, ...d.data() } as BoardChallenge)))
  ), [workshopId]);

  if (loading) return <Waiting message="Loading..." />;
  if (!workshop) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F4F6FB] px-6">
        <p className="text-gray-500">This link isn't valid.</p>
      </div>
    );
  }

  const selectedGroup = groups.find((g) => g.id === selectedGroupId);

  if (selectedGroup) {
    const members = selectedGroup.participantIds.map((id) => participants.find((p) => p.id === id)).filter(Boolean) as Participant[];
    return (
      <div className="min-h-screen bg-[#F4F6FB]">
        <GroupDetail
          group={selectedGroup}
          members={members}
          challenge={challenges.find((c) => c.id === selectedGroup.challengeId)}
          solution={solutions.find((s) => s.groupId === selectedGroup.id)}
          board={boards.find((b) => b.groupId === selectedGroup.id)}
          onBack={() => setSelectedGroupId(null)}
        />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F4F6FB] py-10 px-4">
      <div className="max-w-2xl mx-auto space-y-6">
        <div className="text-center space-y-2">
          <div className="flex justify-center"><ROAILogo size="lg" /></div>
          <h1 className="text-2xl font-black text-[#0A0E2A]">{workshop.name}</h1>
          <p className="text-gray-400 text-sm">Tap a group to see their progress.</p>
        </div>

        <div className="space-y-3">
          {groups.map((g) => {
            const members = g.participantIds.map((id) => participants.find((p) => p.id === id)).filter(Boolean) as Participant[];
            return (
              <button
                key={g.id}
                onClick={() => setSelectedGroupId(g.id)}
                className="w-full text-left bg-white border border-gray-200 hover:border-[#E8503A]/40 rounded-2xl p-5 transition-all"
              >
                <div className="flex items-center justify-between">
                  <div className="font-bold text-[#0A0E2A]">{g.name}</div>
                  <Tag color={g.currentStep === "done" ? "green" : "coral"}>{GROUP_STEP_LABELS[g.currentStep || "initial"]}</Tag>
                </div>
                <p className="text-sm text-gray-500 mt-1">
                  {members.map((m) => m.name + (m.role === "facilitator" ? " ★" : "")).join(" · ") || "No members yet"}
                </p>
              </button>
            );
          })}
          {groups.length === 0 && <p className="text-gray-400 text-sm text-center">No groups yet.</p>}
        </div>
      </div>
    </div>
  );
}
