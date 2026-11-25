import { getAuthContext } from "@/features/auth/services/session";
import census from "@/features/fukutsu-insight/data/census-2020.json";

export async function GET() {
  const auth = await getAuthContext();
  if (!auth) return Response.json({ message: "認証が必要です。" }, { status: 401 });
  return Response.json(census, {
    headers: { "Cache-Control": "private, max-age=3600" },
  });
}
