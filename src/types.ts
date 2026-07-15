export type WorkshopStatus =
  | "survey"
  | "challenges_ready"
  | "groups_open"
  | "groups_locked"
  | "board_review"
  | "presentation"
  | "commitments"
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

export interface Participant {
  id: string;
  workshopId: string;
  name: string;
  email: string;
  token: string;
  status: "invited" | "survey_done";
  createdAt: string;
}

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

export interface Challenge {
  id: string;
  workshopId: string;
  title: string;
  description: string;
  themes: string[];
  createdAt: string;
}

export interface GroupSignup {
  id: string;
  workshopId: string;
  challengeId: string;
  participantId: string;
  createdAt: string;
}

export interface Group {
  id: string;
  workshopId: string;
  challengeId: string;
  name: string;
  participantIds: string[];
  createdAt: string;
}

export interface GroupSolution {
  id: string;
  groupId: string;
  workshopId: string;
  solution: string;
  updatedAt: string;
}

export interface PersonaChallenge {
  role: string;
  objection: string;
  roaiTools: string[];
}

export interface BoardChallenge {
  id: string;
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

export const SURVEY_QUESTIONS = {
  orgSize: {
    label: "How many people work in your organization?",
    options: ["Fewer than 10", "10–50", "51–200", "More than 200"],
  },
  aiRelationship: {
    label: "How would you describe your organization's current relationship with AI?",
    options: [
      "We're watching from the sidelines",
      "We've started exploring",
      "We're actively using AI tools",
      "We're scaling AI across the business",
    ],
  },
  biggestConcern: {
    label: "What's your biggest concern/fear about AI right now?",
    options: [
      "I don't know where to start",
      "The cost and ROI uncertainty",
      "How it will affect my people",
      "Falling behind my competitors",
      "Honestly, I'm not that concerned yet",
    ],
  },
  futureOfWorkView: {
    label:
      "How are you currently thinking about the future of work, organizational redesign, and AI? What opportunities or challenges do you see?",
    freeText: true,
  },
  moveTimeline: {
    label: "When do you feel you need to make a serious move on AI?",
    options: [
      "We're already moving — the clock is ticking",
      "Within the next 6 months",
      "In the next 1–2 years",
      "When I see clearer evidence it's worth it",
      "I'm not convinced I need to move at all",
    ],
  },
  futureVision: {
    label: "How do you think AI is gonna change the future of work for your organisation?",
    options: [
      "AI will largely run our core processes — people will oversee and refine",
      "People will lead our core processes — AI will support and accelerate",
      "It'll be a mix — some processes AI-driven, others fully human",
      "I honestly don't have a clear picture yet",
    ],
  },
  ownershipPreference: {
    label: "When it comes to AI in your organization, what feels right to you?",
    options: [
      "I want to own it — build our own approach, control every decision",
      "I want to lead it internally but work with partners on execution",
      "I'd rather trust experts and focus on the outcomes, not the process",
      "I'm not sure yet — I need to understand more before deciding",
    ],
  },
  employeeFreedom: {
    label: "How much freedom do you want to give your employees when it comes to using AI at work?",
    options: [
      "Full freedom — I trust my people to figure it out",
      "Guided freedom — they can explore, but within clear boundaries we set",
      "Controlled access — we decide which tools they use and how",
      "Not decided yet — we haven't had this conversation internally",
    ],
  },
} as const;
