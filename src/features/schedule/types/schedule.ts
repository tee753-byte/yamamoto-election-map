import type { UserRole } from "@/lib/types/domain";

export type ScheduleCategory = "important" | "meeting" | "work" | "deadline" | "other";

export type ScheduleStatus = "confirmed" | "tentative" | "needs_review" | "cancelled";

export type AvailabilityStatus = "available" | "unavailable" | "undecided";

export interface ScheduleEvent {
  id: string;
  title: string;
  startDate: string;
  endDate: string | null;
  startTime: string | null;
  endTime: string | null;
  isAllDay: boolean;
  timeTbd: boolean;
  timeNote: string | null;
  category: ScheduleCategory;
  status: ScheduleStatus;
  location: string | null;
  assigneeText: string | null;
  description: string | null;
  confirmationNote: string | null;
  googleMapsUrl: string | null;
  relatedUrl: string | null;
  createdBy: string;
  updatedBy: string;
  creatorName: string;
  updaterName: string;
  version: number;
  createdAt: string;
  updatedAt: string;
}

export interface ScheduleAvailability {
  id: string;
  userId: string;
  userName: string;
  availabilityDate: string;
  status: AvailabilityStatus;
  isAllDay: boolean;
  startTime: string | null;
  endTime: string | null;
  note: string | null;
  updatedBy: string;
  updaterName: string;
  version: number;
  updatedAt: string;
}

export interface ScheduleProfile {
  id: string;
  displayName: string;
  role: UserRole;
}

export interface ScheduleEventInput {
  title: string;
  startDate: string;
  endDate: string | null;
  startTime: string | null;
  endTime: string | null;
  isAllDay: boolean;
  timeTbd: boolean;
  timeNote: string | null;
  category: ScheduleCategory;
  status: ScheduleStatus;
  location: string | null;
  assigneeText: string | null;
  description: string | null;
  confirmationNote: string | null;
  googleMapsUrl: string | null;
  relatedUrl: string | null;
}

export interface AvailabilityInput {
  availabilityId: string | null;
  expectedVersion: number | null;
  userId: string;
  availabilityDate: string;
  status: AvailabilityStatus;
  isAllDay: boolean;
  startTime: string | null;
  endTime: string | null;
  note: string | null;
}
