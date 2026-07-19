import { useEffect, useState } from "react";
import { onSnapshot, query, where } from "firebase/firestore";
import { ArrowLeft, Loader2 } from "lucide-react";
import { col, docIn } from "../firebase";
import { GROUP_STEP_LABELS } from "../types";
import { Card, FacilitatorBadge, PageHeader, ROAILogo, Tag } from "../ui";
import type { BoardChallenge, Challenge, Group, GroupSolution, Participant, Workshop } from "../types";

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
    <div className="max-w-2xl md:max-w-3xl mx-auto space-y-6 py-10 px-4 md:px-0">
      <button onClick={onBack} className="text-[#DD4B4E] font-bold text-sm inline-flex items-center gap-1.5">
        <ArrowLeft className="w-4 h-4" /> All groups
      </button>

      <div>
        <h1 className="text-2xl font-black text-[#14121F]">{group.name}</h1>
        <p className="text-gray-400 text-sm flex items-center flex-wrap gap-x-1.5">
          {members.map((m, i) => (
            <span key={m.id} className="inline-flex items-center gap-1">
              {i > 0 && <span>·</span>}
              {m.name}
              {m.role === "facilitator" && <FacilitatorBadge />}
            </span>
          ))}
        </p>
        <div className="mt-2">
          <Tag color={group.currentStep === "done" ? "green" : "coral"}>{GROUP_STEP_LABELS[group.currentStep || "initial"]}</Tag>
        </div>
      </div>

      {!challenge && <Card><p className="text-gray-400 text-sm">No challenge selected yet.</p></Card>}

      {challenge && (
        <Card>
          <p className="text-[10px] font-bold uppercase tracking-widest text-[#DD4B4E] mb-1">Challenge</p>
          <p className="font-bold text-[#14121F]">{challenge.title}</p>
          <p className="text-sm text-gray-500 mt-1">{challenge.description}</p>
        </Card>
      )}

      {solution?.initialSolution && (
        <Card>
          <div className="flex items-center justify-between mb-1">
            <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400">Initial answer</p>
            {solution.initialSubmitted && <Tag color="green">submitted</Tag>}
          </div>
          <p className="text-sm text-[#14121F] whitespace-pre-wrap">{solution.initialSolution}</p>
        </Card>
      )}

      {board && (
        <div>
          <p className="text-[10px] font-bold uppercase tracking-widest text-[#DD4B4E] mb-2">The C-level board's challenge</p>
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

      {solution?.revisedSolution && (
        <Card>
          <div className="flex items-center justify-between mb-1">
            <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400">Revised answer</p>
            {solution.revisedSubmitted && <Tag color="green">submitted</Tag>}
          </div>
          <p className="text-sm text-[#14121F] whitespace-pre-wrap">{solution.revisedSolution}</p>
        </Card>
      )}

      {solution?.actionsSubmitted && (
        <Card>
          <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-2">30 / 60 / 90-day actions</p>
          <div className="grid sm:grid-cols-3 gap-3 text-sm">
            <div><p className="text-[10px] font-bold uppercase tracking-widest text-[#DD4B4E] mb-1">30 days</p><p className="text-gray-600 whitespace-pre-wrap">{solution.action30}</p></div>
            <div><p className="text-[10px] font-bold uppercase tracking-widest text-[#DD4B4E] mb-1">60 days</p><p className="text-gray-600 whitespace-pre-wrap">{solution.action60}</p></div>
            <div><p className="text-[10px] font-bold uppercase tracking-widest text-[#DD4B4E] mb-1">90 days</p><p className="text-gray-600 whitespace-pre-wrap">{solution.action90}</p></div>
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
      <div className="min-h-screen flex items-center justify-center bg-[#FAFAFA] px-6">
        <p className="text-gray-500">This link isn't valid.</p>
      </div>
    );
  }

  const selectedGroup = groups.find((g) => g.id === selectedGroupId);

  if (selectedGroup) {
    const members = selectedGroup.participantIds.map((id) => participants.find((p) => p.id === id)).filter(Boolean) as Participant[];
    return (
      <div className="min-h-screen bg-[#FAFAFA]">
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
    <div className="min-h-screen bg-white">
      <div className="max-w-5xl mx-auto px-4 md:px-8 py-8">
        <div className="flex items-center justify-between mb-6">
          <ROAILogo size="md" />
        </div>
        <PageHeader
          eyebrow={workshop.date}
          title={workshop.name}
          subtitle="Tap a group below to see their live progress."
        />

        <div className="grid md:grid-cols-2 gap-3">
          {groups.map((g) => {
            const members = g.participantIds.map((id) => participants.find((p) => p.id === id)).filter(Boolean) as Participant[];
            return (
              <button
                key={g.id}
                onClick={() => setSelectedGroupId(g.id)}
                className="w-full text-left bg-white border border-gray-200 hover:border-[#DD4B4E]/40 rounded-md p-5 transition-all"
              >
                <div className="flex items-center justify-between">
                  <div className="font-bold text-[#14121F]">{g.name}</div>
                  <Tag color={g.currentStep === "done" ? "green" : "coral"}>{GROUP_STEP_LABELS[g.currentStep || "initial"]}</Tag>
                </div>
                <p className="text-sm text-gray-500 mt-1 flex items-center flex-wrap gap-x-1.5">
                  {members.length === 0 ? (
                    "No members yet"
                  ) : (
                    members.map((m, i) => (
                      <span key={m.id} className="inline-flex items-center gap-1">
                        {i > 0 && <span>·</span>}
                        {m.name}
                        {m.role === "facilitator" && <FacilitatorBadge />}
                      </span>
                    ))
                  )}
                </p>
              </button>
            );
          })}
        </div>
        {groups.length === 0 && <p className="text-gray-400 text-sm text-center mt-6">No groups yet.</p>}
      </div>
    </div>
  );
}
