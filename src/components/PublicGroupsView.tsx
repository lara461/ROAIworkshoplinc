import { useEffect, useState } from "react";
import type { ReactNode } from "react";
import { onSnapshot, query, where } from "firebase/firestore";
import { ArrowLeft, ChevronRight, ClipboardList, Compass, ListChecks, Loader2, MessageSquareWarning, Target } from "lucide-react";
import { col, docIn } from "../firebase";
import { cn } from "../utils";
import { Card, FacilitatorBadge, PageHeader, ROAILogo, Tag } from "../ui";
import type { BoardChallenge, Challenge, Group, GroupSolution, Participant, Workshop } from "../types";
import { GROUP_STEP_LABELS } from "../types";

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

// A tinted, colored-title callout box — the shared look for every content
// section on this page (challenge, initial answer, revised answer, actions),
// so they all read as the same kind of thing at a glance.
function SectionBlock({
  accent,
  label,
  tag,
  children,
}: {
  accent: "indigo" | "teal" | "coral";
  label: string;
  tag?: ReactNode;
  children: ReactNode;
}) {
  const border = accent === "indigo" ? "border-[#3545A3]" : accent === "teal" ? "border-[#1FA398]" : "border-[#DD4B4E]";
  const bg = accent === "indigo" ? "bg-[#3545A3]/5" : accent === "teal" ? "bg-[#1FA398]/5" : "bg-[#DD4B4E]/5";
  const labelColor = accent === "indigo" ? "text-[#3545A3]" : accent === "teal" ? "text-[#1FA398]" : "text-[#DD4B4E]";
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

// The phases a spectator can flip between — only the ones this group
// actually has content for show up as tabs.
type PhaseKey = "challenge" | "initial" | "board" | "revised" | "actions";
const PHASE_META: Record<PhaseKey, { label: string; icon: typeof Target }> = {
  challenge: { label: "Challenge", icon: Target },
  initial: { label: "Answer", icon: MessageSquareWarning },
  board: { label: "Board", icon: ClipboardList },
  revised: { label: "Revised", icon: Compass },
  actions: { label: "Actions", icon: ListChecks },
};

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
  const availablePhases: PhaseKey[] = [
    "challenge",
    ...(solution?.initialSolution ? (["initial"] as const) : []),
    ...(board ? (["board"] as const) : []),
    ...(solution?.revisedSolution ? (["revised"] as const) : []),
    ...(solution?.actionsSubmitted ? (["actions"] as const) : []),
  ];
  const [phase, setPhase] = useState<PhaseKey>("challenge");
  const activePhase = availablePhases.includes(phase) ? phase : availablePhases[0];

  const challengeBlock = !challenge ? (
    <Card><p className="text-gray-400 text-sm">No challenge selected yet.</p></Card>
  ) : (
    <SectionBlock accent="indigo" label="Challenge">
      <p className="font-bold text-[#14121F]">{challenge.title}</p>
      <p className="text-sm text-gray-600 mt-1">{challenge.description}</p>
    </SectionBlock>
  );

  const initialBlock = solution?.initialSolution && (
    <SectionBlock accent="coral" label="Initial answer" tag={solution.initialSubmitted && <Tag color="green">submitted</Tag>}>
      <p className="text-sm text-[#14121F] whitespace-pre-wrap">{solution.initialSolution}</p>
    </SectionBlock>
  );

  const boardBlock = board && (
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
  );

  const revisedBlock = solution?.revisedSolution && (
    <SectionBlock accent="teal" label="Revised answer" tag={solution.revisedSubmitted && <Tag color="green">submitted</Tag>}>
      <p className="text-sm text-[#14121F] whitespace-pre-wrap">{solution.revisedSolution}</p>
    </SectionBlock>
  );

  const actionsBlock = solution?.actionsSubmitted && (
    <div className="space-y-3">
      <SectionBlock accent="indigo" label="Next 30 days"><p className="text-sm text-[#14121F] whitespace-pre-wrap">{solution.action30}</p></SectionBlock>
      <SectionBlock accent="teal" label="Next 60 days"><p className="text-sm text-[#14121F] whitespace-pre-wrap">{solution.action60}</p></SectionBlock>
      <SectionBlock accent="coral" label="Next 90 days"><p className="text-sm text-[#14121F] whitespace-pre-wrap">{solution.action90}</p></SectionBlock>
    </div>
  );

  const blockFor: Record<PhaseKey, ReactNode> = {
    challenge: challengeBlock,
    initial: initialBlock,
    board: boardBlock,
    revised: revisedBlock,
    actions: actionsBlock,
  };

  return (
    <div className="min-h-screen bg-[#FAFAFA]">
      <div className="max-w-2xl md:max-w-3xl mx-auto px-4 md:px-0 py-8 pb-28 lg:pb-8 space-y-5">
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
          <div className="mt-2">
            <Tag color={group.currentStep === "done" ? "green" : "coral"}>{GROUP_STEP_LABELS[group.currentStep || "initial"]}</Tag>
          </div>
        </div>

        {/* Mobile — only the active phase shows, switched via the bottom navigator */}
        <div className="lg:hidden">{blockFor[activePhase]}</div>

        {/* Desktop — everything stacked, scrollable, no navigator needed */}
        <div className="hidden lg:block space-y-5">
          {challengeBlock}
          {initialBlock}
          {boardBlock}
          {revisedBlock}
          {actionsBlock}
        </div>
      </div>

      {/* Bottom phase navigator — mobile only, app-style */}
      {availablePhases.length > 1 && (
        <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-white border-t border-gray-200 flex items-stretch">
          {availablePhases.map((key) => {
            const meta = PHASE_META[key];
            const Icon = meta.icon;
            const active = key === activePhase;
            return (
              <button
                key={key}
                onClick={() => setPhase(key)}
                className={cn(
                  "flex-1 flex flex-col items-center justify-center gap-0.5 py-2 text-[10px] font-semibold transition-colors",
                  active ? "text-[#DD4B4E]" : "text-gray-400"
                )}
              >
                <Icon className="w-5 h-5" />
                {meta.label}
              </button>
            );
          })}
        </nav>
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
      <GroupDetail
        group={selectedGroup}
        members={members}
        challenge={challenges.find((c) => c.id === selectedGroup.challengeId)}
        solution={solutions.find((s) => s.groupId === selectedGroup.id)}
        board={boards.find((b) => b.groupId === selectedGroup.id)}
        onBack={() => setSelectedGroupId(null)}
      />
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
                    <div className="flex items-center gap-2 flex-wrap">
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
                  </div>
                  <ChevronRight className="w-4 h-4 text-gray-300 group-hover:text-[#DD4B4E] transition-colors shrink-0" />
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
