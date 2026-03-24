import { type AuditLogAction } from "@/lib/coreclin-types";

function normalizeLogin(value: string): string {
  return value.trim().toLowerCase();
}

export function getAuditLogViewerLogins(): string[] {
  const configuredLogins = process.env.AUDIT_LOG_VIEWERS ?? process.env.AUTH_USERNAME ?? "jephesson";

  return Array.from(
    new Set(
      configuredLogins
        .split(",")
        .map((login) => normalizeLogin(login))
        .filter((login) => login.length > 0)
    )
  );
}

export function canViewAuditLogs(login: string): boolean {
  const normalizedLogin = normalizeLogin(login);
  if (!normalizedLogin) {
    return false;
  }

  return getAuditLogViewerLogins().includes(normalizedLogin);
}

export function formatAuditActionLabel(action: AuditLogAction | string): string {
  switch (action) {
    case "patient_created":
      return "Paciente cadastrado";
    case "admission_created":
      return "Internacao cadastrada";
    case "admission_updated":
      return "Internacao atualizada";
    case "admission_round_note_created":
      return "Nota de round criada";
    case "patient_measurement_recorded":
      return "Medidas registradas";
    case "patient_dashboard_viewed":
      return "Acesso ao prontuario";
    case "patient_evolution_preview_viewed":
      return "Previa de evolucao";
    case "patient_allergy_created":
      return "Alergia cadastrada";
    case "patient_allergy_updated":
      return "Alergia atualizada";
    case "patient_allergy_deleted":
      return "Alergia removida";
    case "prior_medication_created":
      return "Medicamento previo cadastrado";
    case "prior_medication_updated":
      return "Medicamento previo atualizado";
    case "prior_medication_deleted":
      return "Medicamento previo removido";
    case "medical_prescription_created":
      return "Prescricao cadastrada";
    case "medical_prescriptions_deleted":
      return "Prescricao removida";
    case "medical_prescription_validation_updated":
      return "Validacao de prescricao atualizada";
    case "patient_exam_import_created":
      return "Importacao de exames criada";
    case "patient_exam_record_deleted":
      return "Registro de exame removido";
    case "patient_exam_import_deleted":
      return "Importacao de exames removida";
    case "team_created":
      return "Equipe cadastrada";
    case "professional_created":
      return "Profissional cadastrado";
    case "professional_updated":
      return "Profissional atualizado";
    default:
      return action;
  }
}
