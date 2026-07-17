import { useEffect, useRef, useState } from "react";
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
  ChevronDown,
  ChevronUp,
  Copy,
  Loader2,
  Plus,
  RefreshCw,
  Rocket,
  Upload,
  Users,
  X,
} from "lucide-react";
import { col, docIn } from "../firebase";
import { downloadTemplate, parseParticipantsFile } from "../csvImport";
import type { ImportedRow } from "../csvImport";
import { Btn, Card, Field, ROAILogo, Tag, TextArea } from "../ui";
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
        <div className="flex justify-center"><ROAILogo size="lg" /></div>
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
            <input type="date" value={date} onChange={(e) => setDate(e.target.value)}
              className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-[#E8503A]" />
          </div>
          <Btn variant="coral" onClick={create}><Plus className="w-4 h-4" /> Create workshop</Btn>
        </Section>

        <Section title="Existing workshops">
          <div className="space-y-2">
            {workshops.map((w) => (
              <button key={w.id} onClick={() => onSelect(w)}
                className="w-full text-left bg-gray-50 hover:bg-[#E8503A]/5 border border-gray-200 hover:border-[#E8503A]/40 rounded-xl px-4 py-3 flex items-center justify-between transition-all group">
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
        <label className="inline-flex items-center gap-2 font-bold text-sm rounded-xl px-4 py-2.5 bg-gray-50 border border-gray-200 hover:border-[#E8503A] cursor-pointer text-[#0A0E2A]">
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
          <div className="max-h-72 overflow-auto border border-gray-200 rounded-xl">
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
                    <td className="p-2 font-medium text-[#0A0E2A]">{r.name}</td>
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
  const [expanded, setExpanded] = useState<string | null>(null);

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
            className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-sm outline-none focus:border-[#E8503A]" />
        </div>
        <div className="flex-1 min-w-[160px]">
          <input placeholder="Email (optional)" value={newEmail} onChange={(e) => setNewEmail(e.target.value)}
            className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-sm outline-none focus:border-[#E8503A]" />
        </div>
        <select value={newRole} onChange={(e) => setNewRole(e.target.value as any)}
          className="bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-sm outline-none focus:border-[#E8503A]">
          <option value="participant">Participant</option>
          <option value="facilitator">Facilitator</option>
        </select>
        <Btn variant="coral" onClick={addParticipant}><Plus className="w-4 h-4" /></Btn>
      </div>

      <p className="text-sm text-gray-500 flex items-center gap-1.5">
        <Users className="w-4 h-4" />
        {responses.length}/{participants.length} have survey answers on file
      </p>

      <div className="divide-y divide-gray-100">
        {participants.map((p) => {
          const response = responses.find((r) => r.participantId === p.id);
          const isExpanded = expanded === p.id;
          return (
            <div key={p.id} className="py-2.5 text-sm">
              <div className="flex items-center justify-between">
                <div>
                  <div className="font-bold text-[#0A0E2A] flex items-center gap-2">
                    {p.name}
                    {p.role === "facilitator" && <Tag color="coral">facilitator</Tag>}
                  </div>
                  {p.email && <div className="text-gray-400 text-xs">{p.email}</div>}
                </div>
                <div className="flex items-center gap-3">
                  {response ? (
                    <button onClick={() => setExpanded(isExpanded ? null : p.id)} className="text-green-600 flex items-center gap-1 font-bold text-xs">
                      <CheckCircle2 className="w-4 h-4" /> survey {isExpanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                    </button>
                  ) : (
                    <Tag>no survey</Tag>
                  )}
                  <button onClick={() => toggleRole(p)} className="text-gray-400 hover:text-[#E8503A] font-bold text-xs">
                    {p.role === "facilitator" ? "make participant" : "make facilitator"}
                  </button>
                  <button onClick={() => removeParticipant(p.id)} className="text-gray-400 hover:text-red-500 font-bold">remove</button>
                </div>
              </div>
              {isExpanded && response && (
                <div className="mt-2 ml-1 pl-3 border-l-2 border-gray-200 space-y-2 text-xs text-gray-600">
                  <div><span className="font-bold text-gray-400 uppercase tracking-wide text-[10px]">AI relationship: </span>{response.aiRelationship}</div>
                  <div><span className="font-bold text-gray-400 uppercase tracking-wide text-[10px]">Future vision: </span>{response.futureVision}</div>
                  <div><span className="font-bold text-gray-400 uppercase tracking-wide text-[10px]">Opportunities/challenges: </span>{response.opportunitiesChallenges}</div>
                </div>
              )}
            </div>
          );
        })}
        {participants.length === 0 && <p className="text-gray-400 text-sm py-2">No participants yet — import a file or add one above.</p>}
      </div>
    </Section>
  );
}

// ── Groups: manual creation (max 4, max 1 facilitator) + challenge setup ─
function GroupsSection({
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
  const [groupName, setGroupName] = useState("");
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [generatingAll, setGeneratingAll] = useState(false);
  const [editing, setEditing] = useState<Record<string, { title: string; description: string }>>({});
  const [numOptions, setNumOptions] = useState(3);

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

  return (
    <>
      <Section title="Create groups (max 4 per group, max 1 facilitator per group)">
        <div className="space-y-2 bg-gray-50 border border-gray-200 rounded-xl p-4">
          <Field label="Group name" value={groupName} onChange={setGroupName} placeholder="e.g. Group 1 — Ops Leaders" />
          <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-1.5">
            Pick up to 4 unassigned participants ({selectedIds.length}/4)
          </p>
          <div className="flex flex-wrap gap-2">
            {unassigned.map((p) => (
              <button key={p.id} onClick={() => toggle(p.id)}
                className={`text-xs px-3 py-1.5 rounded-full border font-medium transition-all ${
                  selectedIds.includes(p.id) ? "bg-[#E8503A]/10 border-[#E8503A] text-[#E8503A]" : "bg-white border-gray-200 text-gray-600 hover:border-[#E8503A]/40"
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
              <div key={g.id} className="relative bg-gray-50 border border-gray-200 rounded-xl p-3 flex items-center justify-between">
                <div>
                  <div className="font-bold text-[#0A0E2A] text-sm">{g.name}</div>
                  <div className="flex flex-wrap gap-1.5 mt-1">
                    {members.map((m) => (
                      <span key={m.id} className="inline-flex items-center gap-1 text-xs bg-white border border-gray-200 rounded-full pl-2 pr-1 py-0.5">
                        {m.name}{m.role === "facilitator" && <span className="text-[#E8503A] font-bold">★</span>}
                        <button onClick={() => removeMember(g.id, m.id, g.participantIds)} className="text-gray-300 hover:text-red-500">
                          <X className="w-3 h-3" />
                        </button>
                      </span>
                    ))}
                  </div>
                </div>
                <button onClick={() => deleteGroup(g.id)} className="text-gray-300 hover:text-red-500">
                  <X className="w-4 h-4" />
                </button>
              </div>
            );
          })}
          {groups.length === 0 && <p className="text-gray-400 text-sm">No groups yet — create one above.</p>}
        </div>
      </Section>

      {groups.length > 0 && (
        <Section title="Generate challenges for all groups">
          <p className="text-sm text-gray-500">
            One click generates challenge options for every group that doesn't have any yet, from that group's members' survey answers.
          </p>
          <div className="flex items-center gap-2">
            <input type="number" min={2} max={5} value={numOptions} onChange={(e) => setNumOptions(Number(e.target.value))}
              className="w-16 bg-gray-50 border border-gray-200 rounded-lg px-2 py-1.5 text-sm outline-none focus:border-[#E8503A]" />
            <span className="text-xs text-gray-400">options per group</span>
            <Btn variant="coral" onClick={generateAllChallenges} loading={generatingAll} disabled={groupsWithoutChallenges === 0}>
              <Rocket className="w-4 h-4" /> Generate challenges for {groupsWithoutChallenges || "all"} group{groupsWithoutChallenges === 1 ? "" : "s"}
            </Btn>
          </div>

          <div className="space-y-3">
            {groups.map((g) => {
              const groupChallenges = challenges.filter((c) => c.groupId === g.id);
              if (groupChallenges.length === 0) return null;
              return (
                <div key={g.id} className="bg-gray-50 border border-gray-200 rounded-xl p-4 space-y-2">
                  <div className="font-bold text-[#0A0E2A] text-sm">{g.name}</div>
                  {groupChallenges.map((c) => {
                    const isEditing = !!editing[c.id];
                    return (
                      <div key={c.id} className={`bg-white border rounded-lg p-3 ${c.status === "selected" ? "border-[#E8503A]" : "border-gray-200"}`}>
                        {isEditing ? (
                          <div className="space-y-2">
                            <input value={editing[c.id].title} onChange={(e) => setEditing((prev) => ({ ...prev, [c.id]: { ...prev[c.id], title: e.target.value } }))}
                              className="w-full font-bold text-sm border border-gray-200 rounded-lg px-2 py-1 outline-none focus:border-[#E8503A]" />
                            <textarea value={editing[c.id].description} rows={2}
                              onChange={(e) => setEditing((prev) => ({ ...prev, [c.id]: { ...prev[c.id], description: e.target.value } }))}
                              className="w-full text-xs border border-gray-200 rounded-lg px-2 py-1 outline-none focus:border-[#E8503A] resize-none" />
                            <Btn variant="coral" className="text-xs px-3 py-1.5" onClick={() => saveEdit(c)}>Save</Btn>
                          </div>
                        ) : (
                          <>
                            <div className="flex items-center justify-between">
                              <div className="font-bold text-sm text-[#0A0E2A]">{c.title}</div>
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
              );
            })}
          </div>
        </Section>
      )}
    </>
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
      <div className="space-y-3">
        {groups.map((g) => {
          const challenge = challenges.find((c) => c.id === g.challengeId);
          const sol = solutions.find((s) => s.groupId === g.id);
          const board = boards.find((b) => b.groupId === g.id);
          if (!challenge) {
            return (
              <div key={g.id} className="bg-gray-50 border border-gray-200 rounded-xl p-4 text-sm text-gray-400">
                {g.name} — no challenge selected yet (see Pre-workshop tab)
              </div>
            );
          }
          return (
            <div key={g.id} className="bg-gray-50 border border-gray-200 rounded-xl p-4 space-y-3">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div className="font-black text-[#0A0E2A]">{g.name}</div>
                <div className="flex items-center gap-2">
                  <Tag color="navy">{challenge.title}</Tag>
                  <Tag color={g.currentStep === "done" ? "green" : "coral"}>{GROUP_STEP_LABELS[g.currentStep || "initial"]}</Tag>
                </div>
              </div>

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
                    <div key={i} className="bg-white border border-gray-200 rounded-lg p-3 text-xs">
                      <div className="text-[#E8503A] font-bold uppercase tracking-widest text-[10px] mb-1">{pc.role}</div>
                      <div className="text-[#0A0E2A]">{pc.objection}</div>
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
        Open <a href={`/present/${workshop.id}`} target="_blank" className="text-[#E8503A] font-bold underline">/present/{workshop.id}</a>{" "}
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

  const workshopLink = `${window.location.origin}/w/${workshop.id}`;

  async function launchWorkshop() {
    await updateDoc(docIn("workshops", workshop.id), { status: "working" });
    const now = new Date().toISOString();
    for (const g of groups) {
      await updateDoc(docIn("groups", g.id), { currentStep: "initial", stepStartedAt: now });
    }
    setTab("workshop");
  }

  return (
    <div className="min-h-screen bg-[#F4F6FB] px-6 py-10">
      <div className="max-w-5xl mx-auto space-y-6">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-4">
            <ROAILogo size="sm" />
            <div className="h-8 w-px bg-gray-200" />
            <div>
              <h1 className="text-xl font-black text-[#0A0E2A]">{workshop.name}</h1>
              <p className="text-gray-400 text-xs">{workshop.date} · status: {workshop.status}</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="text-right">
              <button onClick={() => navigator.clipboard.writeText(workshopLink)}
                className="text-[#E8503A] hover:text-[#d4432f] flex items-center gap-1.5 font-bold text-sm bg-[#E8503A]/5 border border-[#E8503A]/20 rounded-lg px-3 py-1.5">
                <Copy className="w-3.5 h-3.5" /> Copy workshop link
              </button>
              <p className="text-[10px] text-gray-400 mt-1 max-w-[220px]">Same link for everyone — participants and facilitators pick their name after opening it.</p>
            </div>
            <a href="/admin" className="text-sm text-gray-400 hover:text-[#E8503A] font-bold">← All workshops</a>
          </div>
        </div>

        <div className="flex gap-1 bg-gray-100 rounded-xl p-1 w-fit">
          {[
            { key: "pre", label: "Pre-workshop" },
            { key: "workshop", label: "Workshop" },
            { key: "presentation", label: "Presentation" },
          ].map((t) => (
            <button key={t.key} onClick={() => setTab(t.key as any)}
              className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${
                tab === t.key ? "bg-white text-[#0A0E2A] shadow-sm" : "text-gray-400 hover:text-gray-600"
              }`}>
              {t.label}
            </button>
          ))}
        </div>

        {tab === "pre" && (
          <div className="space-y-6">
            <ImportSection workshop={workshop} />
            <ParticipantsSection workshop={workshop} participants={participants} responses={responses} />
            <GroupsSection
              workshop={workshop}
              adminSecret={adminSecret}
              participants={participants}
              responses={responses}
              groups={groups}
              challenges={challenges}
            />

            <Section title="Ready?">
              {workshop.status === "setup" ? (
                <>
                  <p className="text-sm text-gray-500">
                    Once your groups have a challenge selected, launch the workshop — this starts each group's first
                    15-minute activity (Question 1) and switches you to the Workshop tab. From there, facilitators drive
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
                <p className="text-green-600 text-sm font-medium flex items-center gap-1.5">
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
