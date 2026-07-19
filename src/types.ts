export type WorkshopStatus =
  | "setup"        // importing participants, forming groups, picking challenges
  | "working"      // launched — groups are moving through their 3 timed activities
  | "presentation" // plenary
  | "closed";

export interface Workshop {
  id: string;
  name: string;
  description: string;
  date: string;
  adminSecret: string;
  createdAt: string;
  status: WorkshopStatus;
  presentationGroupId?: string | null;
  presentationSections?: string[]; // which parts of the group's work are shown on /present — admin picks live
}

export type ParticipantRole = "participant" | "facilitator";

export interface Participant {
  id: string;
  workshopId: string;
  name: string;
  email: string;
  role: ParticipantRole;
  createdAt: string;
}

// Survey is completed OUTSIDE the tool (currently a FormAssembly form) and
// imported (CSV/XLSX export), or occasionally entered by hand.
export interface SurveyResponse {
  id: string;
  participantId: string;
  workshopId: string;
  aiRelationship: string; // "How would you describe your organization's current relationship with AI?"
  futureVision: string; // "How do you think AI is going to change the future of work for your organization?"
  opportunitiesChallenges: string; // "What opportunities or challenges do you see with AI and your workforce?"
  createdAt: string;
}

export type ChallengeStatus = "option" | "selected";

export interface Challenge {
  id: string;
  workshopId: string;
  groupId: string; // challenges are generated per-group, from that group's members' survey answers
  title: string;
  description: string;
  themes: string[];
  status: ChallengeStatus;
  createdAt: string;
}

export type GroupStep = "initial" | "board" | "actions" | "done";

export const GROUP_STEP_LABELS: Record<GroupStep, string> = {
  initial: "Question 1",
  board: "C-Level Board Challenge & Revised Answer",
  actions: "30 / 60 / 90-Day Actions",
  done: "Complete",
};

// The pieces of a group's work that the admin can choose to reveal, one or
// more at a time, on the plenary /present screen — reused by both AdminApp's
// Presentation tab (as toggles) and PresentationView (to decide what renders).
export type PresentationSectionKey = "challenge" | "solution" | "board" | "reviewed" | "actions";

export const PRESENTATION_SECTIONS: { key: PresentationSectionKey; label: string }[] = [
  { key: "challenge", label: "Challenge" },
  { key: "solution", label: "Their solution" },
  { key: "board", label: "Board feedback" },
  { key: "reviewed", label: "Reviewed solution" },
  { key: "actions", label: "30/60/90 actions" },
];

export interface Group {
  id: string;
  workshopId: string;
  name: string;
  participantIds: string[]; // max 4
  challengeId?: string | null; // selected Challenge id, once chosen
  currentStep?: GroupStep; // drives the facilitator's 3-activity stepper, set when the workshop is launched
  stepStartedAt?: string; // ISO timestamp — start of the current 15-minute activity
  createdAt: string;
}

export interface GroupSolution {
  id: string; // == groupId
  groupId: string;
  workshopId: string;
  initialSolution: string;
  initialUpdatedAt?: string;
  initialSubmitted?: boolean;
  initialSubmittedAt?: string;
  revisedSolution: string;
  revisedUpdatedAt?: string;
  revisedSubmitted?: boolean;
  revisedSubmittedAt?: string;
  // Turning the discussion into action, right after the revised answer —
  // a group activity (written by the facilitator), not an individual one.
  action30: string;
  action60: string;
  action90: string;
  actionsSubmitted?: boolean;
  actionsSubmittedAt?: string;
}

export interface PersonaChallenge {
  role: string;
  objection: string;
  roaiTools: string[];
}

export interface BoardChallenge {
  id: string; // == groupId
  groupId: string;
  workshopId: string;
  personaChallenges: PersonaChallenge[];
  createdAt: string;
}

// Reference only — labels shown when reviewing imported survey answers.
// The actual survey is run externally; the tool never presents these as a form.
// Current version has 3 questions (simplified from an earlier 8-question version).
export const SURVEY_QUESTIONS = {
  aiRelationship: { label: "How would you describe your organization's current relationship with AI?" },
  futureVision: { label: "How do you think AI is going to change the future of work for your organization?" },
  opportunitiesChallenges: { label: "What opportunities or challenges do you see with AI and your workforce?" },
} as const;

// Column headers recognized in the participants+survey import file (CSV or XLSX).
// Matching strips all spaces/punctuation and checks for containment either way,
// so this works both with short slug-style headers AND with the full question
// text exported verbatim by external survey tools (e.g. FormAssembly, Typeform).
export const IMPORT_COLUMNS: { key: string; aliases: string[]; required: boolean }[] = [
  { key: "name", aliases: ["name", "fullname", "full name"], required: true },
  { key: "email", aliases: ["email", "e-mail"], required: false },
  { key: "role", aliases: ["role"], required: false },
  {
    key: "aiRelationship",
    aliases: ["ai relationship", "relationship with ai", "current relationship with ai"],
    required: false,
  },
  {
    key: "futureVision",
    aliases: ["future vision", "change the future of work", "future of work for your organization"],
    required: false,
  },
  {
    key: "opportunitiesChallenges",
    aliases: ["opportunities or challenges", "opportunities and challenges", "opportunities challenges"],
    required: false,
  },
];

// Headers we recognize but deliberately ignore (not shown as "unmatched").
export const IGNORED_IMPORT_COLUMNS = ["submitted date", "ip address", "response id", "submission id"];
