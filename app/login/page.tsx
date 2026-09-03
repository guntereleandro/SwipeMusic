import { redirect } from "next/navigation";
import { LoginForm } from "@/components/auth/login-form";
import { ADMIN_HOME_PATH } from "@/lib/auth/access";
import { getAuthenticatedUser } from "@/lib/auth/session";

export default async function LoginPage() {
  const user = await getAuthenticatedUser();
  if (user) redirect(ADMIN_HOME_PATH);

  return (
    <main className="grid min-h-screen place-items-center bg-[#111113] px-4 py-10 text-zinc-50">
      <section className="w-full max-w-md rounded-[1.75rem] border border-white/[0.08] bg-[#1c1c1f] p-6 shadow-[0_24px_70px_-28px_rgba(0,0,0,0.8)] sm:p-8">
        <span className="grid size-10 place-items-center rounded-xl bg-amber-600 text-lg font-black text-white shadow-sm">S</span>
        <p className="mt-6 text-xs font-semibold uppercase tracking-[0.18em] text-amber-400">SwipeMusic</p>
        <h1 className="mt-2 text-2xl font-bold tracking-tight">Acesso administrativo</h1>
        <p className="mt-2 text-sm leading-6 text-zinc-500">Entre com o usuário criado no Supabase para acessar a administração.</p>
        <LoginForm />
      </section>
    </main>
  );
}
