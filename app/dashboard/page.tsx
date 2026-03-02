import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import LogoutButton from "@/app/_components/logout-button";
import { SESSION_COOKIE_NAME, getSessionFromToken } from "@/lib/auth";

export default async function DashboardPage() {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;
  const session = token ? getSessionFromToken(token) : null;

  if (!session) {
    redirect("/");
  }

  return (
    <main className="dashboard-shell">
      <section className="dashboard-panel">
        <header>
          <p className="dashboard-tag">Área segura</p>
          <h1>Painel CoreClin</h1>
          <p>
            Login efetuado como <strong>{session.username}</strong>.
          </p>
        </header>

        <div className="dashboard-grid">
          <article>
            <h2>Próximos módulos</h2>
            <ul>
              <li>Validação automática de interações medicamentosas.</li>
              <li>Checagem de dose e via de administração.</li>
              <li>Feedback clínico para equipe médica.</li>
            </ul>
          </article>
          <article>
            <h2>Infraestrutura</h2>
            <ul>
              <li>Frontend pronto para deploy na Vercel.</li>
              <li>Estrutura preparada para persistência com Neon.</li>
              <li>Fluxo ideal para versionamento com GitHub.</li>
            </ul>
          </article>
        </div>

        <LogoutButton />
      </section>
    </main>
  );
}
