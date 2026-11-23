"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getAuthContext } from "@/features/auth/services/session";
import { updatePosterWork } from "@/features/poster-map/services/poster-service";
import { createClient } from "@/lib/supabase/server";
import type { ActionState } from "@/lib/types/action-state";

const inputSchema = z.object({
  workId: z.guid(),
  expectedVersion: z.number().int().nonnegative(),
  status: z.enum(["not_started", "assigned", "completed", "needs_review"]),
  note: z.string().trim().max(300).nullable(),
});

export async function updatePosterWorkAction(
  input: z.infer<typeof inputSchema>,
): Promise<ActionState> {
  const parsed = inputSchema.safeParse(input);
  if (!parsed.success) return { ok: false, message: "入力内容を確認してください。" };

  const auth = await getAuthContext();
  if (!auth) return { ok: false, message: "ログインし直してください。" };

  const supabase = await createClient();
  const result = await updatePosterWork(supabase, {
    ...parsed.data,
    currentUserRole: auth.profile.role,
  });

  if (result.ok) revalidatePath("/posters");
  return result;
}
