import { useEffect, useRef, useState } from "react";
import type { ReactNode } from "react";
import {
  addDoc,
  deleteDoc,
  getDocs,
  onSnapshot,
  query,
  setDoc,
  updateDoc,
  where,
} from "firebase/firestore";
import { nanoid } from "nanoid";
import {
  CheckCircle2,
  ClipboardList,
  Copy,
  Loader2,
  Pencil,
  Plus,
  PlayCircle,
  Presentation as PresentationIcon,
  RefreshCw,
  Rocket,
  Trash2,
  Upload,
  Users,
  X,
} from "lucide-react";
import { col, docIn } from "../firebase";
import { cn } from "../utils";
import { downloadTemplate, parseParticipantsFile } from "../csvImport";
import type { ImportedRow } from "../csvImport";
import { Accordion, Btn, Card, Field, PageHeader, ROAILogo, StepTabs, Tag, TextArea } from "../ui";
import { GROUP_STEP_LABELS } from "../types";
import type {
  BoardChallenge,
  Challenge,
  Group,
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

// Deletes a workshop and every document across collections that references
// it (participants, survey responses, groups, challenges, solutions, board
// challenges) so nothing orphaned is left behind in Firestore.
async function deleteWorkshopCascade(workshopId: string) {
  const collectionsToClean = [
    col.participants,
    col.surveyResponses,
    col.groups,
    col.challenges,
    col.groupSolutions,
    col.boardChallenges,
  ];
  for (const collectionRef of collectionsToClean) {
    const snap = await getDocs(query(collectionRef, where("workshopId", "==", workshopId)));
    for (const d of snap.docs) {
      await deleteDoc(d.ref);
    }
  }
  await deleteDoc(docIn("workshops", workshopId));
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <Card className="space-y-4">
      <h2 className="text-base font-bold text-[#14121F]">{title}</h2>
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
    <div className="min-h-screen bg-white flex items-center justify-center px-6">
      <div className="max-w-sm w-full space-y-6">
        <div className="flex justify-center"><ROAILogo size="md" /></div>
        <Card className="space-y-4">
          <h1 className="text-base font-bold text-[#14121F] text-center">Admin Access</h1>
          <input
            type="password"
            value={secret}
            onChange={(e) => setSecret(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && submit()}
            placeholder="Admin secret"
            className="w-full bg-white border border-gray-200 rounded-lg px-3 py-2.5 text-sm outline-none focus:border-[#DD4B4E]"
          />
          {error && <p className="text-red-500 text-sm font-medium">{error}</p>}
          <Btn variant="coral" onClick={submit} loading={loading} className="w-full justify-center">Enter</Btn>
        </Card>
      </div>
    </div>
  );
}

// ── Create / Select Workshop ────────────────────────────────────────────
function WorkshopPicker({ adminSecret, onSelect }: { adminSecret: string; onSelect: (w: Workshop) => void }) {
  const [workshops, setWorkshops] = useState<Workshop[]>([]);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [date, setDate] = useState("");
  const [showCreate, setShowCreate] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  useEffect(() => {
    return onSnapshot(col.workshops, (snap) => {
      setWorkshops(
        snap.docs.map((d) => ({ id: d.id, ...d.data() } as Workshop)).sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1))
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
      status: "setup",
      presentationGroupId: null,
    });
    onSelect({ id: ref.id, name, description, date, adminSecret, createdAt: new Date().toISOString(), status: "setup" });
  }

  async function deleteWorkshop(w: Workshop) {
    if (!confirm(`Delete "${w.name}"? This removes all its participants, groups, and answers. This can't be undone.`)) return;
    setDeletingId(w.id);
    try {
      await deleteWorkshopCascade(w.id);
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <div className="min-h-screen bg-white">
      <div className="max-w-3xl mx-auto px-6 py-10 space-y-6">
        <div className="flex items-center justify-between mb-2">
          <ROAILogo size="md" />
          <span className="text-xs font-semibold text-gray-400">Admin</span>
        </div>
        <PageHeader
          title="Future of Work Action Workshop"
          subtitle="Pick a workshop to open, or create a new one."
        />

        {showCreate && (
          <Card className="space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-bold text-[#14121F]">Create a new workshop</h2>
              <button onClick={() => setShowCreate(false)} className="text-gray-400 hover:text-gray-600"><X className="w-4 h-4" /></button>
            </div>
            <Field label="Workshop name" value={name} onChange={setName} placeholder="e.g. Acme Leadership Team — July 2026" />
            <TextArea label="Short description" value={description} onChange={setDescription} rows={2} />
            <div>
              <label className="block text-xs font-semibold text-gray-500 mb-1.5">Date</label>
              <input type="date" value={date} onChange={(e) => setDate(e.target.value)}
                className="w-full bg-white border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-[#DD4B4E]" />
            </div>
            <Btn variant="coral" onClick={create} disabled={!name || !date}><Plus className="w-4 h-4" /> Create workshop</Btn>
          </Card>
        )}

        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {workshops.map((w) => (
            <div
              key={w.id}
              onClick={() => onSelect(w)}
              className="relative aspect-square bg-white hover:bg-gray-50 border border-gray-200 hover:border-gray-300 rounded-lg p-4 flex flex-col justify-between text-left transition-colors cursor-pointer group"
            >
              <button
                onClick={(e) => { e.stopPropagation(); deleteWorkshop(w); }}
                disabled={deletingId === w.id}
                className="absolute top-2 right-2 p-1.5 rounded-md text-gray-300 opacity-0 group-hover:opacity-100 hover:bg-red-50 hover:text-red-500 transition-all"
              >
                {deletingId === w.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
              </button>
              <div>
                <div className="font-bold text-[#14121F] text-sm leading-snug line-clamp-3 pr-5">{w.name}</div>
              </div>
              <div>
                <Tag color={w.status === "closed" ? "green" : "coral"}>{w.status}</Tag>
                <div className="text-xs text-gray-400 mt-1.5">{w.date}</div>
              </div>
            </div>
          ))}
          <button
            onClick={() => setShowCreate(true)}
            className="aspect-square border border-dashed border-gray-300 hover:border-[#DD4B4E] rounded-lg flex flex-col items-center justify-center gap-1.5 text-gray-400 hover:text-[#DD4B4E] transition-colors"
          >
            <Plus className="w-6 h-6" />
            <span className="text-xs font-semibold">New workshop</span>
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Import participants + survey answers from CSV/XLSX ─────────────────
function ImportSection({ workshop }: { workshop: Workshop }) {
  const [rows, setRows] = useState<ImportedRow[] | null>(null);
  const [unmatched, setUnmatched] = useState<string[]>([]);
  const [importing, setImporting] = useState(false);
  const [done, setDone] = useState(false);
  const fileInput = useRef<HTMLInputElement>(null);

  async function handleFile(file: File) {
    setDone(false);
    const { rows, unmatchedHeaders } = await parseParticipantsFile(file);
    setRows(rows);
    setUnmatched(unmatchedHeaders);
  }

  async function confirmImport() {
    if (!rows) return;
    setImporting(true);
    try {
      for (const r of rows) {
        if (r._error) continue;
        const pRef = await addDoc(col.participants, {
          workshopId: workshop.id,
          name: r.name,
          email: r.email,
          role: r.role,
          createdAt: new Date().toISOString(),
        });
        const hasSurveyData = [r.aiRelationship, r.futureVision, r.opportunitiesChallenges].some((v) => v && v.length > 0);
        if (hasSurveyData) {
          await addDoc(col.surveyResponses, {
            participantId: pRef.id,
            workshopId: workshop.id,
            aiRelationship: r.aiRelationship,
            futureVision: r.futureVision,
            opportunitiesChallenges: r.opportunitiesChallenges,
            createdAt: new Date().toISOString(),
          });
        }
      }
      setDone(true);
      setRows(null);
      if (fileInput.current) fileInput.current.value = "";
    } finally {
      setImporting(false);
    }
  }

  const validCount = rows?.filter((r) => !r._error).length || 0;
  const errorCount = rows?.filter((r) => r._error).length || 0;

  return (
    <Section title="Import participants & survey answers (CSV / Excel)">
      <p className="text-sm text-gray-500">
        The pre-work survey is run externally. Upload the export — one row per participant, with name and their
        survey answers. Add an "Email" column yourself if your export doesn't include one.
      </p>
      <div className="flex gap-2 flex-wrap">
        <Btn variant="outline" onClick={() => downloadTemplate()}>Download template</Btn>
        <label className="inline-flex items-center gap-2 font-bold text-sm rounded-md px-4 py-2.5 bg-gray-50 border border-gray-200 hover:border-[#DD4B4E] cursor-pointer text-[#14121F]">
          <Upload className="w-4 h-4" /> Choose file
          <input
            ref={fileInput}
            type="file"
            accept=".csv,.xlsx,.xls"
            className="hidden"
            onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
          />
        </label>
      </div>

      {unmatched.length > 0 && (
        <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
          Columns not recognized (ignored): {unmatched.join(", ")}
        </p>
      )}

      {rows && rows.length > 0 && (
        <div className="space-y-3">
          <p className="text-sm text-gray-600">
            <span className="font-bold text-green-600">{validCount} ready to import</span>
            {errorCount > 0 && <span className="text-red-500 font-bold"> · {errorCount} with errors (skipped)</span>}
          </p>
          <div className="max-h-72 overflow-auto border border-gray-200 rounded-md">
            <table className="w-full text-xs">
              <thead className="bg-gray-50 sticky top-0">
                <tr>
                  <th className="text-left p-2 font-bold text-gray-400 uppercase tracking-wide">Row</th>
                  <th className="text-left p-2 font-bold text-gray-400 uppercase tracking-wide">Name</th>
                  <th className="text-left p-2 font-bold text-gray-400 uppercase tracking-wide">Email</th>
                  <th className="text-left p-2 font-bold text-gray-400 uppercase tracking-wide">Role</th>
                  <th className="text-left p-2 font-bold text-gray-400 uppercase tracking-wide">Status</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r._rowNumber} className="border-t border-gray-100">
                    <td className="p-2 text-gray-400">{r._rowNumber}</td>
                    <td className="p-2 font-medium text-[#14121F]">{r.name}</td>
                    <td className="p-2 text-gray-500">{r.email}</td>
                    <td className="p-2">{r.role === "facilitator" ? <Tag color="coral">facilitator</Tag> : <Tag>participant</Tag>}</td>
                    <td className="p-2">{r._error ? <span className="text-red-500 font-bold">{r._error}</span> : <span className="text-green-600 font-bold">OK</span>}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <Btn variant="coral" onClick={confirmImport} loading={importing} disabled={validCount === 0}>
            Import {validCount} participants
          </Btn>
        </div>
      )}

      {done && (
        <p className="text-green-600 text-sm font-medium flex items-center gap-1.5">
          <CheckCircle2 className="w-4 h-4" /> Import complete.
        </p>
      )}
    </Section>
  );
}

// ── Participants list + manual add + survey answers ─────────────────────
function ParticipantsSection({
  workshop,
  participants,
  responses,
}: {
  workshop: Workshop;
  participants: Participant[];
  responses: SurveyResponse[];
}) {
  const [newName, setNewName] = useState("");
  const [newEmail, setNewEmail] = useState("");
  const [newRole, setNewRole] = useState<"participant" | "facilitator">("participant");

  async function addParticipant() {
    if (!newName) return;
    await addDoc(col.participants, {
      workshopId: workshop.id,
      name: newName,
      email: newEmail,
      role: newRole,
      createdAt: new Date().toISOString(),
    });
    setNewName("");
    setNewEmail("");
    setNewRole("participant");
  }

  async function removeParticipant(id: string) {
    await deleteDoc(docIn("participants", id));
  }

  async function toggleRole(p: Participant) {
    await updateDoc(docIn("participants", p.id), {
      role: p.role === "facilitator" ? "participant" : "facilitator",
    });
  }

  return (
    <Section title="Participants">
      <div className="flex gap-2 flex-wrap items-end">
        <div className="flex-1 min-w-[160px]">
          <input placeholder="Full name" value={newName} onChange={(e) => setNewName(e.target.value)}
            className="w-full bg-gray-50 border border-gray-200 rounded-md px-3 py-2 text-sm outline-none focus:border-[#DD4B4E]" />
        </div>
        <div className="flex-1 min-w-[160px]">
          <input placeholder="Email (optional)" value={newEmail} onChange={(e) => setNewEmail(e.target.value)}
            className="w-full bg-gray-50 border border-gray-200 rounded-md px-3 py-2 text-sm outline-none focus:border-[#DD4B4E]" />
        </div>
        <select value={newRole} onChange={(e) => setNewRole(e.target.value as any)}
          className="bg-gray-50 border border-gray-200 rounded-md px-3 py-2 text-sm outline-none focus:border-[#DD4B4E]">
          <option value="participant">Participant</option>
          <option value="facilitator">Facilitator</option>
        </select>
        <Btn variant="coral" onClick={addParticipant}><Plus className="w-4 h-4" /></Btn>
      </div>

      <p className="text-sm text-gray-500 flex items-center gap-1.5">
        <Users className="w-4 h-4" />
        {responses.length}/{participants.length} have survey answers on file
      </p>

      <div className="space-y-2">
        {participants.map((p) => {
          const response = responses.find((r) => r.participantId === p.id);
          return (
            <Accordion
              key={p.id}
              title={
                <span className="flex items-center gap-2">
                  {p.name}
                  {p.role === "facilitator" && <Tag color="coral">facilitator</Tag>}
                </span>
              }
              subtitle={p.email || undefined}
              right={
                <>
                  {response ? <Tag color="green">survey on file</Tag> : <Tag>no survey</Tag>}
                  <button onClick={(e) => { e.stopPropagation(); toggleRole(p); }} className="text-gray-400 hover:text-[#DD4B4E] font-semibold text-xs">
                    {p.role === "facilitator" ? "make participant" : "make facilitator"}
                  </button>
                  <button onClick={(e) => { e.stopPropagation(); removeParticipant(p.id); }} className="text-gray-400 hover:text-red-500 font-semibold text-xs">
                    remove
                  </button>
                </>
              }
            >
              {response ? (
                <div className="space-y-2 text-xs text-gray-600">
                  <div><span className="font-semibold text-gray-400 uppercase tracking-wide text-[10px]">AI relationship: </span>{response.aiRelationship}</div>
                  <div><span className="font-semibold text-gray-400 uppercase tracking-wide text-[10px]">Future vision: </span>{response.futureVision}</div>
                  <div><span className="font-semibold text-gray-400 uppercase tracking-wide text-[10px]">Opportunities/challenges: </span>{response.opportunitiesChallenges}</div>
                </div>
              ) : (
                <p className="text-xs text-gray-400">No survey answers on file for this participant.</p>
              )}
            </Accordion>
          );
        })}
        {participants.length === 0 && <p className="text-gray-400 text-sm py-2">No participants yet — import a file or add one above.</p>}
      </div>
    </Section>
  );
}

// ── Groups: manual creation (max 4, max 1 facilitator) + challenge setup ─
function CreateGroupsSection({
  workshop,
  participants,
  groups,
}: {
  workshop: Workshop;
  participants: Participant[];
  groups: Group[];
}) {
  const [groupName, setGroupName] = useState("");
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  const assignedIds = new Set(groups.flatMap((g) => g.participantIds));
  const unassigned = participants.filter((p) => !assignedIds.has(p.id));

  function toggle(id: string) {
    const p = participants.find((p) => p.id === id);
    setSelectedIds((prev) => {
      if (prev.includes(id)) return prev.filter((x) => x !== id);
      if (prev.length >= 4) return prev;
      if (p?.role === "facilitator") {
        const alreadyHasFacilitator = prev.some((pid) => participants.find((pp) => pp.id === pid)?.role === "facilitator");
        if (alreadyHasFacilitator) {
          alert("A group can have at most 1 facilitator.");
          return prev;
        }
      }
      return [...prev, id];
    });
  }

  async function createGroup() {
    if (!groupName || selectedIds.length === 0) return;
    await addDoc(col.groups, {
      workshopId: workshop.id,
      name: groupName,
      participantIds: selectedIds,
      challengeId: null,
      createdAt: new Date().toISOString(),
    });
    setGroupName("");
    setSelectedIds([]);
  }

  async function deleteGroup(id: string) {
    await deleteDoc(docIn("groups", id));
  }

  async function removeMember(groupId: string, participantId: string, currentIds: string[]) {
    await updateDoc(docIn("groups", groupId), {
      participantIds: currentIds.filter((id) => id !== participantId),
    });
  }

  return (
    <Section title="Groups (max 4, max 1 facilitator)">
      <div className="space-y-2 bg-gray-50 border border-gray-200 rounded-md p-4">
        <Field label="Group name" value={groupName} onChange={setGroupName} placeholder="e.g. Group 1 — Ops Leaders" />
        <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-1.5">
          Pick up to 4 unassigned participants ({selectedIds.length}/4)
        </p>
        <div className="flex flex-wrap gap-2">
          {unassigned.map((p) => (
            <button key={p.id} onClick={() => toggle(p.id)}
              className={`text-xs px-3 py-1.5 rounded-md border font-medium transition-all ${
                selectedIds.includes(p.id) ? "bg-[#DD4B4E]/10 border-[#DD4B4E] text-[#DD4B4E]" : "bg-white border-gray-200 text-gray-600 hover:border-[#DD4B4E]/40"
              }`}>
              {p.name}{p.role === "facilitator" ? " ★" : ""}
            </button>
          ))}
          {unassigned.length === 0 && <p className="text-gray-400 text-xs">All participants are already assigned to a group.</p>}
        </div>
        <Btn variant="coral" onClick={createGroup} disabled={!groupName || selectedIds.length === 0}>
          <Plus className="w-4 h-4" /> Create group
        </Btn>
      </div>

      <div className="space-y-2">
        {groups.map((g) => {
          const members = g.participantIds.map((id) => participants.find((p) => p.id === id)).filter(Boolean) as Participant[];
          return (
            <Accordion
              key={g.id}
              title={g.name}
              subtitle={`${members.length} member${members.length === 1 ? "" : "s"}`}
              right={
                <button onClick={(e) => { e.stopPropagation(); deleteGroup(g.id); }} className="text-gray-300 hover:text-red-500">
                  <X className="w-4 h-4" />
                </button>
              }
            >
              <div className="flex flex-wrap gap-1.5">
                {members.map((m) => (
                  <span key={m.id} className="inline-flex items-center gap-1 text-xs bg-gray-50 border border-gray-200 rounded-md pl-2 pr-1 py-0.5">
                    {m.name}{m.role === "facilitator" && <span className="text-[#DD4B4E] font-bold">★</span>}
                    <button onClick={() => removeMember(g.id, m.id, g.participantIds)} className="text-gray-300 hover:text-red-500">
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                ))}
              </div>
            </Accordion>
          );
        })}
        {groups.length === 0 && <p className="text-gray-400 text-sm">No groups yet — create one above.</p>}
      </div>
    </Section>
  );
}

function ChallengesSection({
  workshop,
  adminSecret,
  participants,
  responses,
  groups,
  challenges,
}: {
  workshop: Workshop;
  adminSecret: string;
  participants: Participant[];
  responses: SurveyResponse[];
  groups: Group[];
  challenges: Challenge[];
}) {
  const [generatingAll, setGeneratingAll] = useState(false);
  const [editing, setEditing] = useState<Record<string, { title: string; description: string }>>({});
  const [numOptions, setNumOptions] = useState(3);

  async function generateForGroup(group: Group) {
    const members = group.participantIds.map((id) => participants.find((p) => p.id === id)).filter(Boolean) as Participant[];
    const responsePayload = members.map((m) => {
      const r = responses.find((r) => r.participantId === m.id);
      return {
        participantName: m.name,
        aiRelationship: r?.aiRelationship || "",
        futureVision: r?.futureVision || "",
        opportunitiesChallenges: r?.opportunitiesChallenges || "",
      };
    });
    const { challenges: generated } = await api("/generate-group-challenges", adminSecret, {
      workshop: { name: workshop.name },
      groupName: group.name,
      responses: responsePayload,
      numOptions,
    });
    for (const c of generated) {
      await addDoc(col.challenges, {
        workshopId: workshop.id,
        groupId: group.id,
        title: c.title,
        description: c.description,
        themes: c.themes || [],
        status: "option",
        createdAt: new Date().toISOString(),
      });
    }
  }

  async function generateAllChallenges() {
    setGeneratingAll(true);
    try {
      const groupsNeeding = groups.filter((g) => !challenges.some((c) => c.groupId === g.id));
      for (const g of groupsNeeding) {
        await generateForGroup(g);
      }
    } catch (e: any) {
      alert(e.message);
    } finally {
      setGeneratingAll(false);
    }
  }

  async function selectChallenge(group: Group, challengeId: string) {
    const groupChallenges = challenges.filter((c) => c.groupId === group.id);
    for (const c of groupChallenges) {
      await updateDoc(docIn("challenges", c.id), { status: c.id === challengeId ? "selected" : "option" });
    }
    await updateDoc(docIn("groups", group.id), { challengeId });
  }

  function startEdit(c: Challenge) {
    setEditing((prev) => ({ ...prev, [c.id]: { title: c.title, description: c.description } }));
  }

  async function saveEdit(c: Challenge) {
    const edited = editing[c.id];
    if (!edited) return;
    await updateDoc(docIn("challenges", c.id), { title: edited.title, description: edited.description });
    setEditing((prev) => {
      const next = { ...prev };
      delete next[c.id];
      return next;
    });
  }

  const groupsWithoutChallenges = groups.filter((g) => !challenges.some((c) => c.groupId === g.id)).length;

  if (groups.length === 0) {
    return (
      <Section title="Challenges">
        <p className="text-gray-400 text-sm">Create at least one group first.</p>
      </Section>
    );
  }

  return (
    <Section title="Challenges">
      <p className="text-sm text-gray-500">
        One click generates challenge options for every group that doesn't have any yet, from that group's members' survey answers.
      </p>
      <div className="flex items-center gap-2 flex-wrap">
        <input type="number" min={2} max={5} value={numOptions} onChange={(e) => setNumOptions(Number(e.target.value))}
          className="w-16 bg-white border border-gray-200 rounded-lg px-2 py-1.5 text-sm outline-none focus:border-[#DD4B4E]" />
        <span className="text-xs text-gray-400">options/group</span>
        <Btn variant="coral" onClick={generateAllChallenges} loading={generatingAll} disabled={groupsWithoutChallenges === 0}>
          <Rocket className="w-4 h-4" /> Generate for {groupsWithoutChallenges || "all"}
        </Btn>
      </div>

      <div className="space-y-2">
        {groups.map((g) => {
          const groupChallenges = challenges.filter((c) => c.groupId === g.id);
          if (groupChallenges.length === 0) return null;
          const selected = groupChallenges.find((c) => c.status === "selected");
          return (
            <Accordion
              key={g.id}
              title={g.name}
              subtitle={`${groupChallenges.length} option${groupChallenges.length === 1 ? "" : "s"}`}
              right={selected ? <Tag color="coral">{selected.title}</Tag> : <Tag>not selected</Tag>}
            >
              <div className="space-y-2">
                {groupChallenges.map((c) => {
                  const isEditing = !!editing[c.id];
                  return (
                    <div key={c.id} className={`bg-white border rounded-lg p-3 ${c.status === "selected" ? "border-[#DD4B4E]" : "border-gray-200"}`}>
                      {isEditing ? (
                        <div className="space-y-2">
                          <input value={editing[c.id].title} onChange={(e) => setEditing((prev) => ({ ...prev, [c.id]: { ...prev[c.id], title: e.target.value } }))}
                            className="w-full font-bold text-sm border border-gray-200 rounded-lg px-2 py-1 outline-none focus:border-[#DD4B4E]" />
                          <textarea value={editing[c.id].description} rows={2}
                            onChange={(e) => setEditing((prev) => ({ ...prev, [c.id]: { ...prev[c.id], description: e.target.value } }))}
                            className="w-full text-xs border border-gray-200 rounded-lg px-2 py-1 outline-none focus:border-[#DD4B4E] resize-none" />
                          <Btn variant="coral" className="text-xs px-3 py-1.5" onClick={() => saveEdit(c)}>Save</Btn>
                        </div>
                      ) : (
                        <>
                          <div className="flex items-center justify-between">
                            <div className="font-bold text-sm text-[#14121F]">{c.title}</div>
                            {c.status === "selected" && <Tag color="coral">selected</Tag>}
                          </div>
                          <p className="text-xs text-gray-500 mt-1">{c.description}</p>
                          <div className="flex gap-2 mt-2">
                            {c.status !== "selected" && (
                              <Btn variant="coral" className="text-xs px-3 py-1.5" onClick={() => selectChallenge(g, c.id)}>Select this challenge</Btn>
                            )}
                            <Btn variant="outline" className="text-xs px-3 py-1.5" onClick={() => startEdit(c)}>Edit</Btn>
                          </div>
                        </>
                      )}
                    </div>
                  );
                })}
              </div>
            </Accordion>
          );
        })}
      </div>
    </Section>
  );
}

// ── Workshop tab: each group's 3-activity progress ───────────────────────
function WorkshopTab({
  workshop,
  participants,
  groups,
  challenges,
  solutions,
  boards,
}: {
  workshop: Workshop;
  participants: Participant[];
  groups: Group[];
  challenges: Challenge[];
  solutions: GroupSolution[];
  boards: BoardChallenge[];
}) {
  const [regenerating, setRegenerating] = useState<string | null>(null);

  async function regenerateBoard(group: Group, challenge: Challenge | undefined, solution: GroupSolution | undefined) {
    if (!challenge || !solution?.initialSolution) return alert("This group hasn't submitted an initial answer yet.");
    setRegenerating(group.id);
    try {
      const res = await fetch("/api/generate-board-challenge", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          challenge: { title: challenge.title, description: challenge.description },
          solution: solution.initialSolution,
          groupName: group.name,
        }),
      });
      if (!res.ok) throw new Error((await res.json()).error || "Request failed");
      const { personaChallenges } = await res.json();
      await setDoc(docIn("boardChallenges", group.id), {
        groupId: group.id,
        workshopId: workshop.id,
        personaChallenges,
        createdAt: new Date().toISOString(),
      });
    } catch (e: any) {
      alert(e.message);
    } finally {
      setRegenerating(null);
    }
  }

  return (
    <Section title="Question 1 → C-level board → revised answer → 30/60/90 actions">
      <p className="text-xs text-gray-400">
        Facilitators drive each group's 3 timed activities themselves (15 min each) — nothing to do here unless something
        needs a manual nudge.
      </p>
      <div className="space-y-2">
        {groups.map((g) => {
          const challenge = challenges.find((c) => c.id === g.challengeId);
          const sol = solutions.find((s) => s.groupId === g.id);
          const board = boards.find((b) => b.groupId === g.id);
          if (!challenge) {
            return (
              <div key={g.id} className="bg-white border border-gray-200 rounded-lg p-4 text-sm text-gray-400">
                {g.name} — no challenge selected yet (see Pre-workshop tab)
              </div>
            );
          }
          return (
            <Accordion
              key={g.id}
              title={g.name}
              subtitle={challenge.title}
              right={<Tag color={g.currentStep === "done" ? "green" : "coral"}>{GROUP_STEP_LABELS[g.currentStep || "initial"]}</Tag>}
            >
              <div className="space-y-3">
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400">Initial answer</p>
                    {sol?.initialSubmitted && <Tag color="green">submitted</Tag>}
                  </div>
                  <p className="text-sm text-gray-600 whitespace-pre-wrap">{sol?.initialSolution || "Not submitted yet."}</p>
                </div>

                {board && (
                  <div className="grid sm:grid-cols-2 gap-2">
                    {board.personaChallenges.map((pc, i) => (
                      <div key={i} className="bg-gray-50 border border-gray-200 rounded-lg p-3 text-xs">
                        <div className="text-[#DD4B4E] font-bold uppercase tracking-widest text-[10px] mb-1">{pc.role}</div>
                        <div className="text-[#14121F]">{pc.objection}</div>
                      </div>
                    ))}
                  </div>
                )}

                {(g.currentStep === "board" || g.currentStep === "actions" || g.currentStep === "done") && sol?.initialSubmitted && (
                  <Btn variant="outline" onClick={() => regenerateBoard(g, challenge, sol)} loading={regenerating === g.id}>
                    <RefreshCw className="w-3.5 h-3.5" /> {board ? "Regenerate" : "Generate"} board challenge
                  </Btn>
                )}

                {board && (
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400">Revised answer</p>
                      {sol?.revisedSubmitted && <Tag color="green">submitted</Tag>}
                    </div>
                    <p className="text-sm text-gray-600 whitespace-pre-wrap">{sol?.revisedSolution || "Not submitted yet."}</p>
                  </div>
                )}

                {sol?.actionsSubmitted && (
                  <div className="grid sm:grid-cols-3 gap-2 pt-2 border-t border-gray-200">
                    <div>
                      <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-1">30 days</p>
                      <p className="text-xs text-gray-600 whitespace-pre-wrap">{sol.action30}</p>
                    </div>
                    <div>
                      <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-1">60 days</p>
                      <p className="text-xs text-gray-600 whitespace-pre-wrap">{sol.action60}</p>
                    </div>
                    <div>
                      <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-1">90 days</p>
                      <p className="text-xs text-gray-600 whitespace-pre-wrap">{sol.action90}</p>
                    </div>
                  </div>
                )}
              </div>
            </Accordion>
          );
        })}
        {groups.length === 0 && <p className="text-gray-400 text-sm">No groups yet.</p>}
      </div>
    </Section>
  );
}

// ── Presentation tab: plenary big-screen control ─────────────────────────
function PresentationTab({ workshop, groups }: { workshop: Workshop; groups: Group[] }) {
  async function present(groupId: string | null) {
    await updateDoc(docIn("workshops", workshop.id), { presentationGroupId: groupId, status: "presentation" });
  }

  return (
    <Section title="Plenary presentation">
      <p className="text-sm text-gray-500">
        Open <a href={`/present/${workshop.id}`} target="_blank" className="text-[#DD4B4E] font-bold underline">/present/{workshop.id}</a>{" "}
        on the room screen, then click a group below to bring it up.
      </p>
      <div className="flex flex-wrap gap-2">
        {groups.map((g) => (
          <Btn key={g.id} variant="outline" onClick={() => present(g.id)}>{g.name}</Btn>
        ))}
        <Btn variant="outline" onClick={() => present(null)}>Clear screen</Btn>
      </div>
      {workshop.status !== "closed" && (
        <div className="pt-4 border-t border-gray-200">
          <Btn variant="coral" onClick={async () => updateDoc(docIn("workshops", workshop.id), { status: "closed" })}>
            Mark workshop as closed
          </Btn>
        </div>
      )}
      {workshop.status === "closed" && (
        <p className="text-green-600 text-sm font-medium flex items-center gap-1.5"><CheckCircle2 className="w-4 h-4" /> Workshop closed.</p>
      )}
    </Section>
  );
}

// ── Workshop Dashboard ───────────────────────────────────────────────────
function WorkshopDashboard({ workshop: initialWorkshop, adminSecret }: { workshop: Workshop; adminSecret: string }) {
  const [tab, setTab] = useState<"pre" | "workshop" | "presentation">("pre");
  const [preStep, setPreStep] = useState<"participants" | "groups" | "challenges">("participants");
  const [workshop, setWorkshop] = useState<Workshop>(initialWorkshop);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [responses, setResponses] = useState<SurveyResponse[]>([]);
  const [challenges, setChallenges] = useState<Challenge[]>([]);
  const [groups, setGroups] = useState<Group[]>([]);
  const [solutions, setSolutions] = useState<GroupSolution[]>([]);
  const [boards, setBoards] = useState<BoardChallenge[]>([]);

  useEffect(() => onSnapshot(docIn("workshops", initialWorkshop.id), (s) => {
    const data = s.data() as Workshop | undefined;
    if (data) setWorkshop({ id: initialWorkshop.id, ...data });
  }), [initialWorkshop.id]);
  useEffect(() => onSnapshot(query(col.participants, where("workshopId", "==", workshop.id)), (s) =>
    setParticipants(s.docs.map((d) => ({ id: d.id, ...d.data() } as Participant)))
  ), [workshop.id]);
  useEffect(() => onSnapshot(query(col.surveyResponses, where("workshopId", "==", workshop.id)), (s) =>
    setResponses(s.docs.map((d) => ({ id: d.id, ...d.data() } as SurveyResponse)))
  ), [workshop.id]);
  useEffect(() => onSnapshot(query(col.challenges, where("workshopId", "==", workshop.id)), (s) =>
    setChallenges(s.docs.map((d) => ({ id: d.id, ...d.data() } as Challenge)))
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

  const facilitatorLink = `${window.location.origin}/w/${workshop.id}`;
  const publicLink = `${window.location.origin}/groups/${workshop.id}`;

  const [editingDetails, setEditingDetails] = useState(false);
  const [editName, setEditName] = useState(workshop.name);
  const [editDescription, setEditDescription] = useState(workshop.description || "");
  const [editDate, setEditDate] = useState(workshop.date);

  function openEditDetails() {
    setEditName(workshop.name);
    setEditDescription(workshop.description || "");
    setEditDate(workshop.date);
    setEditingDetails(true);
  }

  async function saveDetails() {
    await updateDoc(docIn("workshops", workshop.id), {
      name: editName,
      description: editDescription,
      date: editDate,
    });
    setEditingDetails(false);
  }

  const [deletingWorkshop, setDeletingWorkshop] = useState(false);

  async function deleteThisWorkshop() {
    if (!confirm(`Delete "${workshop.name}"? This removes all its participants, groups, and answers. This can't be undone.`)) return;
    setDeletingWorkshop(true);
    try {
      await deleteWorkshopCascade(workshop.id);
      window.location.href = "/admin";
    } finally {
      setDeletingWorkshop(false);
    }
  }

  async function launchWorkshop() {
    await updateDoc(docIn("workshops", workshop.id), { status: "working" });
    const now = new Date().toISOString();
    for (const g of groups) {
      await updateDoc(docIn("groups", g.id), { currentStep: "initial", stepStartedAt: now });
    }
    setTab("workshop");
  }

  const navItems = [
    { key: "pre" as const, label: "Pre-workshop", icon: ClipboardList },
    { key: "workshop" as const, label: "Workshop", icon: PlayCircle },
    { key: "presentation" as const, label: "Presentation", icon: PresentationIcon },
  ];

  return (
    <div className="min-h-screen bg-white flex">
      {/* Sidebar */}
      <aside className="w-60 shrink-0 border-r border-gray-200 flex flex-col h-screen sticky top-0">
        <div className="p-5 border-b border-gray-200">
          <ROAILogo size="sm" />
        </div>
        <nav className="flex-1 p-3 space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const active = tab === item.key;
            return (
              <button
                key={item.key}
                onClick={() => setTab(item.key)}
                className={cn(
                  "w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-semibold transition-colors",
                  active ? "roai-mark text-white" : "text-gray-500 hover:bg-gray-50 hover:text-[#14121F]"
                )}
              >
                <Icon className="w-4 h-4" />
                {item.label}
              </button>
            );
          })}
        </nav>
        <div className="p-3 border-t border-gray-200 space-y-1">
          <a href="/admin" className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-semibold text-gray-500 hover:bg-gray-50 hover:text-[#14121F]">
            ← All workshops
          </a>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 min-w-0 px-8 py-8">
        <div className="max-w-6xl">
          <PageHeader
            eyebrow={`${workshop.date} · status: ${workshop.status}`}
            title={workshop.name}
            right={
              <div className="flex items-center gap-2">
                <button onClick={openEditDetails}
                  className="text-gray-500 hover:bg-gray-50 flex items-center gap-1.5 font-semibold text-xs bg-white border border-gray-200 rounded-lg px-3 py-1.5">
                  <Pencil className="w-3.5 h-3.5" /> Edit details
                </button>
                <button onClick={() => navigator.clipboard.writeText(facilitatorLink)}
                  className="text-[#DD4B4E] hover:bg-[#DD4B4E]/5 flex items-center gap-1.5 font-semibold text-xs bg-white border border-[#DD4B4E]/20 rounded-lg px-3 py-1.5">
                  <Copy className="w-3.5 h-3.5" /> Facilitator link
                </button>
                <button onClick={() => navigator.clipboard.writeText(publicLink)}
                  className="text-[#14121F] hover:bg-gray-50 flex items-center gap-1.5 font-semibold text-xs bg-white border border-gray-200 rounded-lg px-3 py-1.5">
                  <Copy className="w-3.5 h-3.5" /> Public groups link
                </button>
              </div>
            }
          />

          {editingDetails && (
            <Card className="space-y-3 mb-6">
              <div className="flex items-center justify-between">
                <h2 className="text-base font-bold text-[#14121F]">Edit workshop details</h2>
                <button onClick={() => setEditingDetails(false)} className="text-gray-400 hover:text-gray-600"><X className="w-4 h-4" /></button>
              </div>
              <Field label="Workshop name" value={editName} onChange={setEditName} />
              <TextArea label="Short description" value={editDescription} onChange={setEditDescription} rows={2} />
              <div>
                <label className="block text-xs font-semibold text-gray-500 mb-1.5">Date</label>
                <input type="date" value={editDate} onChange={(e) => setEditDate(e.target.value)}
                  className="w-full bg-white border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-[#DD4B4E]" />
              </div>
              <div className="flex items-center justify-between pt-2 border-t border-gray-100">
                <Btn variant="coral" onClick={saveDetails} disabled={!editName || !editDate}>Save changes</Btn>
                <Btn variant="danger" onClick={deleteThisWorkshop} loading={deletingWorkshop}>
                  <Trash2 className="w-3.5 h-3.5" /> Delete workshop
                </Btn>
              </div>
            </Card>
          )}

          {tab === "pre" && (
            <div className="space-y-6">
              <StepTabs
                steps={[
                  { key: "participants", label: "Participants" },
                  {
                    key: "groups",
                    label: "Groups",
                    locked: participants.length === 0,
                    lockedReason: "Add at least one participant first.",
                  },
                  {
                    key: "challenges",
                    label: "Challenges",
                    locked: groups.length === 0,
                    lockedReason: "Create at least one group first.",
                  },
                ]}
                active={preStep}
                onChange={(k) => setPreStep(k as typeof preStep)}
              />

              {preStep === "participants" && (
                <div className="space-y-4">
                  <ImportSection workshop={workshop} />
                  <ParticipantsSection workshop={workshop} participants={participants} responses={responses} />
                </div>
              )}

              {preStep === "groups" && (
                <CreateGroupsSection workshop={workshop} participants={participants} groups={groups} />
              )}

              {preStep === "challenges" && (
                <ChallengesSection
                  workshop={workshop}
                  adminSecret={adminSecret}
                  participants={participants}
                  responses={responses}
                  groups={groups}
                  challenges={challenges}
                />
              )}

              <Section title="Ready?">
                {workshop.status === "setup" ? (
                  <>
                    <p className="text-sm text-gray-500">
                      Once your groups have a challenge selected, launch the workshop — this unlocks each group's first
                      activity (Question 1) and switches you to the Workshop tab. From there, facilitators drive
                      their own group through all 3 activities; you'll mainly need the Presentation tab at the end.
                    </p>
                    <Btn
                      variant="coral"
                      onClick={launchWorkshop}
                      disabled={groups.length === 0 || !groups.some((g) => g.challengeId)}
                    >
                      Launch workshop
                    </Btn>
                    {groups.length > 0 && !groups.some((g) => g.challengeId) && (
                      <p className="text-xs text-gray-400">At least one group needs a selected challenge before you can launch.</p>
                    )}
                  </>
                ) : (
                  <p className="text-emerald-600 text-sm font-medium flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4" /> Workshop launched — participants are working through their activities.
                  </p>
                )}
              </Section>
            </div>
          )}

          {tab === "workshop" && (
            <WorkshopTab
              workshop={workshop}
              participants={participants}
              groups={groups}
              challenges={challenges}
              solutions={solutions}
              boards={boards}
            />
          )}

          {tab === "presentation" && <PresentationTab workshop={workshop} groups={groups} />}
        </div>
      </main>
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
