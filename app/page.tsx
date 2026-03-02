import Image from "next/image";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import LoginForm from "@/app/_components/login-form";
import { SESSION_COOKIE_NAME, getSessionFromToken } from "@/lib/auth";

export default async function Home() {
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
      <section className="auth-panel">
        <header className="brand-header">
          <Image
            src="/coreclin.png"
            alt="CoreClin"
            width={190}
            height={190}
            priority
            className="brand-logo-image"
          />
          <p className="brand-tag">CoreClin</p>
          <h1>Autenticação Clínica</h1>
        </header>

        <LoginForm />

        <footer className="auth-footer">
          <span>dr.jephesson@gmail.com</span>
        </footer>
      </section>
    </main>
  );
}
