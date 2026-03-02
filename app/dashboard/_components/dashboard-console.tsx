"use client";

import { FormEvent, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import LogoutButton from "@/app/_components/logout-button";
import {
  COUNCIL_OPTIONS,
  PROFESSION_OPTIONS,
  type CouncilOption,
  type DashboardData,
  type ProfessionOption
} from "@/lib/coreclin-types";

const UF_OPTIONS = [
  "AC",
  "AL",
  "AP",
  "AM",
  "BA",
  "CE",
  "DF",
  "ES",
  "GO",
  "MA",
  "MT",
  "MS",
  "MG",
  "PA",
  "PB",
  "PR",
  "PE",
  "PI",
  "RJ",
  "RN",
  "RS",
  "RO",
  "RR",
  "SC",
  "SP",
  "SE",
  "TO"
] as const;

type FeedbackType = "success" | "error";

type FeedbackState = {
  type: FeedbackType;
  message: string;
} | null;

type DashboardConsoleProps = {
  currentLogin: string;
  data: DashboardData | null;
  dbError: string | null;
};

function calculateAge(dateString: string): number | null {
  if (!dateString) {
    return null;
  }
  const birthDate = new Date(`${dateString}T00:00:00`);
  if (Number.isNaN(birthDate.getTime())) {
    return null;
  }

  const now = new Date();
  let age = now.getFullYear() - birthDate.getFullYear();
  const monthDiff = now.getMonth() - birthDate.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && now.getDate() < birthDate.getDate())) {
    age -= 1;
  }

  return age >= 0 ? age : null;
}

function formatTimestamp(timestamp: string): string {
  if (!timestamp) {
    return "-";
  }

  const date = new Date(timestamp);
  if (Number.isNaN(date.getTime())) {
    return "-";
  }

  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short"
  }).format(date);
}

function formatNumber(value: number): string {
  return value.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export default function DashboardConsole({
  currentLogin,
  data,
  dbError
}: DashboardConsoleProps) {
  const router = useRouter();

  const professionals = data?.professionals ?? [];
  const teams = data?.teams ?? [];
  const patients = data?.patients ?? [];
  const recentAdmissions = data?.recentAdmissions ?? [];
  const recentMeasurements = data?.recentMeasurements ?? [];
  const currentProfessional = data?.currentProfessional ?? null;

  const [professionalForm, setProfessionalForm] = useState({
    fullName: "",
    profession: "Farmacêutico" as ProfessionOption,
    councilType: "CRF" as CouncilOption,
    councilNumber: "",
    stateUf: "RS",
    login: "",
    password: "",
    institution: ""
  });
  const [professionalFeedback, setProfessionalFeedback] = useState<FeedbackState>(null);
  const [professionalLoading, setProfessionalLoading] = useState(false);

  const [teamName, setTeamName] = useState("");
  const [teamFeedback, setTeamFeedback] = useState<FeedbackState>(null);
  const [teamLoading, setTeamLoading] = useState(false);

  const [patientForm, setPatientForm] = useState({
    fullName: "",
    chartNumber: "",
    birthDate: ""
  });
  const [patientFeedback, setPatientFeedback] = useState<FeedbackState>(null);
  const [patientLoading, setPatientLoading] = useState(false);

  const [admissionForm, setAdmissionForm] = useState({
    patientId: patients[0] ? String(patients[0].id) : "",
    admissionDate: "",
    bed: "",
    admissionReason: "",
    teamId: teams[0] ? String(teams[0].id) : ""
  });
  const [admissionFeedback, setAdmissionFeedback] = useState<FeedbackState>(null);
  const [admissionLoading, setAdmissionLoading] = useState(false);

  const [measurementForm, setMeasurementForm] = useState({
    patientId: patients[0] ? String(patients[0].id) : "",
    weightKg: "",
    heightCm: ""
  });
  const [measurementFeedback, setMeasurementFeedback] = useState<FeedbackState>(null);
  const [measurementLoading, setMeasurementLoading] = useState(false);

  const agePreview = useMemo(() => calculateAge(patientForm.birthDate), [patientForm.birthDate]);
  const responsibleProfessionalName = currentProfessional?.fullName ?? currentLogin;

  async function handleProfessionalSubmit(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    setProfessionalFeedback(null);
    setProfessionalLoading(true);

    try {
      const response = await fetch("/api/professionals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(professionalForm)
      });

      const result = (await response.json()) as { message?: string };
      if (!response.ok) {
        setProfessionalFeedback({
          type: "error",
          message: result.message ?? "Não foi possível cadastrar o profissional."
        });
        return;
      }

      setProfessionalFeedback({ type: "success", message: "Profissional cadastrado com sucesso." });
      setProfessionalForm({
        fullName: "",
        profession: "Farmacêutico",
        councilType: "CRF",
        councilNumber: "",
        stateUf: "RS",
        login: "",
        password: "",
        institution: ""
      });
      router.refresh();
    } catch {
      setProfessionalFeedback({
        type: "error",
        message: "Erro de conexão ao cadastrar profissional."
      });
    } finally {
      setProfessionalLoading(false);
    }
  }

  async function handleTeamSubmit(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    setTeamFeedback(null);
    setTeamLoading(true);

    try {
      const response = await fetch("/api/teams", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: teamName })
      });

      const result = (await response.json()) as { message?: string };
      if (!response.ok) {
        setTeamFeedback({ type: "error", message: result.message ?? "Falha ao cadastrar equipe." });
        return;
      }

      setTeamFeedback({ type: "success", message: "Equipe cadastrada com sucesso." });
      setTeamName("");
      router.refresh();
    } catch {
      setTeamFeedback({ type: "error", message: "Erro de conexão ao cadastrar equipe." });
    } finally {
      setTeamLoading(false);
    }
  }

  async function handlePatientSubmit(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    setPatientFeedback(null);
    setPatientLoading(true);

    try {
      const response = await fetch("/api/patients", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(patientForm)
      });

      const result = (await response.json()) as { message?: string };
      if (!response.ok) {
        setPatientFeedback({
          type: "error",
          message: result.message ?? "Falha ao cadastrar paciente."
        });
        return;
      }

      setPatientFeedback({ type: "success", message: "Paciente cadastrado com sucesso." });
      setPatientForm({
        fullName: "",
        chartNumber: "",
        birthDate: ""
      });
      router.refresh();
    } catch {
      setPatientFeedback({
        type: "error",
        message: "Erro de conexão ao cadastrar paciente."
      });
    } finally {
      setPatientLoading(false);
    }
  }

  async function handleAdmissionSubmit(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    setAdmissionFeedback(null);
    setAdmissionLoading(true);

    try {
      const response = await fetch("/api/admissions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...admissionForm,
          patientId: Number(admissionForm.patientId),
          teamId: Number(admissionForm.teamId)
        })
      });

      const result = (await response.json()) as { message?: string };
      if (!response.ok) {
        setAdmissionFeedback({
          type: "error",
          message: result.message ?? "Falha ao cadastrar internação."
        });
        return;
      }

      setAdmissionFeedback({ type: "success", message: "Internação cadastrada com sucesso." });
      setAdmissionForm({
        patientId: patients[0] ? String(patients[0].id) : "",
        admissionDate: "",
        bed: "",
        admissionReason: "",
        teamId: teams[0] ? String(teams[0].id) : ""
      });
      router.refresh();
    } catch {
      setAdmissionFeedback({
        type: "error",
        message: "Erro de conexão ao cadastrar internação."
      });
    } finally {
      setAdmissionLoading(false);
    }
  }

  async function handleMeasurementSubmit(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    setMeasurementFeedback(null);
    setMeasurementLoading(true);

    try {
      const response = await fetch(`/api/patients/${measurementForm.patientId}/measurements`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          weightKg: Number(measurementForm.weightKg),
          heightCm: Number(measurementForm.heightCm)
        })
      });

      const result = (await response.json()) as { message?: string };
      if (!response.ok) {
        setMeasurementFeedback({
          type: "error",
          message: result.message ?? "Falha ao atualizar medidas."
        });
        return;
      }

      setMeasurementFeedback({
        type: "success",
        message: "Dados variáveis registrados no histórico."
      });
      setMeasurementForm({
        patientId: patients[0] ? String(patients[0].id) : "",
        weightKg: "",
        heightCm: ""
      });
      router.refresh();
    } catch {
      setMeasurementFeedback({
        type: "error",
        message: "Erro de conexão ao salvar dados variáveis."
      });
    } finally {
      setMeasurementLoading(false);
    }
  }

  return (
    <section className="dashboard-panel">
      <header className="dashboard-header">
        <div>
          <p className="dashboard-tag">Área segura</p>
          <h1>Painel Assistencial CoreClin</h1>
          <p className="dashboard-subtitle">
            Login ativo: <strong>{currentLogin}</strong>
          </p>
        </div>
        <LogoutButton />
      </header>

      {dbError ? (
        <section className="dashboard-card dashboard-error">
          <h2>Conexão com banco indisponível</h2>
          <p>{dbError}</p>
          <p>
            Configure `DATABASE_URL` no ambiente da Vercel para habilitar os cadastros e histórico clínico.
          </p>
        </section>
      ) : (
        <>
          <section className="dashboard-card dashboard-highlight">
            <h2>Profissional logado</h2>
            <p>
              <strong>{responsibleProfessionalName}</strong> é o farmacêutico responsável padrão para novos
              pacientes vinculados ao seu login.
            </p>
          </section>

          <div className="dashboard-forms-grid">
            <section className="dashboard-card">
              <h2>Cadastrar Profissional</h2>
              <form className="dashboard-form" onSubmit={handleProfessionalSubmit}>
                <input
                  placeholder="Nome completo"
                  value={professionalForm.fullName}
                  onChange={(event) =>
                    setProfessionalForm((current) => ({ ...current, fullName: event.target.value }))
                  }
                  required
                />

                <div className="dashboard-two-columns">
                  <select
                    value={professionalForm.profession}
                    onChange={(event) =>
                      setProfessionalForm((current) => ({
                        ...current,
                        profession: event.target.value as ProfessionOption
                      }))
                    }
                  >
                    {PROFESSION_OPTIONS.map((profession) => (
                      <option key={profession} value={profession}>
                        {profession}
                      </option>
                    ))}
                  </select>

                  <select
                    value={professionalForm.councilType}
                    onChange={(event) =>
                      setProfessionalForm((current) => ({
                        ...current,
                        councilType: event.target.value as CouncilOption
                      }))
                    }
                  >
                    {COUNCIL_OPTIONS.map((council) => (
                      <option key={council} value={council}>
                        {council}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="dashboard-two-columns">
                  <input
                    placeholder="Número do conselho"
                    value={professionalForm.councilNumber}
                    onChange={(event) =>
                      setProfessionalForm((current) => ({
                        ...current,
                        councilNumber: event.target.value
                      }))
                    }
                    required
                  />
                  <select
                    value={professionalForm.stateUf}
                    onChange={(event) =>
                      setProfessionalForm((current) => ({ ...current, stateUf: event.target.value }))
                    }
                  >
                    {UF_OPTIONS.map((uf) => (
                      <option key={uf} value={uf}>
                        {uf}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="dashboard-two-columns">
                  <input
                    placeholder="Login"
                    value={professionalForm.login}
                    onChange={(event) =>
                      setProfessionalForm((current) => ({ ...current, login: event.target.value }))
                    }
                    required
                  />
                  <input
                    type="password"
                    placeholder="Senha"
                    value={professionalForm.password}
                    onChange={(event) =>
                      setProfessionalForm((current) => ({ ...current, password: event.target.value }))
                    }
                    required
                  />
                </div>

                <input
                  placeholder="Instituição"
                  value={professionalForm.institution}
                  onChange={(event) =>
                    setProfessionalForm((current) => ({ ...current, institution: event.target.value }))
                  }
                  required
                />

                {professionalFeedback ? (
                  <p className={`dashboard-feedback dashboard-feedback-${professionalFeedback.type}`}>
                    {professionalFeedback.message}
                  </p>
                ) : null}

                <button type="submit" disabled={professionalLoading}>
                  {professionalLoading ? "Salvando..." : "Salvar profissional"}
                </button>
              </form>
            </section>

            <section className="dashboard-card">
              <h2>Cadastrar Equipe</h2>
              <form className="dashboard-form" onSubmit={handleTeamSubmit}>
                <input
                  placeholder="Nome da equipe"
                  value={teamName}
                  onChange={(event) => setTeamName(event.target.value)}
                  required
                />

                {teamFeedback ? (
                  <p className={`dashboard-feedback dashboard-feedback-${teamFeedback.type}`}>
                    {teamFeedback.message}
                  </p>
                ) : null}

                <button type="submit" disabled={teamLoading}>
                  {teamLoading ? "Salvando..." : "Salvar equipe"}
                </button>
              </form>

              <div className="dashboard-list-box">
                <h3>Equipes cadastradas</h3>
                {teams.length === 0 ? (
                  <p className="dashboard-muted">Nenhuma equipe cadastrada.</p>
                ) : (
                  <ul className="dashboard-chip-list">
                    {teams.map((team) => (
                      <li key={team.id}>{team.name}</li>
                    ))}
                  </ul>
                )}
              </div>
            </section>
          </div>

          <div className="dashboard-forms-grid">
            <section className="dashboard-card">
              <h2>Cadastrar Paciente (Dados fixos)</h2>
              <form className="dashboard-form" onSubmit={handlePatientSubmit}>
                <input
                  placeholder="Nome completo"
                  value={patientForm.fullName}
                  onChange={(event) =>
                    setPatientForm((current) => ({ ...current, fullName: event.target.value }))
                  }
                  required
                />

                <div className="dashboard-two-columns">
                  <input
                    placeholder="Prontuário"
                    value={patientForm.chartNumber}
                    onChange={(event) =>
                      setPatientForm((current) => ({ ...current, chartNumber: event.target.value }))
                    }
                    required
                  />
                  <input value={responsibleProfessionalName} disabled />
                </div>

                <div className="dashboard-two-columns">
                  <input
                    type="date"
                    value={patientForm.birthDate}
                    onChange={(event) =>
                      setPatientForm((current) => ({ ...current, birthDate: event.target.value }))
                    }
                    required
                  />
                  <input value={agePreview === null ? "Idade" : `${agePreview} anos`} disabled />
                </div>

                {patientFeedback ? (
                  <p className={`dashboard-feedback dashboard-feedback-${patientFeedback.type}`}>
                    {patientFeedback.message}
                  </p>
                ) : null}

                <button type="submit" disabled={patientLoading}>
                  {patientLoading ? "Salvando..." : "Salvar paciente"}
                </button>
              </form>
            </section>

            <section className="dashboard-card">
              <h2>Cadastrar Internação</h2>
              <form className="dashboard-form" onSubmit={handleAdmissionSubmit}>
                <select
                  value={admissionForm.patientId}
                  onChange={(event) =>
                    setAdmissionForm((current) => ({ ...current, patientId: event.target.value }))
                  }
                  required
                >
                  <option value="">Selecione o paciente</option>
                  {patients.map((patient) => (
                    <option key={patient.id} value={patient.id}>
                      {patient.fullName} ({patient.chartNumber})
                    </option>
                  ))}
                </select>

                <div className="dashboard-two-columns">
                  <input
                    type="date"
                    value={admissionForm.admissionDate}
                    onChange={(event) =>
                      setAdmissionForm((current) => ({ ...current, admissionDate: event.target.value }))
                    }
                    required
                  />
                  <input
                    placeholder="Leito"
                    value={admissionForm.bed}
                    onChange={(event) =>
                      setAdmissionForm((current) => ({ ...current, bed: event.target.value }))
                    }
                    required
                  />
                </div>

                <textarea
                  placeholder="Motivo da internação"
                  value={admissionForm.admissionReason}
                  onChange={(event) =>
                    setAdmissionForm((current) => ({
                      ...current,
                      admissionReason: event.target.value
                    }))
                  }
                  required
                />

                <select
                  value={admissionForm.teamId}
                  onChange={(event) =>
                    setAdmissionForm((current) => ({ ...current, teamId: event.target.value }))
                  }
                  required
                >
                  <option value="">Selecione a equipe</option>
                  {teams.map((team) => (
                    <option key={team.id} value={team.id}>
                      {team.name}
                    </option>
                  ))}
                </select>

                {admissionFeedback ? (
                  <p className={`dashboard-feedback dashboard-feedback-${admissionFeedback.type}`}>
                    {admissionFeedback.message}
                  </p>
                ) : null}

                <button type="submit" disabled={admissionLoading}>
                  {admissionLoading ? "Salvando..." : "Salvar internação"}
                </button>
              </form>
            </section>
          </div>

          <section className="dashboard-card">
            <h2>Dados Variáveis (Histórico)</h2>
            <form className="dashboard-form" onSubmit={handleMeasurementSubmit}>
              <select
                value={measurementForm.patientId}
                onChange={(event) =>
                  setMeasurementForm((current) => ({ ...current, patientId: event.target.value }))
                }
                required
              >
                <option value="">Selecione o paciente</option>
                {patients.map((patient) => (
                  <option key={patient.id} value={patient.id}>
                    {patient.fullName} ({patient.chartNumber})
                  </option>
                ))}
              </select>

              <div className="dashboard-two-columns">
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="Peso atual (kg)"
                  value={measurementForm.weightKg}
                  onChange={(event) =>
                    setMeasurementForm((current) => ({ ...current, weightKg: event.target.value }))
                  }
                  required
                />
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="Altura atual (cm)"
                  value={measurementForm.heightCm}
                  onChange={(event) =>
                    setMeasurementForm((current) => ({ ...current, heightCm: event.target.value }))
                  }
                  required
                />
              </div>

              {measurementFeedback ? (
                <p className={`dashboard-feedback dashboard-feedback-${measurementFeedback.type}`}>
                  {measurementFeedback.message}
                </p>
              ) : null}

              <button type="submit" disabled={measurementLoading}>
                {measurementLoading ? "Salvando..." : "Registrar no histórico"}
              </button>
            </form>
          </section>

          <section className="dashboard-card">
            <h2>Profissionais cadastrados</h2>
            <div className="dashboard-table-wrap">
              <table className="dashboard-table">
                <thead>
                  <tr>
                    <th>Nome</th>
                    <th>Profissão</th>
                    <th>Conselho</th>
                    <th>Login</th>
                    <th>Instituição</th>
                  </tr>
                </thead>
                <tbody>
                  {professionals.map((professional) => (
                    <tr key={professional.id}>
                      <td>{professional.fullName}</td>
                      <td>{professional.profession}</td>
                      <td>
                        {professional.councilType}/{professional.stateUf}: {professional.councilNumber}
                      </td>
                      <td>{professional.login}</td>
                      <td>{professional.institution}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          <section className="dashboard-card">
            <h2>Pacientes cadastrados</h2>
            <div className="dashboard-table-wrap">
              <table className="dashboard-table">
                <thead>
                  <tr>
                    <th>Nome</th>
                    <th>Prontuário</th>
                    <th>Idade</th>
                    <th>Última internação</th>
                    <th>Último leito</th>
                    <th>Peso/Altura</th>
                    <th>IMC</th>
                    <th>SC</th>
                  </tr>
                </thead>
                <tbody>
                  {patients.map((patient) => (
                    <tr key={patient.id}>
                      <td>{patient.fullName}</td>
                      <td>{patient.chartNumber}</td>
                      <td>{patient.ageYears} anos</td>
                      <td>
                        {patient.latestAdmission ? formatTimestamp(patient.latestAdmission.createdAt) : "-"}
                      </td>
                      <td>{patient.latestAdmission?.bed ?? "-"}</td>
                      <td>
                        {patient.latestMeasurement
                          ? `${formatNumber(patient.latestMeasurement.weightKg)} kg / ${formatNumber(patient.latestMeasurement.heightCm)} cm`
                          : "-"}
                      </td>
                      <td>
                        {patient.latestMeasurement ? formatNumber(patient.latestMeasurement.bmi) : "-"}
                      </td>
                      <td>
                        {patient.latestMeasurement
                          ? formatNumber(patient.latestMeasurement.bodySurfaceArea)
                          : "-"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          <section className="dashboard-card">
            <h2>Internações recentes</h2>
            <div className="dashboard-table-wrap">
              <table className="dashboard-table">
                <thead>
                  <tr>
                    <th>Paciente</th>
                    <th>Prontuário</th>
                    <th>Data de admissão</th>
                    <th>Equipe</th>
                    <th>Leito</th>
                    <th>Motivo</th>
                    <th>Cadastro</th>
                  </tr>
                </thead>
                <tbody>
                  {recentAdmissions.map((admission) => (
                    <tr key={admission.id}>
                      <td>{admission.patientName}</td>
                      <td>{admission.chartNumber}</td>
                      <td>{admission.admissionDate}</td>
                      <td>{admission.teamName ?? "-"}</td>
                      <td>{admission.bed}</td>
                      <td>{admission.admissionReason}</td>
                      <td>{formatTimestamp(admission.createdAt)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          <section className="dashboard-card">
            <h2>Histórico recente de dados variáveis</h2>
            <div className="dashboard-table-wrap">
              <table className="dashboard-table">
                <thead>
                  <tr>
                    <th>Paciente</th>
                    <th>Peso (kg)</th>
                    <th>Altura (cm)</th>
                    <th>IMC</th>
                    <th>Superfície corporal</th>
                    <th>Registro</th>
                  </tr>
                </thead>
                <tbody>
                  {recentMeasurements.map((item) => (
                    <tr key={item.id}>
                      <td>{item.patientName}</td>
                      <td>{formatNumber(item.weightKg)}</td>
                      <td>{formatNumber(item.heightCm)}</td>
                      <td>{formatNumber(item.bmi)}</td>
                      <td>{formatNumber(item.bodySurfaceArea)}</td>
                      <td>{formatTimestamp(item.recordedAt)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        </>
      )}
    </section>
  );
}

