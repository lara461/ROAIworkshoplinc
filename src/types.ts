export type WorkshopStatus =
  | "setup"        // importing participants, forming groups, picking challenges
  | "working"      // groups writing initial solution -> board challenge -> revised solution
  | "presentation" // plenary
  | "commitments"  // individual 30-day commitments open
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
}

export type ParticipantRole = "participant" | "facilitator";

export interface Participant {
  id: string;
  workshopId: string;
  name: string;
  email: string;
  token: string;
  role: ParticipantRole;
  createdAt: string;
}

// Survey is completed OUTSIDE the tool; these are imported (CSV/XLSX) or,
// occasionally, entered by hand for a participant added manually.
export interface SurveyResponse {
  id: string;
  participantId: string;
  workshopId: string;
  orgSize: string;
  aiRelationship: string;
  biggestConcern: string;
  futureOfWorkView: string;
  moveTimeline: string;
  futureVision: string;
  ownershipPreference: string;
  employeeFreedom: string;
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

export interface Group {
  id: string;
  workshopId: string;
  name: string;
  participantIds: string[]; // max 4
  challengeId?: string | null; // selected Challenge id, once chosen
  createdAt: string;
}

export interface GroupSolution {
  id: string; // == groupId
  groupId: string;
  workshopId: string;
  initialSolution: string;
  initialUpdatedAt?: string;
  revisedSolution: string;
  revisedUpdatedAt?: string;
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

export interface Commitment {
  id: string;
  participantId: string;
  workshopId: string;
  action: string;
  createdAt: string;
}

// Reference only — labels shown when reviewing imported survey answers.
// The actual survey is run externally; the tool never presents these as a form.
export const SURVEY_QUESTIONS = {
  orgSize: { label: "How many people work in your organization?" },
  aiRelationship: { label: "How would you describe your organization's current relationship with AI?" },
  biggestConcern: { label: "What's your biggest concern/fear about AI right now?" },
  futureOfWorkView: {
    label:
      "How are you currently thinking about the future of work, organizational redesign, and AI? What opportunities or challenges do you see?",
  },
  moveTimeline: { label: "When do you feel you need to make a serious move on AI?" },
  futureVision: { label: "How do you think AI is gonna change the future of work for your organisation?" },
  ownershipPreference: { label: "When it comes to AI in your organization, what feels right to you?" },
  employeeFreedom: { label: "How much freedom do you want to give your employees when it comes to using AI at work?" },
} as const;

// Column headers accepted in the participants+survey import file (CSV or XLSX).
// Matching is case-insensitive and ignores spaces/underscores/dashes.
export const IMPORT_COLUMNS: { key: string; aliases: string[]; required: boolean }[] = [
  { key: "name", aliases: ["name", "fullname", "full name"], required: true },
  { key: "email", aliases: ["email", "e-mail"], required: true },
  { key: "role", aliases: ["role"], required: false },
  { key: "orgSize", aliases: ["orgsize", "org size", "q1", "organization size"], required: false },
  { key: "aiRelationship", aliases: ["airelationship", "ai relationship", "q2"], required: false },
  { key: "biggestConcern", aliases: ["biggestconcern", "biggest concern", "q3"], required: false },
  { key: "futureOfWorkView", aliases: ["futureofworkview", "future of work view", "q4"], required: false },
  { key: "moveTimeline", aliases: ["movetimeline", "move timeline", "q5"], required: false },
  { key: "futureVision", aliases: ["futurevision", "future vision", "q6"], required: false },
  { key: "ownershipPreference", aliases: ["ownershippreference", "ownership preference", "q7"], required: false },
  { key: "employeeFreedom", aliases: ["employeefreedom", "employee freedom", "q8"], required: false },
];
