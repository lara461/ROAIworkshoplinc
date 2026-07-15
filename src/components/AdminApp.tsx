import { useEffect, useState } from "react";
import type { ReactNode } from "react";
import {
  addDoc,
  deleteDoc,
  onSnapshot,
  query,
  setDoc,
  updateDoc,
  where,
} from "firebase/firestore";
import { nanoid } from "nanoid";
import {
  CheckCircle2,
  Copy,
  Loader2,
  Plus,
  RefreshCw,
  Rocket,
  Users,
} from "lucide-react";
import { col, docIn } from "../firebase";
import { buildGroups } from "../groupSplit";
import { Btn, Card, Eyebrow, Field, ROAILogo, Tag, TextArea } from "../ui";
import type {
  BoardChallenge,
  Challenge,
  Commitment,
  Group,
  GroupSignup,
  GroupSolution,
  Participant,
  SurveyResponse,
  Workshop,
} from "../types";

async function api(path: string, adminSecret: string, body?: any) {
  const res = await fetch(`/api${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-admin-secret": adminSecret },
    body: JSON.stringify(body || {}),
  });
  if (!res.ok) throw new Error((await res.json()).error || "Request failed");
  return res.json();
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <Card className="space-y-4">
      <h2 className="text-lg font-black text-[#0A0E2A]">{title}</h2>
      {children}
    </Card>
  );
}

// ── Login ─────────────────────────────────────────────────────────────────
function Login({ onLogin }: { onLogin: (secret: string) => void }) {
  const [secret, setSecret] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit() {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/verify-admin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ adminSecret: secret }),
      });
      if (res.ok) onLogin(secret);
      else setError("Incorrect admin secret");
    } catch {
      setError("Could not reach the server");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-[#F4F6FB] flex items-center justify-center px-6">
      <div className="max-w-sm w-full space-y-6">
        <div className="flex justify-center">
          <ROAILogo size="lg" />
        </div>
        <Card className="space-y-4">
          <h1 className="text-xl font-black text-[#0A0E2A] text-center">Facilitator Access</h1>
          <input
            type="password"
            value={secret}
            onChange={(e) => setSecret(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && submit()}
            placeholder="Admin secret"
            className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm outline-none focus:border-[#E8503A]"
          />
          {error && <p className="text-red-500 text-sm font-medium">{error}</p>}
          <Btn variant="coral" onClick={submit} loading={loading} className="w-full justify-center">
            Enter
          </Btn>
        </Card>
      </div>
    </div>
  );
}

// ── Create / Select Workshop ────────────────────────────────────────────
function WorkshopPicker({
  adminSecret,
  onSelect,
}: {
  adminSecret: string;
  onSelect: (w: Workshop) => void;
}) {
  const [workshops, setWorkshops] = useState<Workshop[]>([]);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [date, setDate] = useState("");

  useEffect(() => {
    return onSnapshot(col.workshops, (snap) => {
      setWorkshops(
        snap.docs
          .map((d) => ({ id: d.id, ...d.data() } as Workshop))
          .sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1))
      );
    });
  }, []);

  async function create() {
    if (!name || !date) return;
    const ref = await addDoc(col.workshops, {
      name,
      description,
      date,
      adminSecret,
      createdAt: new Date().toISOString(),
      status: "survey",
      presentationGroupId: null,
    });
    onSelect({ id: ref.id, name, description, date, adminSecret, createdAt: new Date().toISOString(), status: "survey" });
  }

  return (
    <div className="min-h-screen bg-[#F4F6FB] px-6 py-12">
      <div className="max-w-3xl mx-auto space-y-8">
        <div className="flex items-center justify-between">
          <ROAILogo size="md" />
          <span className="text-sm text-gray-400 font-bold">Facilitator</span>
        </div>
        <h1 className="text-2xl font-black text-[#0A0E2A]">Future of Work Action Workshop</h1>

        <Section title="Create a new workshop">
          <Field label="Workshop name" value={name} onChange={setName} placeholder="e.g. Acme Leadership Team — July 2026" />
          <TextArea label="Short description" value={description} onChange={setDescription} rows={2} />
          <div>
            <label className="block text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-1.5">Date</label>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-[#E8503A]"
            />
          </div>
          <Btn variant="coral" onClick={create}>
            <Plus className="w-4 h-4" /> Create workshop
          </Btn>
        </Section>

        <Section title="Existing workshops">
          <div className="space-y-2">
            {workshops.map((w) => (
              <button
                key={w.id}
                onClick={() => onSelect(w)}
                className="w-full text-left bg-gray-50 hover:bg-[#E8503A]/5 border border-gray-200 hover:border-[#E8503A]/40 rounded-xl px-4 py-3 flex items-center justify-between transition-all group"
              >
                <div>
                  <div className="font-bold text-[#0A0E2A] group-hover:text-[#E8503A] transition-colors">{w.name}</div>
                  <div className="text-xs text-gray-400">{w.date} — status: {w.status}</div>
                </div>
                <span className="text-[#E8503A] text-sm font-bold">Open →</span>
              </button>
            ))}
            {workshops.length === 0 && <p className="text-gray-400 text-sm">No workshops yet.</p>}
          </div>
        </Section>
      </div>
    </div>
  );
}

// ── Workshop Dashboard ───────────────────────────────────────────────────
function WorkshopDashboard({ workshop, adminSecret }: { workshop: Workshop; adminSecret: string }) {
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [responses, setResponses] = useState<SurveyResponse[]>([]);
  const [challenges, setChallenges] = useState<Challenge[]>([]);
  const [signups, setSignups] = useState<GroupSignup[]>([]);
  const [groups, setGroups] = useState<Group[]>([]);
  const [solutions, setSolutions] = useState<GroupSolution[]>([]);
  const [boards, setBoards] = useState<BoardChallenge[]>([]);
  const [commitments, setCommitments] = useState<Commitment[]>([]);
  const [status, setStatus] = useState(workshop.status);

  const [newName, setNewName] = useState("");
  const [newEmail, setNewEmail] = useState("");
  const [numChallenges, setNumChallenges] = useState(5);
  const [generating, setGenerating] = useState(false);
  const [report, setReport] = useState<any>(null);
  const [genReport, setGenReport] = useState(false);

  useEffect(() => onSnapshot(query(col.participants, where("workshopId", "==", workshop.id)), (s) =>
    setParticipants(s.docs.map((d) => ({ id: d.id, ...d.data() } as Participant)))
  ), [workshop.id]);
  useEffect(() => onSnapshot(query(col.surveyResponses, where("workshopId", "==", workshop.id)), (s) =>
    setResponses(s.docs.map((d) => ({ id: d.id, ...d.data() } as SurveyResponse)))
  ), [workshop.id]);
  useEffect(() => onSnapshot(query(col.challenges, where("workshopId", "==", workshop.id)), (s) =>
    setChallenges(s.docs.map((d) => ({ id: d.id, ...d.data() } as Challenge)))
  ), [workshop.id]);
  useEffect(() => onSnapshot(query(col.groupSignups, where("workshopId", "==", workshop.id)), (s) =>
    setSignups(s.docs.map((d) => ({ id: d.id, ...d.data() } as GroupSignup)))
  ), [workshop.id]);
  useEffect(() => onSnapshot(query(col.groups, where("workshopId", "==", workshop.id)), (s) =>
    setGroups(s.docs.map((d) => ({ id: d.id, ...d.data() } as Group)))
  ), [workshop.id]);
  useEffect(() => onSnapshot(query(col.groupSolutions, where("workshopId", "==", workshop.id)), (s) =>
    setSolutions(s.docs.map((d) => ({ id: d.id, ...d.data() } as GroupSolution)))
  ), [workshop.id]);
  useEffect(() => onSnapshot(query(col.boardChallenges, where("workshopId", "==", workshop.id)), (s) =>
    setBoards(s.docs.map((d) => ({ id: d.id, ...d.data() } as BoardChallenge)))
  ), [workshop.id]);
  useEffect(() => onSnapshot(query(col.commitments, where("workshopId", "==", workshop.id)), (s) =>
    setCommitments(s.docs.map((d) => ({ id: d.id, ...d.data() } as Commitment)))
  ), [workshop.id]);
  useEffect(() => onSnapshot(docIn("workshops", workshop.id), (s) => {
    const data = s.data() as Workshop | undefined;
    if (data) setStatus(data.status);
  }), [workshop.id]);

  async function setWorkshopStatus(next: Workshop["status"]) {
    await updateDoc(docIn("workshops", workshop.id), { status: next });
  }

  async function addParticipant() {
    if (!newName || !newEmail) return;
    await addDoc(col.participants, {
      workshopId: workshop.id,
      name: newName,
      email: newEmail,
      token: nanoid(12),
      status: "invited",
      createdAt: new Date().toISOString(),
    });
    setNewName("");
    setNewEmail("");
  }

  async function removeParticipant(id: string) {
    await deleteDoc(docIn("participants", id));
  }

  const surveyCompletionCount = responses.length;

  async function generateChallenges() {
    setGenerating(true);
    try {
      const responsePayload = responses.map((r) => {
        const p = participants.find((p) => p.id === r.participantId);
        return {
          participantName: p?.name || "Participant",
          orgSize: r.orgSize,
          aiRelationship: r.aiRelationship,
          biggestConcern: r.biggestConcern,
          futureOfWorkView: r.futureOfWorkView,
          moveTimeline: r.moveTimeline,
          futureVision: r.futureVision,
          ownershipPreference: r.ownershipPreference,
          employeeFreedom: r.employeeFreedom,
        };
      });
      const { challenges: generated } = await api("/generate-challenges", adminSecret, {
        workshop: { name: workshop.name },
        responses: responsePayload,
        numChallenges,
      });
      for (const c of generated) {
        await addDoc(col.challenges, {
          workshopId: workshop.id,
          title: c.title,
          description: c.description,
          themes: c.themes || [],
          createdAt: new Date().toISOString(),
        });
      }
    } catch (e: any) {
      alert(e.message);
    } finally {
      setGenerating(false);
    }
  }

  async function publishChallenges() {
    await setWorkshopStatus("challenges_ready");
  }

  async function openGroupSelection() {
    await setWorkshopStatus("groups_open");
  }

  async function lockGroups() {
    const draft = buildGroups(challenges, signups);
    for (const g of draft) {
      await addDoc(col.groups, {
        workshopId: workshop.id,
        challengeId: g.challengeId,
        name: g.name,
        participantIds: g.participantIds,
        createdAt: new Date().toISOString(),
      });
    }
    await setWorkshopStatus("groups_locked");
  }

  async function generateBoard(group: Group) {
    const sol = solutions.find((s) => s.groupId === group.id);
    const challenge = challenges.find((c) => c.id === group.challengeId);
    if (!sol?.solution || !challenge) return alert("This group hasn't submitted a solution yet.");
    try {
      const { personaChallenges } = await api("/generate-board-challenge", adminSecret, {
        challenge: { title: challenge.title, description: challenge.description },
        solution: sol.solution,
        groupName: group.name,
      });
      await setDoc(docIn("boardChallenges", group.id), {
        groupId: group.id,
        workshopId: workshop.id,
        personaChallenges,
        createdAt: new Date().toISOString(),
      });
    } catch (e: any) {
      alert(e.message);
    }
  }

  async function present(groupId: string | null) {
    await updateDoc(docIn("workshops", workshop.id), { presentationGroupId: groupId, status: "presentation" });
  }

  async function openCommitments() {
    await setWorkshopStatus("commitments");
  }

  async function generateReport() {
    setGenReport(true);
    try {
      const result = await api("/generate-report", adminSecret, {
        workshop: { name: workshop.name, date: workshop.date },
        participants,
        challenges,
        groups,
        solutions,
        commitments,
      });
      setReport(result);
      await setWorkshopStatus("closed");
    } catch (e: any) {
      alert(e.message);
    } finally {
      setGenReport(false);
    }
  }

  const participantLink = (token: string) => `${window.location.origin}/w/${token}`;

  return (
    <div className="min-h-screen bg-[#F4F6FB] px-6 py-10">
      <div className="max-w-5xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <ROAILogo size="sm" />
            <div className="h-8 w-px bg-gray-200" />
            <div>
              <h1 className="text-xl font-black text-[#0A0E2A]">{workshop.name}</h1>
              <p className="text-gray-400 text-xs">{workshop.date} · status: {status}</p>
            </div>
          </div>
          <a href="/admin" className="text-sm text-gray-400 hover:text-[#E8503A] font-bold">
            ← All workshops
          </a>
        </div>

        {/* Participants + Survey */}
        <Section title="1 · Participants & pre-work survey">
          <div className="flex gap-2">
            <input
              placeholder="Full name"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              className="flex-1 bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-sm outline-none focus:border-[#E8503A]"
            />
            <input
              placeholder="Email"
              value={newEmail}
              onChange={(e) => setNewEmail(e.target.value)}
              className="flex-1 bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-sm outline-none focus:border-[#E8503A]"
            />
            <Btn variant="coral" onClick={addParticipant}>
              <Plus className="w-4 h-4" />
            </Btn>
          </div>
          <p className="text-sm text-gray-500 flex items-center gap-1.5">
            <Users className="w-4 h-4" />
            {surveyCompletionCount}/{participants.length} completed the survey
          </p>
          <div className="divide-y divide-gray-100">
            {participants.map((p) => {
              const done = responses.some((r) => r.participantId === p.id);
              return (
                <div key={p.id} className="flex items-center justify-between py-2.5 text-sm">
                  <div>
                    <div className="font-bold text-[#0A0E2A]">{p.name}</div>
                    <div className="text-gray-400 text-xs">{p.email}</div>
                  </div>
                  <div className="flex items-center gap-3">
                    {done ? (
                      <CheckCircle2 className="w-4 h-4 text-green-600" />
                    ) : (
                      <Tag>pending</Tag>
                    )}
                    <button
                      onClick={() => navigator.clipboard.writeText(participantLink(p.token))}
                      className="text-[#E8503A] hover:text-[#d4432f] flex items-center gap-1 font-bold"
                    >
                      <Copy className="w-3.5 h-3.5" /> link
                    </button>
                    <button onClick={() => removeParticipant(p.id)} className="text-gray-400 hover:text-red-500 font-bold">
                      remove
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </Section>

        {/* Step 1: Challenges */}
        <Section title="Step 1 · Define the challenges (from survey answers)">
          {challenges.length === 0 ? (
            <div className="flex items-center gap-3">
              <input
                type="number"
                min={2}
                max={8}
                value={numChallenges}
                onChange={(e) => setNumChallenges(Number(e.target.value))}
                className="w-20 bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-sm outline-none focus:border-[#E8503A]"
              />
              <span className="text-sm text-gray-400">number of challenges to generate</span>
              <Btn variant="coral" onClick={generateChallenges} loading={generating} disabled={responses.length === 0}>
                <Rocket className="w-4 h-4" /> Generate challenges
              </Btn>
            </div>
          ) : (
            <>
              <div className="grid md:grid-cols-2 gap-3">
                {challenges.map((c) => (
                  <div key={c.id} className="bg-gray-50 border border-gray-200 rounded-xl p-4">
                    <div className="font-bold text-[#0A0E2A]">{c.title}</div>
                    <p className="text-sm text-gray-500 mt-1">{c.description}</p>
                    <div className="flex gap-1 mt-2 flex-wrap">
                      {c.themes?.map((t) => (
                        <Tag key={t} color="coral">{t}</Tag>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
              {status === "survey" && <Btn variant="coral" onClick={publishChallenges}>Publish challenges to participants</Btn>}
            </>
          )}
        </Section>

        {/* Step 2: Groups */}
        {challenges.length > 0 && (
          <Section title="Step 2 · Groups (self-selected, max 4 per group)">
            {status === "challenges_ready" && <Btn variant="coral" onClick={openGroupSelection}>Open group selection</Btn>}
            {(status === "groups_open" || status === "challenges_ready") && (
              <div className="grid md:grid-cols-2 gap-3">
                {challenges.map((c) => {
                  const count = signups.filter((s) => s.challengeId === c.id).length;
                  return (
                    <div key={c.id} className="bg-gray-50 border border-gray-200 rounded-xl p-3 flex justify-between text-sm">
                      <span className="font-medium text-[#0A0E2A]">{c.title}</span>
                      <span className="text-[#E8503A] font-bold">{count} signed up</span>
                    </div>
                  );
                })}
              </div>
            )}
            {status === "groups_open" && <Btn variant="coral" onClick={lockGroups}>Lock groups & auto-balance</Btn>}
            {groups.length > 0 && (
              <div className="space-y-2 pt-2">
                {groups.map((g) => (
                  <div key={g.id} className="bg-gray-50 border border-gray-200 rounded-xl p-3 text-sm">
                    <div className="font-bold text-[#0A0E2A]">{g.name}</div>
                    <div className="text-gray-500">
                      {g.participantIds.map((id) => participants.find((p) => p.id === id)?.name).join(", ")}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Section>
        )}

        {/* Step 3: Board challenge */}
        {groups.length > 0 && (
          <Section title="Step 3 · C-level board challenge">
            <div className="space-y-3">
              {groups.map((g) => {
                const sol = solutions.find((s) => s.groupId === g.id);
                const board = boards.find((b) => b.groupId === g.id);
                return (
                  <div key={g.id} className="bg-gray-50 border border-gray-200 rounded-xl p-4">
                    <div className="flex items-center justify-between">
                      <div className="font-bold text-[#0A0E2A]">{g.name}</div>
                      <Btn variant="outline" onClick={() => generateBoard(g)}>
                        {board && <RefreshCw className="w-3.5 h-3.5" />}
                        {board ? "Regenerate board challenge" : "Get board challenge"}
                      </Btn>
                    </div>
                    <p className="text-sm text-gray-500 mt-2 whitespace-pre-wrap">{sol?.solution || "No solution submitted yet."}</p>
                    {board && (
                      <div className="mt-3 grid sm:grid-cols-2 gap-2">
                        {board.personaChallenges.map((pc, i) => (
                          <div key={i} className="bg-white border border-gray-200 rounded-lg p-3 text-xs">
                            <div className="text-[#E8503A] font-bold uppercase tracking-widest text-[10px] mb-1">{pc.role}</div>
                            <div className="text-[#0A0E2A]">{pc.objection}</div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </Section>
        )}

        {/* Step 4: Presentation */}
        {groups.length > 0 && (
          <Section title="Step 4 · Plenary presentation">
            <p className="text-sm text-gray-500">
              Open{" "}
              <a href={`/present/${workshop.id}`} target="_blank" className="text-[#E8503A] font-bold underline">
                /present/{workshop.id}
              </a>{" "}
              on the room screen, then click a group below to bring it up.
            </p>
            <div className="flex flex-wrap gap-2">
              {groups.map((g) => (
                <Btn key={g.id} variant="outline" onClick={() => present(g.id)}>
                  {g.name}
                </Btn>
              ))}
              <Btn variant="outline" onClick={() => present(null)}>
                Clear screen
              </Btn>
            </div>
          </Section>
        )}

        {/* Step 5: Commitments */}
        {groups.length > 0 && (
          <Section title="Step 5 · Individual 30-day commitments">
            {status !== "commitments" && status !== "closed" && (
              <Btn variant="coral" onClick={openCommitments}>Open commitment form to participants</Btn>
            )}
            <div className="space-y-2">
              {commitments.map((c) => {
                const p = participants.find((p) => p.id === c.participantId);
                return (
                  <div key={c.id} className="bg-gray-50 border border-gray-200 rounded-xl p-3 text-sm">
                    <div className="font-bold text-[#0A0E2A]">{p?.name || "Participant"}</div>
                    <div className="text-gray-500">{c.action}</div>
                  </div>
                );
              })}
            </div>
            {commitments.length > 0 && (
              <Btn variant="outline" onClick={generateReport} loading={genReport}>
                Generate final workshop report
              </Btn>
            )}
          </Section>
        )}

        {report && (
          <Section title="Workshop report">
            <p className="text-gray-600">{report.executiveSummary}</p>
            <div className="flex flex-wrap gap-2">
              {report.keyThemes?.map((t: string) => (
                <Tag key={t} color="coral">{t}</Tag>
              ))}
            </div>
            <div className="space-y-2">
              {report.groupHighlights?.map((g: any, i: number) => (
                <div key={i} className="bg-gray-50 border border-gray-200 rounded-xl p-3 text-sm">
                  <div className="font-bold text-[#0A0E2A]">{g.groupName} — {g.challenge}</div>
                  <div className="text-gray-500">{g.coreInsight}</div>
                  <div className="text-[#E8503A] text-xs font-bold mt-1">Bold move: {g.boldMove}</div>
                </div>
              ))}
            </div>
            <p className="text-gray-600 text-sm">{report.commitmentPatterns}</p>
            <ul className="list-disc list-inside text-sm text-gray-600">
              {report.recommendedNextSteps?.map((s: string, i: number) => <li key={i}>{s}</li>)}
            </ul>
            <p className="text-gray-400 italic text-sm">{report.closingNote}</p>
          </Section>
        )}
      </div>
    </div>
  );
}

export default function AdminApp() {
  const [adminSecret, setAdminSecret] = useState<string | null>(null);
  const [workshop, setWorkshop] = useState<Workshop | null>(null);

  if (!adminSecret) return <Login onLogin={setAdminSecret} />;
  if (!workshop) return <WorkshopPicker adminSecret={adminSecret} onSelect={setWorkshop} />;
  return <WorkshopDashboard workshop={workshop} adminSecret={adminSecret} />;
}
