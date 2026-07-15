import { useEffect, useState } from "react";
import { onSnapshot, query, where } from "firebase/firestore";
import { col, docIn } from "../firebase";
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
      <div className="min-h-screen bg-[#0b1220] text-slate-100 flex items-center justify-center">
        <p className="text-slate-500">Waiting for workshop...</p>
      </div>
    );
  }

  const activeGroup = groups.find((g) => g.id === workshop.presentationGroupId);
  const challenge = activeGroup ? challenges.find((c) => c.id === activeGroup.challengeId) : undefined;
  const solution = activeGroup ? solutions.find((s) => s.groupId === activeGroup.id) : undefined;
  const board = activeGroup ? boards.find((b) => b.groupId === activeGroup.id) : undefined;

  return (
    <div className="min-h-screen bg-[#0b1220] text-slate-100 px-10 py-10">
      <div className="text-center mb-8">
        <div className="text-sm uppercase tracking-[0.4em] text-sky-400">ROAI Institute — {workshop.name}</div>
      </div>

      {!activeGroup ? (
        <div className="flex items-center justify-center h-[60vh]">
          <p className="text-3xl text-slate-600">Waiting for the facilitator to bring up a group...</p>
        </div>
      ) : (
        <div className="max-w-4xl mx-auto space-y-8">
          <div className="text-center space-y-2">
            <h1 className="text-4xl font-bold">{activeGroup.name}</h1>
            <p className="text-slate-400 text-lg">
              {activeGroup.participantIds.map((id) => participants.find((p) => p.id === id)?.name).join(" · ")}
            </p>
          </div>

          {challenge && (
            <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-6">
              <p className="text-sky-400 text-sm uppercase tracking-wide mb-1">The challenge</p>
              <p className="text-xl">{challenge.description}</p>
            </div>
          )}

          {solution && (
            <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-6">
              <p className="text-sky-400 text-sm uppercase tracking-wide mb-1">Their answer</p>
              <p className="text-lg whitespace-pre-wrap">{solution.solution}</p>
            </div>
          )}

          {board && (
            <div>
              <p className="text-sky-400 text-sm uppercase tracking-wide mb-3 text-center">The board challenges them</p>
              <div className="grid sm:grid-cols-2 gap-4">
                {board.personaChallenges.map((pc, i) => (
                  <div key={i} className="bg-slate-900/60 border border-slate-800 rounded-xl p-4">
                    <div className="text-sky-400 font-semibold">{pc.role}</div>
                    <div className="text-slate-200 text-lg">{pc.objection}</div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
