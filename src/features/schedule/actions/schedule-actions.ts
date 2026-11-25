"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getAuthContext } from "@/features/auth/services/session";
import {
  createScheduleEvent,
  deleteScheduleEvent,
  updateScheduleEvent,
  upsertScheduleAvailability,
} from "@/features/schedule/services/schedule-service";
import type {
  AvailabilityInput,
  ScheduleEventInput,
} from "@/features/schedule/types/schedule";
import { createClient } from "@/lib/supabase/server";
import type { ActionState } from "@/lib/types/action-state";

const dateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);
const nullableTimeSchema = z
  .string()
  .regex(/^([01]\d|2[0-3]):[0-5]\d$/)
  .nullable();
const nullableText = (max: number) => z.string().trim().max(max).nullable();
const nullableUrl = z.union([z.url().max(1000), z.null()]);

const eventInputSchema = z
  .object({
    title: z.string().trim().min(1).max(120),
    startDate: dateSchema,
    endDate: dateSchema.nullable(),
    startTime: nullableTimeSchema,
    endTime: nullableTimeSchema,
    isAllDay: z.boolean(),
    timeTbd: z.boolean(),
    timeNote: nullableText(120),
    category: z.enum(["important", "meeting", "work", "deadline", "other"]),
    status: z.enum(["confirmed", "tentative", "needs_review", "cancelled"]),
    location: nullableText(200),
    assigneeText: nullableText(300),
    description: nullableText(2000),
    confirmationNote: nullableText(1000),
    googleMapsUrl: nullableUrl,
    relatedUrl: nullableUrl,
  })
  .superRefine((input, context) => {
    if (input.endDate && input.endDate < input.startDate) {
      context.addIssue({
        code: "custom",
        path: ["endDate"],
        message: "終了日は開始日以降にしてください。",
      });
    }
    if (input.isAllDay && input.timeTbd) {
      context.addIssue({
        code: "custom",
        path: ["timeTbd"],
        message: "終日と時間未定は同時に選べません。",
      });
    }
    if (
      !input.isAllDay &&
      !input.timeTbd &&
      input.startTime &&
      input.endTime &&
      (!input.endDate || input.endDate === input.startDate) &&
      input.endTime <= input.startTime
    ) {
      context.addIssue({
        code: "custom",
        path: ["endTime"],
        message: "終了時刻は開始時刻より後にしてください。",
      });
    }
  });

const availabilitySchema = z
  .object({
    availabilityId: z.guid().nullable(),
    expectedVersion: z.number().int().positive().nullable(),
    userId: z.guid(),
    availabilityDate: dateSchema,
    status: z.enum(["available", "unavailable", "undecided"]),
    isAllDay: z.boolean(),
    startTime: nullableTimeSchema,
    endTime: nullableTimeSchema,
    note: nullableText(500),
  })
  .superRefine((input, context) => {
    if (input.status === "available" && !input.isAllDay) {
      if (!input.startTime || !input.endTime) {
        context.addIssue({
          code: "custom",
          path: ["startTime"],
          message: "参加可能な時間帯を入力してください。",
        });
      } else if (input.endTime <= input.startTime) {
        context.addIssue({
          code: "custom",
          path: ["endTime"],
          message: "終了時刻は開始時刻より後にしてください。",
        });
      }
    }
  });

async function writableAuthError(): Promise<string | null> {
  const auth = await getAuthContext();
  if (!auth) return "ログインし直してください。";
  if (auth.profile.role === "viewer") {
    return "閲覧のみの利用者は更新できません。";
  }
  return null;
}

function revalidateSchedule() {
  revalidatePath("/schedule");
  revalidatePath("/");
}

export async function createScheduleEventAction(
  input: ScheduleEventInput,
): Promise<ActionState> {
  const parsed = eventInputSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      message: parsed.error.issues[0]?.message ?? "入力内容を確認してください。",
    };
  }
  const authorizationError = await writableAuthError();
  if (authorizationError) return { ok: false, message: authorizationError };

  const result = await createScheduleEvent(await createClient(), parsed.data);
  if (result.ok) revalidateSchedule();
  return result;
}

export async function updateScheduleEventAction(
  eventId: string,
  expectedVersion: number,
  input: ScheduleEventInput,
): Promise<ActionState> {
  const identity = z
    .object({ eventId: z.guid(), expectedVersion: z.number().int().positive() })
    .safeParse({
      eventId,
      expectedVersion,
    });
  const parsed = eventInputSchema.safeParse(input);
  if (!identity.success || !parsed.success) {
    return {
      ok: false,
      message: parsed.error?.issues[0]?.message ?? "入力内容を確認してください。",
    };
  }
  const authorizationError = await writableAuthError();
  if (authorizationError) return { ok: false, message: authorizationError };

  const result = await updateScheduleEvent(
    await createClient(),
    identity.data.eventId,
    identity.data.expectedVersion,
    parsed.data,
  );
  if (result.ok) revalidateSchedule();
  return result;
}

export async function deleteScheduleEventAction(
  eventId: string,
  expectedVersion: number,
): Promise<ActionState> {
  const parsed = z
    .object({ eventId: z.guid(), expectedVersion: z.number().int().positive() })
    .safeParse({
      eventId,
      expectedVersion,
    });
  if (!parsed.success) return { ok: false, message: "入力内容を確認してください。" };
  const authorizationError = await writableAuthError();
  if (authorizationError) return { ok: false, message: authorizationError };

  const result = await deleteScheduleEvent(
    await createClient(),
    parsed.data.eventId,
    parsed.data.expectedVersion,
  );
  if (result.ok) revalidateSchedule();
  return result;
}

export async function upsertScheduleAvailabilityAction(
  input: AvailabilityInput,
): Promise<ActionState> {
  const parsed = availabilitySchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      message: parsed.error.issues[0]?.message ?? "入力内容を確認してください。",
    };
  }
  const authorizationError = await writableAuthError();
  if (authorizationError) return { ok: false, message: authorizationError };

  const result = await upsertScheduleAvailability(await createClient(), parsed.data);
  if (result.ok) revalidateSchedule();
  return result;
}
