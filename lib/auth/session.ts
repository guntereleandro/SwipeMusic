import { redirect } from "next/navigation";
import { LOGIN_PATH } from "./access";
import { createServerSupabaseClient } from "../supabase/server";

export async function getAuthenticatedUser() {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return user;
}

export async function requireAuthenticatedUser() {
  const user = await getAuthenticatedUser();

  if (!user) redirect(LOGIN_PATH);

  return user;
}
