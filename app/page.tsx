import Image from "next/image";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import LoginForm from "@/app/_components/login-form";
import { SESSION_COOKIE_NAME, getSessionFromToken } from "@/lib/auth";

export default async function Home(): Promise<JSX.Element> {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;
  const session = token ? getSessionFromToken(token) : null;

  if (session) {
    redirect("/dashboard");
  }

  return (
    <main className="auth-shell">
      <div className="ambient ambient-one" />
      <div className="ambient ambient-two" />
      <section className="auth-card">
        <header className="brand-header">
          <div className="brand-logo">
            <Image
              src="/coreclin.png"
              alt="CoreClin"
              width={74}
              height={74}
              priority
              className="brand-logo-image"
            />
          </div>
          <p className="brand-tag">CoreClin</p>
          <h1>Autenticação Clínica</h1>
          <p className="brand-subtitle">
            Acesse o painel para revisão farmacêutica, verificação de prescrições e feedback.
          </p>
        </header>

        <LoginForm />

        <footer className="auth-footer">
          <span>Projeto inicial para deploy em Vercel + Neon + GitHub.</span>
        </footer>
      </section>
    </main>
  );
}

