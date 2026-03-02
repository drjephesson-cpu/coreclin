import { redirect } from "next/navigation";

import DashboardConsole from "@/app/dashboard/_components/dashboard-console";
import { getCurrentSession } from "@/lib/auth";
import { type DashboardData } from "@/lib/coreclin-types";
import { getDashboardData, isDatabaseConfigured } from "@/lib/db";

export const runtime = "nodejs";

export default async function DashboardPage() {
  const session = await getCurrentSession();
  if (!session) {
    redirect("/");
  }

  let dbError: string | null = null;
  let data: DashboardData | null = null;

  if (!isDatabaseConfigured()) {
    dbError = "A variável DATABASE_URL não foi encontrada.";
  } else {
    try {
      data = await getDashboardData(session.username);
    } catch (error) {
      dbError = error instanceof Error ? error.message : "Não foi possível carregar os dados do painel.";
    }
  }

  return (
    <main className="dashboard-shell">
      <DashboardConsole currentLogin={session.username} data={data} dbError={dbError} />
    </main>
  );
}
