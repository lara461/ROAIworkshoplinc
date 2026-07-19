import { useEffect, useState } from "react";
import { onSnapshot, query, where } from "firebase/firestore";
import { col, docIn } from "../firebase";
import { ROAILogo } from "../ui";
import type { BoardChallenge, Challenge, Group, GroupSolution, Participant, Workshop } from "../types";

export default function PresentationView({ workshopId }: { workshopId: string }) {
  const [workshop, setWorkshop] = useState<Workshop | null>(null);
  const [groups, setGroups] = useState<Group[]>([]);
  const [challenges, setChallenges] = useState<Challenge[]>([]);
  const [solutions, setSolutions] = useState<GroupSolution[]>([]);
  const [boards, setBoards] = useState<BoardChallenge[]>([]);
  const [participants, setParticipants] = useState<Participant[]>([]);

  useEffect(() => onSnapshot(docIn("workshops", workshopId), (s) =>
    setWorkshop(s.exists() ? ({ id: s.id, ...s.data() } as Workshop) : null)
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
  useEffect(() => onSnapshot(query(col.participants, where("workshopId", "==", workshopId)), (s) =>
    setParticipants(s.docs.map((d) => ({ id: d.id, ...d.data() } as Participant)))
  ), [workshopId]);

  if (!workshop) {
    return (
      <div className="min-h-screen bg-[#14121F] flex items-center justify-center">
        <p className="text-white/40">Waiting for workshop...</p>
      </div>
    );
  }

  const activeGroup = groups.find((g) => g.id === workshop.presentationGroupId);
  const challenge = activeGroup ? challenges.find((c) => c.id === activeGroup.challengeId) : undefined;
  const solution = activeGroup ? solutions.find((s) => s.groupId === activeGroup.id) : undefined;
  const board = activeGroup ? boards.find((b) => b.groupId === activeGroup.id) : undefined;
  const shown = workshop.presentationSections || [];

  return (
    <div className="min-h-screen bg-[#14121F] px-10 py-10">
      <div className="flex justify-center mb-10">
        <ROAILogo dark size="md" />
      </div>

      {!activeGroup ? (
        <div className="flex items-center justify-center h-[60vh]">
          <p className="text-3xl text-white/20 font-black">Waiting for the facilitator to bring up a group...</p>
        </div>
      ) : (
        <div className="max-w-4xl mx-auto space-y-8">
          <div className="text-center space-y-2">
            <h1 className="text-4xl font-black text-white">{activeGroup.name}</h1>
            <p className="text-white/50 text-lg">
              {activeGroup.participantIds.map((id) => participants.find((p) => p.id === id)?.name).join(" · ")}
            </p>
          </div>

          {shown.length === 0 && (
            <p className="text-center text-white/20 text-xl">Waiting for the facilitator to reveal something...</p>
          )}

          {shown.includes("challenge") && challenge && (
            <div className="bg-white/5 border border-white/10 rounded-md p-6">
              <p className="text-[#DD4B4E] text-xs font-bold uppercase tracking-widest mb-2">Challenge</p>
              <p className="text-xl text-white">{challenge.description}</p>
            </div>
          )}

          {shown.includes("solution") && solution && (
            <div className="bg-white/5 border border-white/10 rounded-md p-6">
              <p className="text-[#DD4B4E] text-xs font-bold uppercase tracking-widest mb-2">Their solution</p>
              <p className="text-lg text-white/90 whitespace-pre-wrap">{solution.initialSolution}</p>
            </div>
          )}

          {shown.includes("board") && board && (
            <div>
              <p className="text-[#DD4B4E] text-xs font-bold uppercase tracking-widest mb-3 text-center">Board feedback</p>
              <div className="grid sm:grid-cols-2 gap-4">
                {board.personaChallenges.map((pc, i) => (
                  <div key={i} className="bg-white/5 border border-white/10 rounded-md p-4">
                    <div className="text-[#DD4B4E] font-bold text-xs uppercase tracking-widest mb-1">{pc.role}</div>
                    <div className="text-white text-lg">{pc.objection}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {shown.includes("reviewed") && solution?.revisedSolution && (
            <div className="bg-white/5 border border-white/10 rounded-md p-6">
              <p className="text-[#DD4B4E] text-xs font-bold uppercase tracking-widest mb-2">Reviewed solution</p>
              <p className="text-lg text-white/90 whitespace-pre-wrap">{solution.revisedSolution}</p>
            </div>
          )}

          {shown.includes("actions") && solution?.actionsSubmitted && (
            <div>
              <p className="text-[#DD4B4E] text-xs font-bold uppercase tracking-widest mb-3 text-center">30 / 60 / 90-day actions</p>
              <div className="grid sm:grid-cols-3 gap-4">
                <div className="bg-white/5 border border-white/10 rounded-md p-4">
                  <div className="text-[#DD4B4E] font-bold text-xs uppercase tracking-widest mb-1">30 days</div>
                  <div className="text-white whitespace-pre-wrap">{solution.action30}</div>
                </div>
                <div className="bg-white/5 border border-white/10 rounded-md p-4">
                  <div className="text-[#DD4B4E] font-bold text-xs uppercase tracking-widest mb-1">60 days</div>
                  <div className="text-white whitespace-pre-wrap">{solution.action60}</div>
                </div>
                <div className="bg-white/5 border border-white/10 rounded-md p-4">
                  <div className="text-[#DD4B4E] font-bold text-xs uppercase tracking-widest mb-1">90 days</div>
                  <div className="text-white whitespace-pre-wrap">{solution.action90}</div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
