import type { Challenge, GroupSignup } from "./types";

export interface DraftGroup {
  challengeId: string;
  name: string;
  participantIds: string[];
}

const MAX_GROUP_SIZE = 4;

/**
 * Turns raw challenge sign-ups into final groups of at most MAX_GROUP_SIZE.
 *
 * Rule: if a challenge has more than 4 sign-ups, it is split into the
 * smallest number of even groups that keeps every group at 4 people or
 * fewer (e.g. 5 -> 3+2, 8 -> 4+4, 9 -> 3+3+3). When exactly one group is
 * needed (<=4 people) it keeps the challenge title as the group name;
 * when split, groups are labelled "Group A", "Group B", etc.
 */
export function buildGroups(challenges: Challenge[], signups: GroupSignup[]): DraftGroup[] {
  const draftGroups: DraftGroup[] = [];

  for (const challenge of challenges) {
    const participantIds = signups
      .filter((s) => s.challengeId === challenge.id)
      .map((s) => s.participantId);

    if (participantIds.length === 0) continue;

    const numGroups = Math.max(1, Math.ceil(participantIds.length / MAX_GROUP_SIZE));

    if (numGroups === 1) {
      draftGroups.push({
        challengeId: challenge.id,
        name: challenge.title,
        participantIds,
      });
      continue;
    }

    // Distribute as evenly as possible across numGroups buckets
    const buckets: string[][] = Array.from({ length: numGroups }, () => []);
    participantIds.forEach((pid, i) => {
      buckets[i % numGroups].push(pid);
    });

    buckets.forEach((bucket, i) => {
      const label = String.fromCharCode(65 + i); // A, B, C...
      draftGroups.push({
        challengeId: challenge.id,
        name: `${challenge.title} — Group ${label}`,
        participantIds: bucket,
      });
    });
  }

  return draftGroups;
}
