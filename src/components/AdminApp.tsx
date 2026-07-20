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
  BookOpen,
  CheckCircle2,
  ClipboardList,
  Copy,
  FileBarChart,
  FileText,
  Loader2,
  ListChecks,
  MessageSquareWarning,
  Pencil,
  Plus,
  PlayCircle,
  Presentation as PresentationIcon,
  RefreshCw,
  Rocket,
  Target,
  Trash2,
  Upload,
  Users,
  X,
} from "lucide-react";
import { col, docIn } from "../firebase";
import { cn } from "../utils";
import { downloadTemplate, parseParticipantsFile } from "../csvImport";
import { extractPdfText } from "../pdfExtract";
import type { ImportedRow } from "../csvImport";
import { Accordion, Btn, Card, FacilitatorBadge, Field, Modal, PageHeader, ROAILogo, StepTabs, Tag, TabIntro, TextArea } from "../ui";
import { PRESENTATION_SECTIONS } from "../types";
import type {
  BoardChallenge,
  Challenge,
  Group,
  GroupReport,
  GroupSolution,
  KnowledgeDoc,
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

function Section({ title, children }: { title: ReactNode; children: ReactNode }) {
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
          title="AI-Native Workshop Tool"
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

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
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

// ── Knowledge Base: reference material used to ground both the generated
// challenges and the C-level board feedback in this workshop's own content.
function KnowledgeBaseTab({ workshop, docs }: { workshop: Workshop; docs: KnowledgeDoc[] }) {
  const [name, setName] = useState("");
  const [content, setContent] = useState("");
  const [extracting, setExtracting] = useState(false);
  const fileInput = useRef<HTMLInputElement>(null);

  async function handleFile(file: File) {
    const baseName = file.name.replace(/\.[^/.]+$/, "");
    if (file.name.toLowerCase().endsWith(".pdf")) {
      setExtracting(true);
      try {
        const text = await extractPdfText(file);
        setName(baseName);
        setContent(text);
        if (!text.trim()) {
          alert("Couldn't find any text in that PDF — it may be scanned/image-only. Try pasting the text directly instead.");
        }
      } catch (e: any) {
        alert("Couldn't read that PDF: " + e.message);
      } finally {
        setExtracting(false);
      }
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      setName(baseName);
      setContent(String(reader.result || ""));
    };
    reader.readAsText(file);
  }

  async function addDoc_() {
    if (!name.trim() || !content.trim()) return;
    await addDoc(col.knowledgeDocs, {
      workshopId: workshop.id,
      name: name.trim(),
      content: content.trim(),
      createdAt: new Date().toISOString(),
    });
    setName("");
    setContent("");
    if (fileInput.current) fileInput.current.value = "";
  }

  async function removeDoc(id: string) {
    await deleteDoc(docIn("knowledgeDocs", id));
  }

  const totalChars = docs.reduce((sum, d) => sum + d.content.length, 0);

  return (
    <div>
      <TabIntro>
        Upload or paste the material this workshop is actually about — slides notes, briefs, prior reports, anything
        specific to it. Both the generated challenges and the C-level board's feedback will be grounded in this
        instead of generic AI content.
      </TabIntro>

      <div className="space-y-2 bg-gray-50 border border-gray-200 rounded-md p-4">
        <div className="flex items-center gap-2 flex-wrap">
          <label className="inline-flex items-center gap-2 font-semibold text-sm rounded-lg px-4 py-2 bg-white border border-gray-200 hover:border-[#DD4B4E] cursor-pointer text-[#14121F]">
            {extracting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
            {extracting ? "Reading PDF..." : "Upload .pdf / .txt / .md file"}
            <input
              ref={fileInput}
              type="file"
              accept=".pdf,.txt,.md"
              className="hidden"
              disabled={extracting}
              onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
            />
          </label>
          <span className="text-xs text-gray-400">— or just paste text below</span>
        </div>
        <Field label="Document name" value={name} onChange={setName} placeholder="e.g. Workshop brief, Q3 strategy notes" />
        <TextArea label="Content" value={content} onChange={setContent} rows={8} placeholder="Paste the material here..." />
        <Btn variant="coral" onClick={addDoc_} disabled={!name.trim() || !content.trim()}>
          <Plus className="w-4 h-4" /> Add document
        </Btn>
      </div>

      {docs.length > 0 && (
        <p className="text-xs text-gray-400 mt-4">{docs.length} document{docs.length === 1 ? "" : "s"} · {totalChars.toLocaleString()} characters total</p>
      )}

      <div className="space-y-2 mt-2">
        {docs.map((d) => (
          <Accordion
            key={d.id}
            title={d.name}
            subtitle={`${d.content.length.toLocaleString()} characters`}
            right={
              <button onClick={(e) => { e.stopPropagation(); removeDoc(d.id); }} className="text-gray-300 hover:text-red-500">
                <X className="w-4 h-4" />
              </button>
            }
          >
            <p className="text-xs text-gray-500 whitespace-pre-wrap max-h-48 overflow-y-auto">{d.content}</p>
          </Accordion>
        ))}
        {docs.length === 0 && <p className="text-gray-400 text-sm">No reference material yet — this is optional, but the challenges and board feedback will be more specific to your workshop with it.</p>}
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
    <div className="space-y-3 bg-gray-50 border border-gray-200 rounded-md p-4">
      <p className="text-sm text-gray-500">
        The pre-work survey is run externally. Upload the export — one row per participant, with name and their
        survey answers. Add an "Email" column yourself if your export doesn't include one.
      </p>
      <div className="flex gap-2 flex-wrap">
        <Btn variant="outline" onClick={() => downloadTemplate()}>Download template</Btn>
        <label className="inline-flex items-center gap-2 font-bold text-sm rounded-md px-4 py-2.5 bg-white border border-gray-200 hover:border-[#DD4B4E] cursor-pointer text-[#14121F]">
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
          <div className="max-h-72 overflow-auto border border-gray-200 rounded-md bg-white">
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
    </div>
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
  const [showBulk, setShowBulk] = useState(false);

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
      <button onClick={() => setShowBulk((v) => !v)} className="text-xs font-semibold text-[#DD4B4E] flex items-center gap-1">
        <Upload className="w-3.5 h-3.5" /> Add in bulk (CSV / Excel) {showBulk ? "▲" : "▼"}
      </button>
      {showBulk && <ImportSection workshop={workshop} />}

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
        <Btn variant="coral" onClick={addParticipant}>Add</Btn>
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
  const MAX_PER_GROUP = 7;
  const [groupName, setGroupName] = useState("");
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [showCreate, setShowCreate] = useState(false);
  const [activeGroupId, setActiveGroupId] = useState<string | null>(null);

  const assignedIds = new Set(groups.flatMap((g) => g.participantIds));
  const unassigned = participants.filter((p) => !assignedIds.has(p.id));
  const allAssigned = participants.length > 0 && unassigned.length === 0;

  function toggle(id: string) {
    const p = participants.find((p) => p.id === id);
    setSelectedIds((prev) => {
      if (prev.includes(id)) return prev.filter((x) => x !== id);
      if (prev.length >= MAX_PER_GROUP) return prev;
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
    setShowCreate(false);
  }

  async function deleteGroup(id: string) {
    await deleteDoc(docIn("groups", id));
    if (activeGroupId === id) setActiveGroupId(null);
  }

  async function removeMember(groupId: string, participantId: string, currentIds: string[]) {
    await updateDoc(docIn("groups", groupId), {
      participantIds: currentIds.filter((id) => id !== participantId),
    });
  }

  async function addMember(group: Group, participantId: string) {
    if (group.participantIds.length >= MAX_PER_GROUP) return;
    const p = participants.find((pp) => pp.id === participantId);
    if (p?.role === "facilitator" && group.participantIds.some((id) => participants.find((pp) => pp.id === id)?.role === "facilitator")) {
      alert("A group can have at most 1 facilitator.");
      return;
    }
    await updateDoc(docIn("groups", group.id), {
      participantIds: [...group.participantIds, participantId],
    });
  }

  const activeGroup = groups.find((g) => g.id === activeGroupId);
  const [editGroupName, setEditGroupName] = useState("");

  useEffect(() => {
    setEditGroupName(activeGroup?.name || "");
  }, [activeGroup?.id]);

  async function saveGroupName() {
    if (!activeGroup || !editGroupName.trim() || editGroupName === activeGroup.name) return;
    await updateDoc(docIn("groups", activeGroup.id), { name: editGroupName.trim() });
  }

  return (
    <Section
      title={
        <div className="flex items-center justify-between">
          <span>Groups (max {MAX_PER_GROUP}, max 1 facilitator)</span>
          {participants.length > 0 && (
            <Tag color={allAssigned ? "green" : "amber"}>
              {allAssigned ? "All participants assigned" : `${unassigned.length} not yet assigned`}
            </Tag>
          )}
        </div>
      }
    >
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {groups.map((g) => {
          const members = g.participantIds.map((id) => participants.find((p) => p.id === id)).filter(Boolean) as Participant[];
          return (
            <button
              key={g.id}
              onClick={() => { setActiveGroupId(activeGroupId === g.id ? null : g.id); setShowCreate(false); }}
              className={`min-h-[4.5rem] border rounded-lg p-3 flex flex-col justify-between text-left transition-colors ${
                activeGroupId === g.id ? "border-[#DD4B4E] bg-[#DD4B4E]/5" : "bg-white border-gray-200 hover:border-gray-300"
              }`}
            >
              <div className="font-bold text-[#14121F] text-sm leading-snug">{g.name}</div>
              <div className="text-xs text-gray-400">{members.length}/{MAX_PER_GROUP} members</div>
            </button>
          );
        })}
        <button
          onClick={() => { setShowCreate((v) => !v); setActiveGroupId(null); }}
          className="min-h-[4.5rem] border border-dashed border-gray-300 hover:border-[#DD4B4E] rounded-lg flex flex-col items-center justify-center gap-1 text-gray-400 hover:text-[#DD4B4E] transition-colors"
        >
          <Plus className="w-5 h-5" />
          <span className="text-xs font-semibold">New group</span>
        </button>
      </div>

      {showCreate && (
        <div className="space-y-2 bg-gray-50 border border-gray-200 rounded-md p-4">
          <Field label="Group name" value={groupName} onChange={setGroupName} placeholder="e.g. Group 1 — Ops Leaders" />
          <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-1.5">
            Pick up to {MAX_PER_GROUP} unassigned participants ({selectedIds.length}/{MAX_PER_GROUP})
          </p>
          <div className="flex flex-wrap gap-2">
            {unassigned.map((p) => (
              <button key={p.id} onClick={() => toggle(p.id)}
                className={`inline-flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-md border font-medium transition-all ${
                  selectedIds.includes(p.id) ? "bg-[#DD4B4E]/10 border-[#DD4B4E] text-[#DD4B4E]" : "bg-white border-gray-200 text-gray-600 hover:border-[#DD4B4E]/40"
                }`}>
                {p.name}{p.role === "facilitator" && <FacilitatorBadge />}
              </button>
            ))}
            {unassigned.length === 0 && <p className="text-gray-400 text-xs">All participants are already assigned to a group.</p>}
          </div>
          <Btn variant="coral" onClick={createGroup} disabled={!groupName || selectedIds.length === 0}>
            <Plus className="w-4 h-4" /> Create group
          </Btn>
        </div>
      )}

      {activeGroup && (
        <div className="bg-gray-50 border border-gray-200 rounded-md p-4 space-y-3">
          <div className="flex items-center justify-between gap-2">
            <input
              value={editGroupName}
              onChange={(e) => setEditGroupName(e.target.value)}
              onBlur={saveGroupName}
              onKeyDown={(e) => e.key === "Enter" && (e.target as HTMLInputElement).blur()}
              className="font-bold text-sm text-[#14121F] bg-transparent border-b border-transparent hover:border-gray-300 focus:border-[#DD4B4E] outline-none px-0.5 py-0.5 flex-1 min-w-0"
            />
            <button onClick={() => deleteGroup(activeGroup.id)} className="text-gray-400 hover:text-red-500 text-xs font-semibold flex items-center gap-1 shrink-0">
              <Trash2 className="w-3.5 h-3.5" /> Delete group
            </button>
          </div>

          <div>
            <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-1.5">
              Members ({activeGroup.participantIds.length}/{MAX_PER_GROUP})
            </p>
            <div className="flex flex-wrap gap-1.5">
              {activeGroup.participantIds.map((id) => {
                const m = participants.find((p) => p.id === id);
                if (!m) return null;
                return (
                  <span key={m.id} className="inline-flex items-center gap-1.5 text-xs bg-white border border-gray-200 rounded-md pl-2 pr-1 py-0.5">
                    {m.name}{m.role === "facilitator" && <FacilitatorBadge />}
                    <button onClick={() => removeMember(activeGroup.id, m.id, activeGroup.participantIds)} className="text-gray-300 hover:text-red-500">
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                );
              })}
            </div>
          </div>

          {activeGroup.participantIds.length < MAX_PER_GROUP && (
            <div>
              <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-1.5">Add a member</p>
              <div className="flex flex-wrap gap-1.5">
                {unassigned.map((p) => (
                  <button
                    key={p.id}
                    onClick={() => addMember(activeGroup, p.id)}
                    className="inline-flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-md border border-dashed border-gray-300 text-gray-500 hover:border-[#DD4B4E] hover:text-[#DD4B4E] transition-colors"
                  >
                    <Plus className="w-3 h-3" /> {p.name}{p.role === "facilitator" && <FacilitatorBadge />}
                  </button>
                ))}
                {unassigned.length === 0 && <p className="text-gray-400 text-xs">Everyone else is already assigned to a group.</p>}
              </div>
            </div>
          )}
        </div>
      )}

      {groups.length === 0 && !showCreate && <p className="text-gray-400 text-sm">No groups yet — click "New group" above.</p>}
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
  knowledgeDocs,
}: {
  workshop: Workshop;
  adminSecret: string;
  participants: Participant[];
  responses: SurveyResponse[];
  groups: Group[];
  challenges: Challenge[];
  knowledgeDocs: KnowledgeDoc[];
}) {
  const [generatingAll, setGeneratingAll] = useState(false);
  const [editing, setEditing] = useState<Record<string, { title: string; description: string }>>({});
  const [numOptions, setNumOptions] = useState(3);

  const knowledgeBase = knowledgeDocs.map((d) => `--- ${d.name} ---\n${d.content}`).join("\n\n");

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
      knowledgeBase,
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
        You can edit the wording here, but <strong>picking which one the group works on happens on the facilitator's own link</strong> —
        not here, since it's their group's call.
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
              right={selected ? <Tag color="coral">{selected.title}</Tag> : <Tag>awaiting facilitator's pick</Tag>}
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
const WORKSHOP_COLUMNS: { step: "initial" | "board" | "actions"; label: string }[] = [
  { step: "initial", label: "Question 1" },
  { step: "board", label: "Board & revised answer" },
  { step: "actions", label: "30/60/90 actions" },
];

function columnForGroup(step: Group["currentStep"]): "initial" | "board" | "actions" {
  if (step === "board") return "board";
  if (step === "actions" || step === "done") return "actions";
  return "initial";
}

function WorkshopTab({
  workshop,
  groups,
  challenges,
  solutions,
  boards,
  knowledgeDocs,
}: {
  workshop: Workshop;
  groups: Group[];
  challenges: Challenge[];
  solutions: GroupSolution[];
  boards: BoardChallenge[];
  knowledgeDocs: KnowledgeDoc[];
}) {
  const [regenerating, setRegenerating] = useState<string | null>(null);
  const [openGroupId, setOpenGroupId] = useState<string | null>(null);
  const knowledgeBase = knowledgeDocs.map((d) => `--- ${d.name} ---\n${d.content}`).join("\n\n");

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
          knowledgeBase,
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

  if (workshop.status === "setup") {
    return (
      <Section title="Workshop">
        <p className="text-sm text-gray-500">
          The workshop hasn't launched yet. Use the <span className="font-semibold text-[#DD4B4E]">Launch workshop</span> button
          in Group & Challenge (next to the step tabs) once your groups have challenge options generated — facilitators pick
          theirs as their first step, right after you launch.
        </p>
      </Section>
    );
  }

  if (groups.length === 0) {
    return (
      <Section title="Workshop">
        <p className="text-gray-400 text-sm">No groups yet — set them up in Group & Challenge.</p>
      </Section>
    );
  }

  const openGroup = groups.find((g) => g.id === openGroupId);
  const openChallenge = openGroup ? challenges.find((c) => c.id === openGroup.challengeId) : undefined;
  const openSolution = openGroup ? solutions.find((s) => s.groupId === openGroup.id) : undefined;
  const openBoard = openGroup ? boards.find((b) => b.groupId === openGroup.id) : undefined;

  return (
    <div>
      <TabIntro>Every group, at a glance. Tap a group to see what it's done so far.</TabIntro>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {WORKSHOP_COLUMNS.map((col) => {
          const colGroups = groups.filter((g) => columnForGroup(g.currentStep) === col.step);
          return (
            <div key={col.step}>
              <div className="flex items-center justify-between mb-2 px-1">
                <p className="text-xs font-bold uppercase tracking-wide text-gray-500">{col.label}</p>
                <span className="text-xs text-gray-400">{colGroups.length}</span>
              </div>
              <div className="space-y-2">
                {colGroups.map((g) => {
                  const sol = solutions.find((s) => s.groupId === g.id);
                  const done = g.currentStep === "done";
                  let caption = "In progress";
                  if (col.step === "initial") caption = "Writing initial answer";
                  else if (col.step === "board") caption = sol?.revisedSubmitted ? "Revised — moving on" : boards.some((b) => b.groupId === g.id) ? "Responding to the board" : "Board challenge generating";
                  else if (col.step === "actions") caption = done ? "Complete" : "Writing 30/60/90 actions";
                  return (
                    <button
                      key={g.id}
                      onClick={() => setOpenGroupId(g.id)}
                      className="w-full text-left bg-white border border-gray-200 hover:border-[#DD4B4E]/40 rounded-lg p-3 transition-colors"
                    >
                      <div className="font-bold text-sm text-[#14121F]">{g.name}</div>
                      <div className="flex items-center gap-1.5 mt-1">
                        {done && <Tag color="green">done</Tag>}
                        <span className="text-xs text-gray-400">{caption}</span>
                      </div>
                    </button>
                  );
                })}
                {colGroups.length === 0 && <p className="text-xs text-gray-300 px-1">No groups here.</p>}
              </div>
            </div>
          );
        })}
      </div>

      {openGroup && (
        <Modal title={openGroup.name} onClose={() => setOpenGroupId(null)}>
          {!openChallenge ? (
            <p className="text-sm text-gray-400">No challenge selected yet — waiting on the facilitator.</p>
          ) : (
            <div className="space-y-3">
              <div className="border-l-4 border-[#3545A3] bg-[#3545A3]/5 rounded-r-lg p-4">
                <div className="flex items-center gap-2 mb-1.5">
                  <Target className="w-4 h-4 text-[#3545A3]" />
                  <p className="text-xs font-bold uppercase tracking-wide text-[#3545A3]">Challenge</p>
                </div>
                <p className="text-sm text-[#14121F]">{openChallenge.title}</p>
                <p className="text-xs text-gray-500 mt-1">{openChallenge.description}</p>
              </div>

              <div className="border-l-4 border-[#DD4B4E] bg-[#DD4B4E]/5 rounded-r-lg p-4">
                <div className="flex items-center justify-between mb-1.5">
                  <div className="flex items-center gap-2">
                    <FileText className="w-4 h-4 text-[#DD4B4E]" />
                    <p className="text-xs font-bold uppercase tracking-wide text-[#DD4B4E]">Their solution</p>
                  </div>
                  {openSolution?.initialSubmitted && <Tag color="green">submitted</Tag>}
                </div>
                <p className="text-sm text-gray-700 whitespace-pre-wrap">{openSolution?.initialSolution || "Not submitted yet."}</p>
              </div>

              {openBoard && (
                <div className="bg-[#14121F] rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <MessageSquareWarning className="w-4 h-4 text-[#DD4B4E]" />
                    <p className="text-xs font-bold uppercase tracking-wide text-[#DD4B4E]">Board feedback</p>
                  </div>
                  <div className="grid sm:grid-cols-2 gap-2">
                    {openBoard.personaChallenges.map((pc, i) => (
                      <div key={i} className="bg-white/5 rounded-md p-2.5 text-xs">
                        <div className="text-[#DD4B4E] font-bold uppercase tracking-widest text-[10px] mb-1">{pc.role}</div>
                        <div className="text-white">{pc.objection}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {openSolution?.initialSubmitted && (
                <Btn variant="outline" onClick={() => regenerateBoard(openGroup, openChallenge, openSolution)} loading={regenerating === openGroup.id}>
                  <RefreshCw className="w-3.5 h-3.5" /> {openBoard ? "Regenerate" : "Generate"} board challenge
                </Btn>
              )}

              {openBoard && (
                <div className="border-l-4 border-[#1FA398] bg-[#1FA398]/5 rounded-r-lg p-4">
                  <div className="flex items-center justify-between mb-1.5">
                    <div className="flex items-center gap-2">
                      <RefreshCw className="w-4 h-4 text-[#1FA398]" />
                      <p className="text-xs font-bold uppercase tracking-wide text-[#1FA398]">Reviewed solution</p>
                    </div>
                    {openSolution?.revisedSubmitted && <Tag color="green">submitted</Tag>}
                  </div>
                  <p className="text-sm text-gray-700 whitespace-pre-wrap">{openSolution?.revisedSolution || "Not submitted yet."}</p>
                </div>
              )}

              {openSolution?.actionsSubmitted && (
                <div>
                  <div className="flex items-center gap-2 mb-2 px-1">
                    <ListChecks className="w-4 h-4 text-gray-500" />
                    <p className="text-xs font-bold uppercase tracking-wide text-gray-500">30 / 60 / 90-day actions</p>
                  </div>
                  <div className="grid sm:grid-cols-3 gap-2">
                    <div className="border-l-4 border-[#3545A3] bg-[#3545A3]/5 rounded-r-lg p-3">
                      <p className="text-[10px] font-bold uppercase tracking-widest text-[#3545A3] mb-1">30 days</p>
                      <p className="text-xs text-gray-700 whitespace-pre-wrap">{openSolution.action30}</p>
                    </div>
                    <div className="border-l-4 border-[#DD4B4E] bg-[#DD4B4E]/5 rounded-r-lg p-3">
                      <p className="text-[10px] font-bold uppercase tracking-widest text-[#DD4B4E] mb-1">60 days</p>
                      <p className="text-xs text-gray-700 whitespace-pre-wrap">{openSolution.action60}</p>
                    </div>
                    <div className="border-l-4 border-[#1FA398] bg-[#1FA398]/5 rounded-r-lg p-3">
                      <p className="text-[10px] font-bold uppercase tracking-widest text-[#1FA398] mb-1">90 days</p>
                      <p className="text-xs text-gray-700 whitespace-pre-wrap">{openSolution.action90}</p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </Modal>
      )}
    </div>
  );
}

// ── Presentation tab: plenary big-screen control ─────────────────────────
function PresentationTab({ workshop, groups }: { workshop: Workshop; groups: Group[] }) {
  async function present(groupId: string | null) {
    await updateDoc(docIn("workshops", workshop.id), {
      presentationGroupId: groupId,
      presentationSections: [],
      status: "presentation",
    });
  }

  async function toggleSection(key: string) {
    const current = workshop.presentationSections || [];
    const next = current.includes(key) ? current.filter((k) => k !== key) : [...current, key];
    await updateDoc(docIn("workshops", workshop.id), { presentationSections: next });
  }

  const activeGroup = groups.find((g) => g.id === workshop.presentationGroupId);
  const activeSections = workshop.presentationSections || [];

  return (
    <div className="space-y-6">
      <TabIntro>
        Open <a href={`/present/${workshop.id}`} target="_blank" className="text-[#DD4B4E] font-bold underline">/present/{workshop.id}</a>{" "}
        on the room screen. Pick which group is presenting, then reveal only the part(s) they're actually talking about —
        no group ever covers everything, so show just what's relevant as they go.
      </TabIntro>

      <div>
        <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-1.5">Who's presenting</p>
        <div className="flex flex-wrap gap-2">
          {groups.map((g) => (
            <button
              key={g.id}
              onClick={() => present(g.id)}
              className={`text-xs px-3 py-1.5 rounded-md border font-medium transition-all ${
                workshop.presentationGroupId === g.id
                  ? "bg-[#DD4B4E]/10 border-[#DD4B4E] text-[#DD4B4E]"
                  : "bg-white border-gray-200 text-gray-600 hover:border-[#DD4B4E]/40"
              }`}
            >
              {g.name}
            </button>
          ))}
          <button
            onClick={() => present(null)}
            className="text-xs px-3 py-1.5 rounded-md border border-dashed border-gray-300 text-gray-400 hover:border-gray-400 transition-all"
          >
            Clear screen
          </button>
        </div>
      </div>

      {activeGroup && (
        <div>
          <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-1.5">What to reveal on screen</p>
          <div className="flex flex-wrap gap-2">
            {PRESENTATION_SECTIONS.map((s) => (
              <button
                key={s.key}
                onClick={() => toggleSection(s.key)}
                className={`text-xs px-3 py-1.5 rounded-md border font-medium transition-all ${
                  activeSections.includes(s.key)
                    ? "bg-[#DD4B4E]/10 border-[#DD4B4E] text-[#DD4B4E]"
                    : "bg-white border-gray-200 text-gray-600 hover:border-[#DD4B4E]/40"
                }`}
              >
                {s.label}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ── Report tab: mark the workshop closed, then a report per group ───────
function ReportTab({
  workshop,
  adminSecret,
  groups,
  challenges,
  solutions,
  boards,
}: {
  workshop: Workshop;
  adminSecret: string;
  groups: Group[];
  challenges: Challenge[];
  solutions: GroupSolution[];
  boards: BoardChallenge[];
}) {
  const [reports, setReports] = useState<GroupReport[]>([]);
  const [generating, setGenerating] = useState<string | null>(null);
  const [activeGroupId, setActiveGroupId] = useState<string | null>(groups[0]?.id ?? null);
  const [editing, setEditing] = useState(false);
  const [editSummary, setEditSummary] = useState("");
  const [editInsight, setEditInsight] = useState("");
  const [editEvolution, setEditEvolution] = useState("");
  const [editSteps, setEditSteps] = useState("");

  useEffect(() => onSnapshot(query(col.groupReports, where("workshopId", "==", workshop.id)), (s) =>
    setReports(s.docs.map((d) => ({ id: d.id, ...d.data() } as GroupReport)))
  ), [workshop.id]);

  useEffect(() => {
    if (!activeGroupId && groups.length > 0) setActiveGroupId(groups[0].id);
  }, [groups, activeGroupId]);

  const activeGroup = groups.find((g) => g.id === activeGroupId);
  const activeReport = activeGroup ? reports.find((r) => r.groupId === activeGroup.id) : undefined;

  useEffect(() => {
    setEditing(false);
    setEditSummary(activeReport?.executiveSummary || "");
    setEditInsight(activeReport?.keyInsight || "");
    setEditEvolution(activeReport?.evolution || "");
    setEditSteps((activeReport?.recommendedNextSteps || []).join("\n"));
  }, [activeGroup?.id, activeReport?.id]);

  async function closeWorkshop() {
    await updateDoc(docIn("workshops", workshop.id), { status: "closed" });
  }

  async function reopenWorkshop() {
    await updateDoc(docIn("workshops", workshop.id), { status: "working" });
  }

  async function generateReport(g: Group) {
    const challenge = challenges.find((c) => c.id === g.challengeId);
    if (!challenge) return alert("This group never picked a challenge.");
    const sol = solutions.find((s) => s.groupId === g.id);
    const board = boards.find((b) => b.groupId === g.id);
    setGenerating(g.id);
    try {
      const result = await api("/generate-group-report", adminSecret, {
        workshop: { name: workshop.name },
        group: { name: g.name },
        challenge: { title: challenge.title, description: challenge.description },
        solution: sol,
        personaChallenges: board?.personaChallenges,
      });
      await setDoc(docIn("groupReports", g.id), {
        groupId: g.id,
        workshopId: workshop.id,
        ...result,
        status: "draft",
        createdAt: new Date().toISOString(),
      });
    } catch (e: any) {
      alert(e.message);
    } finally {
      setGenerating(null);
    }
  }

  async function approveReport() {
    if (!activeGroup) return;
    await updateDoc(docIn("groupReports", activeGroup.id), { status: "approved" });
  }

  async function reopenReport() {
    if (!activeGroup) return;
    await updateDoc(docIn("groupReports", activeGroup.id), { status: "draft" });
  }

  async function saveEdits() {
    if (!activeGroup) return;
    await setDoc(docIn("groupReports", activeGroup.id), {
      groupId: activeGroup.id,
      workshopId: workshop.id,
      executiveSummary: editSummary,
      keyInsight: editInsight,
      evolution: editEvolution,
      recommendedNextSteps: editSteps.split("\n").map((s) => s.trim()).filter(Boolean),
      createdAt: activeReport?.createdAt || new Date().toISOString(),
    }, { merge: true });
    setEditing(false);
  }

  if (groups.length === 0) {
    return <Section title="Report"><p className="text-gray-400 text-sm">No groups.</p></Section>;
  }

  return (
    <div>
      <TabIntro>
        Generate a report for each group once their work is done. The facilitator can review and edit it from their
        own link, then submit it for your approval — approve it here once it looks right, or reopen it for more edits.
        Mark the workshop as closed when everyone's finished.
      </TabIntro>
      <StepTabs
        steps={groups.map((g) => ({ key: g.id, label: g.name }))}
        active={activeGroupId || groups[0].id}
        onChange={setActiveGroupId}
        right={
          workshop.status === "closed" ? (
            <div className="flex items-center gap-2">
              <Tag color="green">Workshop closed</Tag>
              <Btn variant="outline" onClick={reopenWorkshop} className="text-xs px-3 py-1.5">
                Reopen workshop
              </Btn>
            </div>
          ) : (
            <Btn variant="coral" onClick={closeWorkshop} className="text-xs px-3 py-1.5">
              Mark workshop as closed
            </Btn>
          )
        }
      />

      {activeGroup && (
        <Section
          title={
            <div className="flex items-center justify-between">
              <span>{activeGroup.name}</span>
              {activeReport && (
                <Tag color={activeReport.status === "approved" ? "green" : activeReport.status === "submitted" ? "coral" : "default"}>
                  {activeReport.status === "approved" ? "Approved" : activeReport.status === "submitted" ? "Submitted by facilitator" : "Draft"}
                </Tag>
              )}
            </div>
          }
        >
          <div className="flex items-center gap-2 flex-wrap">
            <Btn variant="outline" onClick={() => generateReport(activeGroup)} loading={generating === activeGroup.id} disabled={!activeGroup.challengeId}>
              {activeReport && <RefreshCw className="w-3.5 h-3.5" />}
              {activeReport ? "Regenerate report" : "Generate report"}
            </Btn>
            {activeReport && !editing && (
              <Btn variant="outline" onClick={() => setEditing(true)}>
                <Pencil className="w-3.5 h-3.5" /> Edit
              </Btn>
            )}
            {activeReport?.status === "submitted" && (
              <Btn variant="success" onClick={approveReport}>
                <CheckCircle2 className="w-3.5 h-3.5" /> Approve
              </Btn>
            )}
            {activeReport?.status === "approved" && (
              <Btn variant="outline" onClick={reopenReport}>Reopen for edits</Btn>
            )}
          </div>

          {activeReport && editing && (
            <div className="space-y-3 pt-2">
              <TextArea label="Executive summary" value={editSummary} onChange={setEditSummary} rows={3} />
              <TextArea label="Key insight" value={editInsight} onChange={setEditInsight} rows={2} />
              <TextArea label="How their thinking evolved" value={editEvolution} onChange={setEditEvolution} rows={3} />
              <TextArea label="Recommended next steps (one per line)" value={editSteps} onChange={setEditSteps} rows={4} />
              <div className="flex items-center gap-2">
                <Btn variant="coral" onClick={saveEdits}>Save changes</Btn>
                <Btn variant="outline" onClick={() => setEditing(false)}>Cancel</Btn>
              </div>
            </div>
          )}

          {activeReport && !editing && (
            <div className="space-y-3 pt-2">
              <p className="text-gray-600 text-sm">{activeReport.executiveSummary}</p>
              <div className="border-l-4 border-[#3545A3] bg-[#3545A3]/5 rounded-r-lg p-3">
                <p className="text-[10px] font-bold uppercase tracking-widest text-[#3545A3] mb-1">Key insight</p>
                <p className="text-sm text-[#14121F]">{activeReport.keyInsight}</p>
              </div>
              <div className="border-l-4 border-[#1FA398] bg-[#1FA398]/5 rounded-r-lg p-3">
                <p className="text-[10px] font-bold uppercase tracking-widest text-[#1FA398] mb-1">How their thinking evolved</p>
                <p className="text-sm text-gray-700">{activeReport.evolution}</p>
              </div>
              <ul className="list-disc list-inside text-sm text-gray-600">
                {activeReport.recommendedNextSteps?.map((s, i) => <li key={i}>{s}</li>)}
              </ul>
            </div>
          )}
        </Section>
      )}
    </div>
  );
}

// ── Workshop Dashboard ───────────────────────────────────────────────────
function WorkshopDashboard({ workshop: initialWorkshop, adminSecret, onBackToList }: { workshop: Workshop; adminSecret: string; onBackToList: () => void }) {
  const [tab, setTab] = useState<"knowledge" | "pre" | "workshop" | "presentation" | "report">("knowledge");
  const [preStep, setPreStep] = useState<"participants" | "groups" | "challenges">("participants");
  const [workshop, setWorkshop] = useState<Workshop>(initialWorkshop);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [responses, setResponses] = useState<SurveyResponse[]>([]);
  const [challenges, setChallenges] = useState<Challenge[]>([]);
  const [groups, setGroups] = useState<Group[]>([]);
  const [solutions, setSolutions] = useState<GroupSolution[]>([]);
  const [boards, setBoards] = useState<BoardChallenge[]>([]);
  const [knowledgeDocs, setKnowledgeDocs] = useState<KnowledgeDoc[]>([]);

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
  useEffect(() => onSnapshot(query(col.knowledgeDocs, where("workshopId", "==", workshop.id)), (s) =>
    setKnowledgeDocs(s.docs.map((d) => ({ id: d.id, ...d.data() } as KnowledgeDoc)))
  ), [workshop.id]);

  const facilitatorLink = `${window.location.origin}/w/${workshop.id}`;
  const publicLink = `${window.location.origin}/groups/${workshop.id}`;
  const presentationLink = `${window.location.origin}/present/${workshop.id}`;

  const [editingDetails, setEditingDetails] = useState(false);
  const [showMobileMenu, setShowMobileMenu] = useState(false);
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
    { key: "knowledge" as const, label: "Knowledge Base", icon: BookOpen },
    { key: "pre" as const, label: "Group & Challenge", icon: ClipboardList },
    { key: "workshop" as const, label: "Workshop", icon: PlayCircle },
    { key: "presentation" as const, label: "Presentation", icon: PresentationIcon },
    { key: "report" as const, label: "Report", icon: FileBarChart },
  ];

  return (
    <div className="min-h-screen bg-white flex">
      {/* Mobile top bar — logo + back to workshop list (sidebar is desktop-only) */}
      <div className="lg:hidden fixed top-0 left-0 right-0 z-40 bg-white border-b border-gray-200 px-4 py-3 flex items-center justify-between">
        <ROAILogo size="sm" />
        <button onClick={onBackToList} className="text-xs font-semibold text-gray-500 hover:text-[#14121F]">
          ← All workshops
        </button>
      </div>

      {/* Sidebar — desktop only */}
      <aside className="hidden lg:flex w-60 shrink-0 border-r border-gray-200 flex-col h-screen sticky top-0">
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
          <button onClick={onBackToList} className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-semibold text-gray-500 hover:bg-gray-50 hover:text-[#14121F] text-left">
            ← All workshops
          </button>
        </div>
      </aside>

      {/* Bottom tab bar — mobile only */}
      <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-white border-t border-gray-200 flex items-stretch">
        {navItems.map((item) => {
          const Icon = item.icon;
          const active = tab === item.key;
          const shortLabels: Record<string, string> = {
            "Group & Challenge": "Groups",
            "Presentation": "Present",
          };
          return (
            <button
              key={item.key}
              onClick={() => setTab(item.key)}
              className={cn(
                "flex-1 flex flex-col items-center justify-center gap-0.5 py-2 text-[10px] font-semibold transition-colors",
                active ? "text-[#DD4B4E]" : "text-gray-400"
              )}
            >
              <Icon className="w-5 h-5" />
              {shortLabels[item.label] || item.label}
            </button>
          );
        })}
      </nav>

      {/* Main content */}
      <main className="flex-1 min-w-0 px-4 py-4 pt-20 pb-24 lg:px-8 lg:py-8 lg:pt-8 lg:pb-8">
        <div className="max-w-6xl">
          <PageHeader
            eyebrow={`${workshop.date} · status: ${workshop.status}`}
            title={
              <span className="inline-flex items-center gap-2">
                {workshop.name}
                <button onClick={openEditDetails} className="text-gray-300 hover:text-[#DD4B4E] transition-colors" title="Edit workshop details">
                  <Pencil className="w-4 h-4" />
                </button>
              </span>
            }
            right={
              <div className="relative">
                {/* Desktop — unchanged */}
                <div className="hidden lg:flex items-center gap-2 flex-wrap justify-end">
                  <button onClick={() => navigator.clipboard.writeText(facilitatorLink)}
                    className="text-[#DD4B4E] hover:bg-[#DD4B4E]/5 flex items-center gap-1.5 font-semibold text-xs bg-white border border-[#DD4B4E]/20 rounded-lg px-3 py-1.5">
                    <Copy className="w-3.5 h-3.5" /> Facilitator link
                  </button>
                  <button onClick={() => navigator.clipboard.writeText(publicLink)}
                    className="text-[#14121F] hover:bg-gray-50 flex items-center gap-1.5 font-semibold text-xs bg-white border border-gray-200 rounded-lg px-3 py-1.5">
                    <Copy className="w-3.5 h-3.5" /> Public groups link
                  </button>
                  <button onClick={() => navigator.clipboard.writeText(presentationLink)}
                    className="text-[#14121F] hover:bg-gray-50 flex items-center gap-1.5 font-semibold text-xs bg-white border border-gray-200 rounded-lg px-3 py-1.5">
                    <Copy className="w-3.5 h-3.5" /> Presentation link
                  </button>
                </div>

                {/* Mobile — single "⋯" trigger with a dropdown */}
                <div className="lg:hidden">
                  <button onClick={() => setShowMobileMenu((v) => !v)}
                    className="text-gray-500 bg-white border border-gray-200 rounded-lg px-3 py-1.5 font-bold">
                    ⋯
                  </button>
                  {showMobileMenu && (
                    <div className="absolute right-0 mt-1 w-56 bg-white border border-gray-200 rounded-lg shadow-lg z-30 overflow-hidden">
                      <button onClick={() => { navigator.clipboard.writeText(facilitatorLink); setShowMobileMenu(false); }}
                        className="w-full text-left px-3 py-2.5 text-sm text-[#DD4B4E] hover:bg-gray-50 flex items-center gap-2">
                        <Copy className="w-3.5 h-3.5" /> Facilitator link
                      </button>
                      <button onClick={() => { navigator.clipboard.writeText(publicLink); setShowMobileMenu(false); }}
                        className="w-full text-left px-3 py-2.5 text-sm text-gray-600 hover:bg-gray-50 flex items-center gap-2">
                        <Copy className="w-3.5 h-3.5" /> Public groups link
                      </button>
                      <button onClick={() => { navigator.clipboard.writeText(presentationLink); setShowMobileMenu(false); }}
                        className="w-full text-left px-3 py-2.5 text-sm text-gray-600 hover:bg-gray-50 flex items-center gap-2">
                        <Copy className="w-3.5 h-3.5" /> Presentation link
                      </button>
                    </div>
                  )}
                </div>
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

          {tab === "knowledge" && <KnowledgeBaseTab workshop={workshop} docs={knowledgeDocs} />}

          {tab === "pre" && (
            <div className="space-y-6">
              <TabIntro>
                Import your participants, form their groups, then generate and pick the boardroom-level challenge each
                group will work on.
              </TabIntro>
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
                right={
                  workshop.status === "setup" ? (
                    <span title={!groups.some((g) => challenges.some((c) => c.groupId === g.id)) ? "At least one group needs its challenge options generated first." : undefined}>
                      <Btn
                        variant="coral"
                        onClick={launchWorkshop}
                        disabled={!groups.some((g) => challenges.some((c) => c.groupId === g.id))}
                        className="text-xs px-3 py-1.5"
                      >
                        <PlayCircle className="w-3.5 h-3.5" /> Launch workshop
                      </Btn>
                    </span>
                  ) : undefined
                }
              />

              {preStep === "participants" && (
                <ParticipantsSection workshop={workshop} participants={participants} responses={responses} />
              )}

              {preStep === "groups" && (
                <CreateGroupsSection workshop={workshop} participants={participants} groups={groups} />
              )}

              {preStep === "challenges" && (
                <>
                  <ChallengesSection
                    workshop={workshop}
                    adminSecret={adminSecret}
                    participants={participants}
                    responses={responses}
                    groups={groups}
                    challenges={challenges}
                    knowledgeDocs={knowledgeDocs}
                  />
                  {workshop.status === "setup" && (
                    <p className="text-xs text-gray-400">
                      Once you've generated challenge options for your groups, use the{" "}
                      <span className="font-semibold text-[#DD4B4E]">Launch workshop</span> button next to the tabs above —
                      facilitators will pick theirs as the first thing they do once it's live.
                    </p>
                  )}
                </>
              )}
            </div>
          )}

          {tab === "workshop" && (
            <WorkshopTab
              workshop={workshop}
              groups={groups}
              challenges={challenges}
              solutions={solutions}
              boards={boards}
              knowledgeDocs={knowledgeDocs}
            />
          )}

          {tab === "presentation" && <PresentationTab workshop={workshop} groups={groups} />}

          {tab === "report" && (
            <ReportTab
              workshop={workshop}
              adminSecret={adminSecret}
              groups={groups}
              challenges={challenges}
              solutions={solutions}
              boards={boards}
            />
          )}
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
  return <WorkshopDashboard workshop={workshop} adminSecret={adminSecret} onBackToList={() => setWorkshop(null)} />;
}
