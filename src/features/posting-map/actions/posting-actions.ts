"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getAuthContext } from "@/features/auth/services/session";
import {
  assignPostingArea,
  recordPostingProgress,
} from "@/features/posting-map/services/posting-service";
import { createClient } from "@/lib/supabase/server";
import type { ActionState } from "@/lib/types/action-state";

const inputSchema = z.object({
  areaId: z.guid(),
  expectedVersion: z.number().int().nonnegative(),
  status: z.enum(["not_started", "assigned", "completed", "needs_review"]),
  deliveredIncrement: z.number().int().min(0).max(5000),
  requestId: z.string().uuid(),
  note: z.string().trim().max(300).nullable(),
});

const assignmentInputSchema = z.object({
  areaId: z.guid(),
  expectedVersion: z.number().int().nonnegative(),
  assigneeLabel: z.string().trim().max(80),
});

export async function assignPostingAreaAction(
  input: z.infer<typeof assignmentInputSchema>,
): Promise<ActionState> {
  const parsed = assignmentInputSchema.safeParse(input);
  if (!parsed.success) return { ok: false, message: "入力内容を確認してください。" };

  const auth = await getAuthContext();
  if (!auth) return { ok: false, message: "ログインし直してください。" };

  const supabase = await createClient();
  const result = await assignPostingArea(supabase, {
    ...parsed.data,
    currentUserRole: auth.profile.role,
  });

  if (result.ok) revalidatePath("/posting");
  return result;
}

export async function recordPostingProgressAction(
  input: z.infer<typeof inputSchema>,
): Promise<ActionState> {
  const parsed = inputSchema.safeParse(input);
  if (!parsed.success) return { ok: false, message: "入力内容を確認してください。" };

  const auth = await getAuthContext();
  if (!auth) return { ok: false, message: "ログインし直してください。" };

  const supabase = await createClient();
  const result = await recordPostingProgress(supabase, {
    ...parsed.data,
    currentUserRole: auth.profile.role,
  });

  if (result.ok) revalidatePath("/posting");
  return result;
}
