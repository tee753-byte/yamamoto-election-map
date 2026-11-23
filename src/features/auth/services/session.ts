import "server-only";

import { createClient } from "@/lib/supabase/server";
import type { Profile, UserRole } from "@/lib/types/domain";

interface ProfileRow {
  id: string;
  display_name: string;
  role: UserRole;
  is_active: boolean;
}

export interface AuthContext {
  userId: string;
  email: string;
  profile: Profile;
}

export async function getAuthContext(): Promise<AuthContext | null> {
  const supabase = await createClient();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user?.email) return null;

  const { data, error } = await supabase
    .from("profiles")
    .select("id, display_name, role, is_active")
    .eq("id", user.id)
    .single();

  if (error || !data) return null;

  const row = data as ProfileRow;
  if (!row.is_active) return null;

  return {
    userId: user.id,
    email: user.email,
    profile: {
      id: row.id,
      displayName: row.display_name,
      role: row.role,
      isActive: row.is_active,
    },
  };
}
