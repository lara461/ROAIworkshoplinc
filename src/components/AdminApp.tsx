import { useEffect, useMemo, useState } from "react";
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
    <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-6 space-y-4">
      <h2 className="text-lg font-semibold text-slate-100">{title}</h2>
      {children}
    </div>
  );
}

function Button({
  children,
  onClick,
  disabled,
  variant = "primary",
}: {
  children: ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  variant?: "primary" | "secondary" | "danger";
}) {
  const styles =
    variant === "primary"
      ? "bg-sky-500 hover:bg-sky-400 text-slate-950"
      : variant === "danger"
      ? "bg-red-500/20 hover:bg-red-500/30 text-red-300 border border-red-500/40"
      : "bg-slate-800 hover:bg-slate-700 text-slate-100 border border-slate-700";
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`px-4 py-2 rounded-lg text-sm font-medium transition disabled:opacity-40 disabled:cursor-not-allowed ${styles}`}
    >
      {children}
    </button>
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
    <div className="min-h-screen bg-[#0b1220] text-slate-100 flex items-center justify-center px-6">
      <div className="max-w-sm w-full space-y-6">
        <div className="text-center space-y-1">
          <div className="text-sm uppercase tracking-[0.3em] text-sky-400">ROAI Institute</div>
          <h1 className="text-2xl font-semibold">Facilitator Access</h1>
        </div>
        <input
          type="password"
          value={secret}
          onChange={(e) => setSecret(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && submit()}
          placeholder="Admin secret"
          className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-3 outline-none focus:border-sky-500"
        />
        {error && <p className="text-red-400 text-sm">{error}</p>}
        <Button onClick={submit} disabled={loading}>
          {loading ? <Loader2 className="animate-spin inline w-4 h-4" /> : "Enter"}
        </Button>
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
    <div className="min-h-screen bg-[#0b1220] text-slate-100 px-6 py-12">
      <div className="max-w-3xl mx-auto space-y-8">
        <div>
          <div className="text-sm uppercase tracking-[0.3em] text-sky-400">ROAI Institute</div>
          <h1 className="text-2xl font-semibold">Future of Work Action Workshop — Facilitator</h1>
        </div>

        <Section title="Create a new workshop">
          <input
            placeholder="Workshop name (e.g. Acme Leadership Team — July 2026)"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-2"
          />
          <textarea
            placeholder="Short description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-2"
            rows={2}
          />
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-2"
          />
          <Button onClick={create}>
            <Plus className="inline w-4 h-4 mr-1" /> Create workshop
          </Button>
        </Section>

        <Section title="Existing workshops">
          <div className="space-y-2">
            {workshops.map((w) => (
              <button
                key={w.id}
                onClick={() => onSelect(w)}
                className="w-full text-left bg-slate-800/60 hover:bg-slate-800 border border-slate-700 rounded-lg px-4 py-3 flex items-center justify-between"
              >
                <div>
                  <div className="font-medium">{w.name}</div>
                  <div className="text-xs text-slate-400">{w.date} — status: {w.status}</div>
                </div>
                <span className="text-sky-400 text-sm">Open →</span>
              </button>
            ))}
            {workshops.length === 0 && <p className="text-slate-500 text-sm">No workshops yet.</p>}
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
    <div className="min-h-screen bg-[#0b1220] text-slate-100 px-6 py-10">
      <div className="max-w-5xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-sm uppercase tracking-[0.3em] text-sky-400">ROAI Institute</div>
            <h1 className="text-2xl font-semibold">{workshop.name}</h1>
            <p className="text-slate-400 text-sm">{workshop.date} · status: {status}</p>
          </div>
          <a href="/admin" className="text-sm text-slate-400 hover:text-slate-200">
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
              className="flex-1 bg-slate-800 border border-slate-700 rounded-lg px-3 py-2"
            />
            <input
              placeholder="Email"
              value={newEmail}
              onChange={(e) => setNewEmail(e.target.value)}
              className="flex-1 bg-slate-800 border border-slate-700 rounded-lg px-3 py-2"
            />
            <Button onClick={addParticipant}>
              <Plus className="inline w-4 h-4" />
            </Button>
          </div>
          <p className="text-sm text-slate-400">
            <Users className="inline w-4 h-4 mr-1" />
            {surveyCompletionCount}/{participants.length} completed the survey
          </p>
          <div className="divide-y divide-slate-800">
            {participants.map((p) => {
              const done = responses.some((r) => r.participantId === p.id);
              return (
                <div key={p.id} className="flex items-center justify-between py-2 text-sm">
                  <div>
                    <div className="font-medium">{p.name}</div>
                    <div className="text-slate-500">{p.email}</div>
                  </div>
                  <div className="flex items-center gap-3">
                    {done ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                    ) : (
                      <span className="text-slate-600 text-xs">pending</span>
                    )}
                    <button
                      onClick={() => navigator.clipboard.writeText(participantLink(p.token))}
                      className="text-sky-400 hover:text-sky-300 flex items-center gap-1"
                    >
                      <Copy className="w-3.5 h-3.5" /> link
                    </button>
                    <button onClick={() => removeParticipant(p.id)} className="text-red-400 hover:text-red-300">
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
                className="w-20 bg-slate-800 border border-slate-700 rounded-lg px-3 py-2"
              />
              <span className="text-sm text-slate-400">number of challenges to generate</span>
              <Button onClick={generateChallenges} disabled={generating || responses.length === 0}>
                {generating ? <Loader2 className="animate-spin inline w-4 h-4" /> : <Rocket className="inline w-4 h-4 mr-1" />}
                Generate challenges
              </Button>
            </div>
          ) : (
            <>
              <div className="grid md:grid-cols-2 gap-3">
                {challenges.map((c) => (
                  <div key={c.id} className="bg-slate-800/50 border border-slate-700 rounded-xl p-4">
                    <div className="font-medium">{c.title}</div>
                    <p className="text-sm text-slate-400 mt-1">{c.description}</p>
                    <div className="flex gap-1 mt-2 flex-wrap">
                      {c.themes?.map((t) => (
                        <span key={t} className="text-xs bg-sky-500/10 text-sky-300 px-2 py-0.5 rounded-full">
                          {t}
                        </span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
              {status === "survey" && <Button onClick={publishChallenges}>Publish challenges to participants</Button>}
            </>
          )}
        </Section>

        {/* Step 2: Groups */}
        {challenges.length > 0 && (
          <Section title="Step 2 · Groups (self-selected, max 4 per group)">
            {status === "challenges_ready" && <Button onClick={openGroupSelection}>Open group selection</Button>}
            {(status === "groups_open" || status === "challenges_ready") && (
              <div className="grid md:grid-cols-2 gap-3">
                {challenges.map((c) => {
                  const count = signups.filter((s) => s.challengeId === c.id).length;
                  return (
                    <div key={c.id} className="bg-slate-800/50 border border-slate-700 rounded-xl p-3 flex justify-between">
                      <span>{c.title}</span>
                      <span className="text-sky-400">{count} signed up</span>
                    </div>
                  );
                })}
              </div>
            )}
            {status === "groups_open" && <Button onClick={lockGroups}>Lock groups & auto-balance</Button>}
            {groups.length > 0 && (
              <div className="space-y-2 pt-2">
                {groups.map((g) => (
                  <div key={g.id} className="bg-slate-800/50 border border-slate-700 rounded-xl p-3 text-sm">
                    <div className="font-medium">{g.name}</div>
                    <div className="text-slate-400">
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
                  <div key={g.id} className="bg-slate-800/50 border border-slate-700 rounded-xl p-4">
                    <div className="flex items-center justify-between">
                      <div className="font-medium">{g.name}</div>
                      <Button variant="secondary" onClick={() => generateBoard(g)}>
                        {board ? <RefreshCw className="inline w-3.5 h-3.5 mr-1" /> : null}
                        {board ? "Regenerate board challenge" : "Get board challenge"}
                      </Button>
                    </div>
                    <p className="text-sm text-slate-400 mt-2 whitespace-pre-wrap">{sol?.solution || "No solution submitted yet."}</p>
                    {board && (
                      <div className="mt-3 grid sm:grid-cols-2 gap-2">
                        {board.personaChallenges.map((pc, i) => (
                          <div key={i} className="bg-slate-900/60 rounded-lg p-2 text-xs">
                            <div className="text-sky-400 font-semibold">{pc.role}</div>
                            <div className="text-slate-300">{pc.objection}</div>
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
            <p className="text-sm text-slate-400">
              Open{" "}
              <a href={`/present/${workshop.id}`} target="_blank" className="text-sky-400 underline">
                /present/{workshop.id}
              </a>{" "}
              on the room screen, then click a group below to bring it up.
            </p>
            <div className="flex flex-wrap gap-2">
              {groups.map((g) => (
                <Button key={g.id} variant="secondary" onClick={() => present(g.id)}>
                  {g.name}
                </Button>
              ))}
              <Button variant="secondary" onClick={() => present(null)}>
                Clear screen
              </Button>
            </div>
          </Section>
        )}

        {/* Step 5: Commitments */}
        {groups.length > 0 && (
          <Section title="Step 5 · Individual 30-day commitments">
            {status !== "commitments" && status !== "closed" && (
              <Button onClick={openCommitments}>Open commitment form to participants</Button>
            )}
            <div className="space-y-2">
              {commitments.map((c) => {
                const p = participants.find((p) => p.id === c.participantId);
                return (
                  <div key={c.id} className="bg-slate-800/50 border border-slate-700 rounded-xl p-3 text-sm">
                    <div className="font-medium">{p?.name || "Participant"}</div>
                    <div className="text-slate-400">{c.action}</div>
                  </div>
                );
              })}
            </div>
            {commitments.length > 0 && (
              <Button variant="secondary" onClick={generateReport}>
                {genReport ? <Loader2 className="animate-spin inline w-4 h-4 mr-1" /> : null}
                Generate final workshop report
              </Button>
            )}
          </Section>
        )}

        {report && (
          <Section title="Workshop report">
            <p className="text-slate-300">{report.executiveSummary}</p>
            <div className="flex flex-wrap gap-2">
              {report.keyThemes?.map((t: string) => (
                <span key={t} className="text-xs bg-sky-500/10 text-sky-300 px-2 py-0.5 rounded-full">
                  {t}
                </span>
              ))}
            </div>
            <div className="space-y-2">
              {report.groupHighlights?.map((g: any, i: number) => (
                <div key={i} className="bg-slate-800/50 border border-slate-700 rounded-xl p-3 text-sm">
                  <div className="font-medium">{g.groupName} — {g.challenge}</div>
                  <div className="text-slate-400">{g.coreInsight}</div>
                  <div className="text-sky-400 text-xs mt-1">Bold move: {g.boldMove}</div>
                </div>
              ))}
            </div>
            <p className="text-slate-300 text-sm">{report.commitmentPatterns}</p>
            <ul className="list-disc list-inside text-sm text-slate-300">
              {report.recommendedNextSteps?.map((s: string, i: number) => <li key={i}>{s}</li>)}
            </ul>
            <p className="text-slate-400 italic text-sm">{report.closingNote}</p>
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
