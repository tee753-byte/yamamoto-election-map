"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getAuthContext } from "@/features/auth/services/session";
import {
  archivePostingArea,
  assignPostingArea,
  createPostingArea,
  importPostingAreas,
  recordPostingProgress,
  updatePostingArea,
} from "@/features/posting-map/services/posting-service";
import { createClient } from "@/lib/supabase/server";
import type { ActionState } from "@/lib/types/action-state";
import type { GeoJsonPolygon } from "@/lib/types/domain";

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

const archiveInputSchema = z.object({
  areaId: z.guid(),
  expectedVersion: z.number().int().positive(),
});

const coordinateSchema = z.tuple([
  z.number().min(-180).max(180),
  z.number().min(-90).max(90),
]);

const polygonSchema = z
  .object({
    type: z.literal("Polygon"),
    coordinates: z.array(z.array(coordinateSchema).min(4)).min(1).max(20),
  })
  .refine(
    (polygon) =>
      polygon.coordinates.reduce((sum, ring) => sum + ring.length, 0) <= 5000 &&
      polygon.coordinates.every((ring) => {
        const first = ring[0];
        const last = ring.at(-1);
        return first && last && first[0] === last[0] && first[1] === last[1];
      }),
    "区域の境界が正しく閉じられていません。",
  );

const createAreaInputSchema = z.object({
  areaCode: z.string().trim().min(1).max(40),
  name: z.string().trim().min(1).max(120),
  geometry: polygonSchema,
  targetCount: z.number().int().min(0).max(1_000_000).nullable(),
  note: z.string().trim().max(300).nullable(),
  requestId: z.string().uuid(),
});

const updateAreaInputSchema = createAreaInputSchema
  .omit({
    areaCode: true,
    requestId: true,
  })
  .extend({
    areaId: z.guid(),
    expectedVersion: z.number().int().positive(),
  });

interface CreatePostingAreaActionInput {
  areaCode: string;
  name: string;
  geometry: GeoJsonPolygon;
  targetCount: number | null;
  note: string | null;
  requestId: string;
}

interface UpdatePostingAreaActionInput {
  areaId: string;
  expectedVersion: number;
  name: string;
  geometry: GeoJsonPolygon;
  targetCount: number | null;
  note: string | null;
}

const importAreasSchema = z
  .array(
    createAreaInputSchema.omit({ requestId: true }).extend({
      assigneeLabel: z.string().trim().max(80).optional(),
    }),
  )
  .min(1)
  .max(200);

export async function createPostingAreaAction(
  input: CreatePostingAreaActionInput,
): Promise<ActionState> {
  const parsed = createAreaInputSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, message: "区域の番号・名前・境界を確認してください。" };
  }

  const auth = await getAuthContext();
  if (!auth) return { ok: false, message: "ログインし直してください。" };

  const result = await createPostingArea(await createClient(), {
    ...parsed.data,
    currentUserRole: auth.profile.role,
  });
  if (result.ok) revalidatePath("/posting");
  return result;
}

export async function updatePostingAreaAction(
  input: UpdatePostingAreaActionInput,
): Promise<ActionState> {
  const parsed = updateAreaInputSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, message: "区域名・目標部数・メモ・境界を確認してください。" };
  }

  const auth = await getAuthContext();
  if (!auth) return { ok: false, message: "ログインし直してください。" };

  const result = await updatePostingArea(await createClient(), {
    ...parsed.data,
    currentUserRole: auth.profile.role,
  });
  if (result.ok) revalidatePath("/posting");
  return result;
}

export async function importPostingAreasAction(input: unknown): Promise<ActionState> {
  const parsed = importAreasSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      message: "GeoJSONの区域番号・名前・境界を確認してください（最大200区域）。",
    };
  }

  const auth = await getAuthContext();
  if (!auth) return { ok: false, message: "ログインし直してください。" };
  const result = await importPostingAreas(
    await createClient(),
    parsed.data,
    auth.profile.role,
  );
  if (result.ok) revalidatePath("/posting");
  return result;
}

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

export async function archivePostingAreaAction(
  input: z.infer<typeof archiveInputSchema>,
): Promise<ActionState> {
  const parsed = archiveInputSchema.safeParse(input);
  if (!parsed.success) return { ok: false, message: "区域を確認してください。" };

  const auth = await getAuthContext();
  if (!auth) return { ok: false, message: "ログインし直してください。" };

  const result = await archivePostingArea(await createClient(), {
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
