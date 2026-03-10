export default function DashboardLoading() {
  return (
    <main className="dashboard-shell">
      <section className="dashboard-panel" aria-busy="true">
        <div className="dashboard-loading-card" role="status" aria-live="polite">
          <span className="dashboard-loading-spinner" aria-hidden="true" />
          <p>Carregando painel...</p>
        </div>
      </section>
    </main>
  );
}
