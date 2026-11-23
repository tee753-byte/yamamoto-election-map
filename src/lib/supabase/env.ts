export function getSupabaseEnv() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !anonKey) {
    throw new Error(
      "Supabaseの接続情報がありません。.env.localを.env.exampleに沿って設定してください。",
    );
  }

  return { url, anonKey };
}
