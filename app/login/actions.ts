"use server";

import { redirect } from "next/navigation";
import { ADMIN_HOME_PATH, getPostLogoutPath } from "../../lib/auth/access";
import { createServerSupabaseClient } from "../../lib/supabase/server";

export type LoginState = { error: string | null };

export async function loginAction(
  _previousState: LoginState,
  formData: FormData,
): Promise<LoginState> {
  const email = formData.get("email");
  const password = formData.get("password");

  if (typeof email !== "string" || typeof password !== "string") {
    return { error: "E-mail ou senha inválidos." };
  }

  try {
    const supabase = await createServerSupabaseClient();
    const { error } = await supabase.auth.signInWithPassword({ email, password });

    if (error?.code === "invalid_credentials") {
      return { error: "E-mail ou senha inválidos." };
    }

    if (error) {
      return { error: "Não foi possível entrar. Tente novamente." };
    }
  } catch {
    return { error: "Não foi possível entrar. Tente novamente." };
  }

  redirect(ADMIN_HOME_PATH);
}

export async function logoutAction() {
  const supabase = await createServerSupabaseClient();
  await supabase.auth.signOut();
  redirect(getPostLogoutPath());
}
