import Image from "next/image";

export default function DashboardLoading() {
  return (
    <main className="dashboard-intro-loading" aria-busy="true">
      <div className="dashboard-intro-ambient dashboard-intro-ambient-one" aria-hidden="true" />
      <div className="dashboard-intro-ambient dashboard-intro-ambient-two" aria-hidden="true" />
      <section className="dashboard-intro-card" role="status" aria-live="polite">
        <Image
          src="/coreclin.png"
          alt="CoreClin"
          width={172}
          height={172}
          priority
          className="dashboard-intro-logo"
        />
        <h1>A sua ferramenta de auxílio à decisão terapêutica.</h1>
      </section>
    </main>
  );
}
