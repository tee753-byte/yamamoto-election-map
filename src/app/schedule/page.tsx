import { redirect } from "next/navigation";
import { getAuthContext } from "@/features/auth/services/session";
import { ScheduleView } from "@/features/schedule/components/schedule-view";
import {
  listScheduleAvailability,
  listScheduleEvents,
  listScheduleProfiles,
} from "@/features/schedule/services/schedule-service";
import { todayInTokyo } from "@/features/schedule/utils/date";
import { AuthenticatedShell } from "@/features/shared/components/authenticated-shell";

export const dynamic = "force-dynamic";

export default async function SchedulePage() {
  const auth = await getAuthContext();
  if (!auth) redirect("/login");

  const [events, availability, profiles] = await Promise.all([
    listScheduleEvents(),
    listScheduleAvailability(),
    listScheduleProfiles(),
  ]);

  return (
    <AuthenticatedShell auth={auth}>
      <ScheduleView
        events={events}
        availability={availability}
        profiles={profiles}
        today={todayInTokyo()}
        currentUserId={auth.userId}
        currentUserRole={auth.profile.role}
      />
    </AuthenticatedShell>
  );
}
