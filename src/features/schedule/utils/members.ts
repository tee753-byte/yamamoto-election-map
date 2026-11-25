import type { ScheduleProfile } from "@/features/schedule/types/schedule";

const PREFERRED_MEMBERS = ["山本", "北川", "藤井", "内田"] as const;

export function scheduleMemberLabel(displayName: string): string {
  return (
    PREFERRED_MEMBERS.find((familyName) => displayName.includes(familyName)) ??
    displayName
  );
}

export function sortScheduleProfiles(profiles: ScheduleProfile[]): ScheduleProfile[] {
  return profiles.toSorted((left, right) => {
    const leftIndex = PREFERRED_MEMBERS.findIndex((familyName) =>
      left.displayName.includes(familyName),
    );
    const rightIndex = PREFERRED_MEMBERS.findIndex((familyName) =>
      right.displayName.includes(familyName),
    );
    const leftOrder = leftIndex === -1 ? PREFERRED_MEMBERS.length : leftIndex;
    const rightOrder = rightIndex === -1 ? PREFERRED_MEMBERS.length : rightIndex;

    return (
      leftOrder - rightOrder || left.displayName.localeCompare(right.displayName, "ja")
    );
  });
}
