"use client";

import { FormEvent, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import LogoutButton from "@/app/_components/logout-button";
import { calculateClinicalIndexes } from "@/lib/clinical";
import {
  BSA_FORMULA_OPTIONS,
  BMI_FORMULA_OPTIONS,
  COUNCIL_OPTIONS,
  PROFESSION_OPTIONS,
  type BmiFormulaId,
  type BsaFormulaId,
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

const DASHBOARD_NAV_ITEMS = [
  { id: "professional", label: "Cadastrar Profissional" },
  { id: "team", label: "Cadastrar Equipe" },
  { id: "patient", label: "Cadastrar Paciente" },
  { id: "admission", label: "Internação" }
] as const;

type DashboardSectionId = (typeof DASHBOARD_NAV_ITEMS)[number]["id"];
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

function getBmiFormulaLabel(formulaId: BmiFormulaId | null): string {
  if (!formulaId) {
    return "-";
  }
  const found = BMI_FORMULA_OPTIONS.find((item) => item.id === formulaId);
  return found?.label ?? formulaId;
}

function getBsaFormulaLabel(formulaId: BsaFormulaId | null): string {
  if (!formulaId) {
    return "-";
  }
  const found = BSA_FORMULA_OPTIONS.find((item) => item.id === formulaId);
  return found?.label ?? formulaId;
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

  const [activeSection, setActiveSection] = useState<DashboardSectionId>("professional");

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
    teamId: teams[0] ? String(teams[0].id) : "",
    weightKg: "",
    heightCm: "",
    bmiFormula: "quetelet" as BmiFormulaId,
    bsaFormula: "mosteller" as BsaFormulaId
  });
  const [admissionFeedback, setAdmissionFeedback] = useState<FeedbackState>(null);
  const [admissionLoading, setAdmissionLoading] = useState(false);

  const agePreview = useMemo(() => calculateAge(patientForm.birthDate), [patientForm.birthDate]);
  const responsibleProfessionalName = currentProfessional?.fullName ?? currentLogin;

  const admissionPreview = useMemo(() => {
    const weight = Number(admissionForm.weightKg);
    const height = Number(admissionForm.heightCm);
    if (!Number.isFinite(weight) || weight <= 0 || !Number.isFinite(height) || height <= 0) {
      return null;
    }

    return calculateClinicalIndexes(weight, height, admissionForm.bmiFormula, admissionForm.bsaFormula);
  }, [
    admissionForm.weightKg,
    admissionForm.heightCm,
    admissionForm.bmiFormula,
    admissionForm.bsaFormula
  ]);

  const selectedBmiFormula = BMI_FORMULA_OPTIONS.find(
    (formula) => formula.id === admissionForm.bmiFormula
  );
  const selectedBsaFormula = BSA_FORMULA_OPTIONS.find(
    (formula) => formula.id === admissionForm.bsaFormula
  );

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
          teamId: Number(admissionForm.teamId),
          weightKg: Number(admissionForm.weightKg),
          heightCm: Number(admissionForm.heightCm)
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
        teamId: teams[0] ? String(teams[0].id) : "",
        weightKg: "",
        heightCm: "",
        bmiFormula: "quetelet",
        bsaFormula: "mosteller"
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
              registros.
            </p>
          </section>

          <div className="dashboard-layout">
            <aside className="dashboard-sidebar">
              <h2>Menu</h2>
              <nav>
                {DASHBOARD_NAV_ITEMS.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    className={`dashboard-sidebar-link ${activeSection === item.id ? "is-active" : ""}`}
                    onClick={() => setActiveSection(item.id)}
                  >
                    {item.label}
                  </button>
                ))}
              </nav>
            </aside>

            <div className="dashboard-content">
              {activeSection === "professional" ? (
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
              ) : null}

              {activeSection === "team" ? (
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
              ) : null}

              {activeSection === "patient" ? (
                <section className="dashboard-card">
                  <h2>Cadastrar Paciente</h2>
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
              ) : null}

              {activeSection === "admission" ? (
                <section className="dashboard-card">
                  <h2>Internação</h2>
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
                          setAdmissionForm((current) => ({
                            ...current,
                            admissionDate: event.target.value
                          }))
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

                    <div className="dashboard-two-columns">
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        placeholder="Peso (kg)"
                        value={admissionForm.weightKg}
                        onChange={(event) =>
                          setAdmissionForm((current) => ({ ...current, weightKg: event.target.value }))
                        }
                        required
                      />
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        placeholder="Altura (cm)"
                        value={admissionForm.heightCm}
                        onChange={(event) =>
                          setAdmissionForm((current) => ({ ...current, heightCm: event.target.value }))
                        }
                        required
                      />
                    </div>

                    <div className="dashboard-two-columns">
                      <select
                        value={admissionForm.bmiFormula}
                        onChange={(event) =>
                          setAdmissionForm((current) => ({
                            ...current,
                            bmiFormula: event.target.value as BmiFormulaId
                          }))
                        }
                      >
                        {BMI_FORMULA_OPTIONS.map((formula) => (
                          <option key={formula.id} value={formula.id}>
                            IMC: {formula.label}
                          </option>
                        ))}
                      </select>
                      <select
                        value={admissionForm.bsaFormula}
                        onChange={(event) =>
                          setAdmissionForm((current) => ({
                            ...current,
                            bsaFormula: event.target.value as BsaFormulaId
                          }))
                        }
                      >
                        {BSA_FORMULA_OPTIONS.map((formula) => (
                          <option key={formula.id} value={formula.id}>
                            SC: {formula.label}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="dashboard-calculation-box">
                      <h3>Cálculo automático</h3>
                      <p>
                        {selectedBmiFormula?.label}:{" "}
                        <span>{selectedBmiFormula?.equation ?? "-"}</span>
                      </p>
                      <p>
                        {selectedBsaFormula?.label}:{" "}
                        <span>{selectedBsaFormula?.equation ?? "-"}</span>
                      </p>
                      <div className="dashboard-two-columns">
                        <input
                          value={admissionPreview ? formatNumber(admissionPreview.bmi) : "IMC calculado"}
                          disabled
                        />
                        <input
                          value={
                            admissionPreview
                              ? formatNumber(admissionPreview.bodySurfaceArea)
                              : "Superfície corporal calculada"
                          }
                          disabled
                        />
                      </div>
                    </div>

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
              ) : null}
            </div>
          </div>

          <section className="dashboard-card">
            <h2>Internações recentes</h2>
            <div className="dashboard-table-wrap">
              <table className="dashboard-table">
                <thead>
                  <tr>
                    <th>Paciente</th>
                    <th>Admissão</th>
                    <th>Leito</th>
                    <th>Equipe</th>
                    <th>Peso/Altura</th>
                    <th>IMC</th>
                    <th>Fórmula IMC</th>
                    <th>SC</th>
                    <th>Fórmula SC</th>
                  </tr>
                </thead>
                <tbody>
                  {recentAdmissions.map((admission) => (
                    <tr key={admission.id}>
                      <td>{admission.patientName}</td>
                      <td>{admission.admissionDate}</td>
                      <td>{admission.bed}</td>
                      <td>{admission.teamName ?? "-"}</td>
                      <td>
                        {admission.weightKg !== null && admission.heightCm !== null
                          ? `${formatNumber(admission.weightKg)} kg / ${formatNumber(admission.heightCm)} cm`
                          : "-"}
                      </td>
                      <td>{admission.bmi !== null ? formatNumber(admission.bmi) : "-"}</td>
                      <td>{getBmiFormulaLabel(admission.bmiFormula)}</td>
                      <td>
                        {admission.bodySurfaceArea !== null
                          ? formatNumber(admission.bodySurfaceArea)
                          : "-"}
                      </td>
                      <td>{getBsaFormulaLabel(admission.bsaFormula)}</td>
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
                      <td>{patient.latestAdmission ? patient.latestAdmission.admissionDate : "-"}</td>
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
            <h2>Histórico recente de medidas</h2>
            <div className="dashboard-table-wrap">
              <table className="dashboard-table">
                <thead>
                  <tr>
                    <th>Paciente</th>
                    <th>Peso</th>
                    <th>Altura</th>
                    <th>IMC</th>
                    <th>Fórmula IMC</th>
                    <th>SC</th>
                    <th>Fórmula SC</th>
                    <th>Registro</th>
                  </tr>
                </thead>
                <tbody>
                  {recentMeasurements.map((measurement) => (
                    <tr key={measurement.id}>
                      <td>{measurement.patientName}</td>
                      <td>{formatNumber(measurement.weightKg)}</td>
                      <td>{formatNumber(measurement.heightCm)}</td>
                      <td>{formatNumber(measurement.bmi)}</td>
                      <td>{getBmiFormulaLabel(measurement.bmiFormula)}</td>
                      <td>{formatNumber(measurement.bodySurfaceArea)}</td>
                      <td>{getBsaFormulaLabel(measurement.bsaFormula)}</td>
                      <td>{formatTimestamp(measurement.recordedAt)}</td>
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

