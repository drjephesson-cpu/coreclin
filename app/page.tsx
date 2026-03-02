import Image from "next/image";
import { redirect } from "next/navigation";

import LoginForm from "@/app/_components/login-form";
import { getCurrentSession } from "@/lib/auth";

export default async function Home() {
  const session = await getCurrentSession();

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
        </header>

        <LoginForm />

        <footer className="auth-footer">
          <span>Desenvolvido pelo Dr. Jephesson Santos</span>
        </footer>
      </section>
    </main>
  );
}
