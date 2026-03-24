import Link from "next/link";
import { redirect } from "next/navigation";

import { canViewAuditLogs, formatAuditActionLabel } from "@/lib/audit";
import { getCurrentSession } from "@/lib/auth";
import { isDatabaseConfigured, listAuditLogs } from "@/lib/db";

export const runtime = "nodejs";

function formatAuditTimestamp(value: string): string {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return "-";
  }

  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "medium",
    timeZone: "America/Sao_Paulo"
  }).format(parsed);
}

function formatAuditSource(metadata: Record<string, unknown>): string {
  return typeof metadata.source === "string" && metadata.source.trim().length > 0
    ? metadata.source
    : "-";
}

function formatAuditDetails(metadata: Record<string, unknown>): string {
  const visibleEntries = Object.entries(metadata).filter(([key]) => key !== "source");
  if (visibleEntries.length === 0) {
    return "-";
  }

  return visibleEntries
    .map(([key, value]) => `${key}: ${typeof value === "string" ? value : JSON.stringify(value)}`)
    .join(" | ");
}

export default async function AuditPage() {
  const session = await getCurrentSession();
  if (!session) {
    redirect("/");
  }

  if (!canViewAuditLogs(session.username)) {
    redirect("/dashboard");
  }

  let dbError: string | null = null;
  let logs: Awaited<ReturnType<typeof listAuditLogs>> = [];

  if (!isDatabaseConfigured()) {
    dbError = "A variável DATABASE_URL não foi encontrada.";
  } else {
    try {
      logs = await listAuditLogs({ limit: 200 });
    } catch (error) {
      dbError = error instanceof Error ? error.message : "Não foi possível carregar os logs de auditoria.";
    }
  }

  return (
    <main className="dashboard-shell">
      <section className="dashboard-card">
        <div className="dashboard-inline-actions">
          <Link href="/dashboard" className="dashboard-mini-button">
            Voltar ao painel
          </Link>
        </div>

        <h1>Auditoria de acessos</h1>
        <p className="dashboard-muted">
          Visualizacao restrita aos logins configurados em <code>AUDIT_LOG_VIEWERS</code>.
        </p>
        <p className="dashboard-muted">Mostrando os 200 registros mais recentes.</p>
      </section>

      <section className="dashboard-card">
        {dbError ? (
          <p className="dashboard-muted">{dbError}</p>
        ) : logs.length === 0 ? (
          <p className="dashboard-muted">Nenhum registro de auditoria encontrado.</p>
        ) : (
          <div className="dashboard-table-container">
            <table className="dashboard-table">
              <thead>
                <tr>
                  <th>Quando</th>
                  <th>Login</th>
                  <th>Ação</th>
                  <th>Paciente</th>
                  <th>Origem</th>
                  <th>Detalhes</th>
                </tr>
              </thead>
              <tbody>
                {logs.map((log) => (
                  <tr key={log.id}>
                    <td>{formatAuditTimestamp(log.createdAt)}</td>
                    <td>{log.actorLogin}</td>
                    <td>{formatAuditActionLabel(log.action)}</td>
                    <td>
                      {log.patientNameSnapshot
                        ? `${log.patientNameSnapshot}${log.patientId ? ` (#${log.patientId})` : ""}`
                        : log.patientId
                          ? `Paciente #${log.patientId}`
                          : "-"}
                    </td>
                    <td>{formatAuditSource(log.metadata)}</td>
                    <td>{formatAuditDetails(log.metadata)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </main>
  );
}
