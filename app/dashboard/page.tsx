import { redirect } from "next/navigation";

import DashboardConsole from "@/app/dashboard/_components/dashboard-console";
import { getCurrentSession } from "@/lib/auth";
import { type DashboardData } from "@/lib/coreclin-types";
import { getDashboardData, isDatabaseConfigured } from "@/lib/db";

export const runtime = "nodejs";

type DashboardPageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

function parseSelectedPatientId(rawValue: string | string[] | undefined): number | null {
  const candidate = Array.isArray(rawValue) ? rawValue[0] : rawValue;
  const parsedValue = Number(candidate);

  if (!Number.isInteger(parsedValue) || parsedValue <= 0) {
    return null;
  }

  return parsedValue;
}

export default async function DashboardPage({ searchParams }: DashboardPageProps) {
  const session = await getCurrentSession();
  if (!session) {
    redirect("/");
  }

  const resolvedSearchParams = searchParams ? await searchParams : undefined;
  const selectedPatientId = parseSelectedPatientId(resolvedSearchParams?.patientId);

  let dbError: string | null = null;
  let data: DashboardData | null = null;

  if (!isDatabaseConfigured()) {
    dbError = "A variável DATABASE_URL não foi encontrada.";
  } else {
    try {
      data = await getDashboardData(session.username, { selectedPatientId });
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
