import { useEffect, useState } from "react";
import type { ReactNode } from "react";
import { onSnapshot, query, where } from "firebase/firestore";
import { ArrowLeft, ChevronRight, Loader2 } from "lucide-react";
import { col, docIn } from "../firebase";
import { cn } from "../utils";
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

// A small pulsing badge reinforcing that this page is watching Firestore
// live — the entire reason a spectator would open this link on their phone.
function LiveBadge() {
  return (
    <div className="inline-flex items-center gap-1.5 bg-[#DD4B4E]/10 text-[#DD4B4E] text-[10px] font-bold uppercase tracking-widest px-2.5 py-1 rounded-full">
      <span className="relative flex w-1.5 h-1.5">
        <span className="absolute inline-flex h-full w-full rounded-full bg-[#DD4B4E] opacity-75 animate-ping" />
        <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-[#DD4B4E]" />
      </span>
      Live
    </div>
  );
}

// The one signature element this page needs: a real progress rail. Order
// genuinely carries information here (this is the actual sequence every
// group moves through), so a step indicator earns its place — a plain
// status tag can't show at a glance how far along a group is versus how
// far they have left.
const STEP_SEQUENCE: { key: "initial" | "board" | "actions" | "done"; label: string }[] = [
  { key: "initial", label: "Question 1" },
  { key: "board", label: "Board Feedback" },
  { key: "actions", label: "Actions" },
  { key: "done", label: "Done" },
];

function stepIndex(step: string | undefined) {
  const idx = STEP_SEQUENCE.findIndex((s) => s.key === (step || "initial"));
  return idx === -1 ? 0 : idx;
}

function ProgressRail({ currentStep, withLabels = false }: { currentStep: string | undefined; withLabels?: boolean }) {
  const idx = stepIndex(currentStep);
  return (
    <div>
      <div className="flex items-center gap-1">
        {STEP_SEQUENCE.map((s, i) => (
          <div key={s.key} className={cn("h-1.5 flex-1 rounded-full transition-colors", i <= idx ? "roai-mark" : "bg-gray-200")} />
        ))}
      </div>
      {withLabels && (
        <div className="flex items-start justify-between mt-1.5">
          {STEP_SEQUENCE.map((s, i) => (
            <p
              key={s.key}
              className={cn(
                "text-[10px] font-semibold uppercase tracking-wide flex-1",
                i === 1 ? "text-center" : i === 2 ? "text-center" : i === 3 ? "text-right" : "text-left",
                i <= idx ? "text-[#14121F]" : "text-gray-300"
              )}
            >
              {s.label}
            </p>
          ))}
        </div>
      )}
    </div>
  );
}

function SectionBlock({
  accent,
  label,
  tag,
  children,
}: {
  accent: "indigo" | "teal" | "gray";
  label: string;
  tag?: ReactNode;
  children: ReactNode;
}) {
  const border = accent === "indigo" ? "border-[#3545A3]" : accent === "teal" ? "border-[#1FA398]" : "border-gray-300";
  const bg = accent === "indigo" ? "bg-[#3545A3]/5" : accent === "teal" ? "bg-[#1FA398]/5" : "bg-gray-50";
  const labelColor = accent === "indigo" ? "text-[#3545A3]" : accent === "teal" ? "text-[#1FA398]" : "text-gray-400";
  return (
    <div className={cn("border-l-4 rounded-r-lg p-4", border, bg)}>
      <div className="flex items-center justify-between mb-1">
        <p className={cn("text-[10px] font-bold uppercase tracking-widest", labelColor)}>{label}</p>
        {tag}
      </div>
      {children}
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
    <div className="max-w-2xl md:max-w-3xl mx-auto space-y-5 py-8 px-4 md:px-0">
      <button onClick={onBack} className="text-[#DD4B4E] font-bold text-sm inline-flex items-center gap-1.5">
        <ArrowLeft className="w-4 h-4" /> All groups
      </button>

      <div>
        <h1 className="text-2xl font-black text-[#14121F]">{group.name}</h1>
        <p className="text-gray-400 text-sm flex items-center flex-wrap gap-x-1.5 mt-0.5">
          {members.map((m, i) => (
            <span key={m.id} className="inline-flex items-center gap-1">
              {i > 0 && <span>·</span>}
              {m.name}
              {m.role === "facilitator" && <FacilitatorBadge />}
            </span>
          ))}
        </p>
        <div className="mt-4">
          <ProgressRail currentStep={group.currentStep} withLabels />
        </div>
      </div>

      {!challenge && <Card><p className="text-gray-400 text-sm">No challenge selected yet.</p></Card>}

      {challenge && (
        <SectionBlock accent="indigo" label="Challenge">
          <p className="font-bold text-[#14121F]">{challenge.title}</p>
          <p className="text-sm text-gray-600 mt-1">{challenge.description}</p>
        </SectionBlock>
      )}

      {solution?.initialSolution && (
        <SectionBlock
          accent="gray"
          label="Initial answer"
          tag={solution.initialSubmitted && <Tag color="green">submitted</Tag>}
        >
          <p className="text-sm text-[#14121F] whitespace-pre-wrap">{solution.initialSolution}</p>
        </SectionBlock>
      )}

      {board && (
        <div>
          <p className="text-[10px] font-bold uppercase tracking-widest text-[#DD4B4E] mb-2">The C-level board's challenge</p>
          <div className="grid sm:grid-cols-2 gap-2">
            {board.personaChallenges.map((pc, i) => (
              <div key={i} className="bg-[#14121F] rounded-md p-3 text-sm">
                <div className="text-white/90">{pc.objection}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {solution?.revisedSolution && (
        <SectionBlock
          accent="teal"
          label="Revised answer"
          tag={solution.revisedSubmitted && <Tag color="green">submitted</Tag>}
        >
          <p className="text-sm text-[#14121F] whitespace-pre-wrap">{solution.revisedSolution}</p>
        </SectionBlock>
      )}

      {solution?.actionsSubmitted && (
        <Card>
          <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-3">30 / 60 / 90-day actions</p>
          <div className="grid sm:grid-cols-3 gap-3 text-sm">
            <div className="bg-gray-50 rounded-lg p-3">
              <p className="text-[10px] font-bold uppercase tracking-widest text-[#3545A3] mb-1">30 days</p>
              <p className="text-gray-600 whitespace-pre-wrap">{solution.action30}</p>
            </div>
            <div className="bg-gray-50 rounded-lg p-3">
              <p className="text-[10px] font-bold uppercase tracking-widest text-[#1FA398] mb-1">60 days</p>
              <p className="text-gray-600 whitespace-pre-wrap">{solution.action60}</p>
            </div>
            <div className="bg-gray-50 rounded-lg p-3">
              <p className="text-[10px] font-bold uppercase tracking-widest text-[#DD4B4E] mb-1">90 days</p>
              <p className="text-gray-600 whitespace-pre-wrap">{solution.action90}</p>
            </div>
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
      <div className="max-w-3xl mx-auto px-4 md:px-8 py-8">
        <div className="flex items-center justify-between mb-6">
          <ROAILogo size="md" />
          <LiveBadge />
        </div>
        <PageHeader
          eyebrow={workshop.date}
          title={workshop.name}
          subtitle="Tap a group below to watch their progress update live."
        />

        <div className="space-y-2.5">
          {groups.map((g) => {
            const members = g.participantIds.map((id) => participants.find((p) => p.id === id)).filter(Boolean) as Participant[];
            return (
              <button
                key={g.id}
                onClick={() => setSelectedGroupId(g.id)}
                className="w-full text-left bg-white border border-gray-200 hover:border-[#DD4B4E]/40 hover:shadow-sm rounded-xl p-4 sm:p-5 transition-all group"
              >
                <div className="flex items-center gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="font-bold text-[#14121F]">{g.name}</div>
                    <p className="text-sm text-gray-500 mt-0.5 flex items-center flex-wrap gap-x-1.5">
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
                  </div>
                  <ChevronRight className="w-4 h-4 text-gray-300 group-hover:text-[#DD4B4E] transition-colors shrink-0" />
                </div>
                <div className="mt-3">
                  <ProgressRail currentStep={g.currentStep} />
                </div>
              </button>
            );
          })}
        </div>
        {groups.length === 0 && <p className="text-gray-400 text-sm text-center mt-6">No groups yet.</p>}
      </div>
    </div>
  );
}
