import { NextResponse } from "next/server";

import { getCurrentSession } from "@/lib/auth";
import {
  addAdmissionRoundNote,
  addMedicalPrescription,
  addPatientAllergy,
  addPatientExamImport,
  addPatientMeasurement,
  addPriorMedication,
  createAdmission,
  createMedication,
  createPatient,
  createProfessional,
  createTeam,
  findProfessionalByLogin,
  listMedicationCatalog,
  listTeams,
  recordAuditLogSafely,
  updateMedicalPrescriptionValidation,
  updatePriorMedication,
  type CreateMedicationInput
} from "@/lib/db";
import { type PatientExamResultRecord } from "@/lib/coreclin-types";

export const runtime = "nodejs";

const TEST_TEAM_NAME = "Clinica medica 1";

const TEST_MEDICATIONS: CreateMedicationInput[] = [
  {
    name: "Losartana",
    defaultUnit: "mg",
    activeIngredients: "losartana potassica",
    therapeuticClass: "anti-hipertensivo",
    searchAliases: "losartan"
  },
  {
    name: "Metformina",
    defaultUnit: "mg",
    activeIngredients: "cloridrato de metformina",
    therapeuticClass: "antidiabetico",
    searchAliases: "metformin"
  },
  {
    name: "Sinvastatina",
    defaultUnit: "mg",
    activeIngredients: "sinvastatina",
    therapeuticClass: "estatinas",
    searchAliases: "simvastatina"
  },
  {
    name: "AAS",
    defaultUnit: "mg",
    activeIngredients: "acido acetilsalicilico",
    therapeuticClass: "antiagregante plaquetario",
    searchAliases: "aspirina"
  },
  {
    name: "Omeprazol",
    defaultUnit: "mg",
    activeIngredients: "omeprazol",
    therapeuticClass: "inibidor da bomba de proton",
    searchAliases: "omeprazole"
  },
  {
    name: "Piperacilina + Tazobactam",
    defaultUnit: "g",
    activeIngredients: "piperacilina; tazobactam",
    therapeuticClass: "antibiotico beta-lactamico",
    searchAliases: "tazocin; piptazo"
  },
  {
    name: "Enoxaparina",
    defaultUnit: "mg",
    activeIngredients: "enoxaparina sodica",
    therapeuticClass: "anticoagulante",
    searchAliases: "clexane"
  },
  {
    name: "Dipirona",
    defaultUnit: "mg",
    activeIngredients: "dipirona sodica",
    therapeuticClass: "analgesico",
    searchAliases: "metamizol"
  },
  {
    name: "Furosemida",
    defaultUnit: "mg",
    activeIngredients: "furosemida",
    therapeuticClass: "diuretico de alca",
    searchAliases: "lasix"
  }
];

type MedicationByKey = Record<string, { id: number; name: string; defaultUnit: string }>;

function normalizeKey(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLowerCase();
}

function buildIsoDate(daysFromToday = 0): string {
  const date = new Date();
  date.setHours(12, 0, 0, 0);
  date.setDate(date.getDate() + daysFromToday);
  return date.toISOString().slice(0, 10);
}

async function ensureResponsibleProfessional(login: string): Promise<void> {
  const existingProfessional = await findProfessionalByLogin(login);
  if (existingProfessional) {
    return;
  }

  await createProfessional({
    fullName: `Profissional ${login}`,
    profession: "Farmacêutico",
    councilType: "CRF",
    councilNumber: "0000",
    stateUf: "PB",
    login,
    password: `seed-${Date.now()}`,
    institution: "CoreClin"
  });
}

async function ensureTeam(name: string): Promise<{ id: number; name: string }> {
  const teams = await listTeams();
  const existingTeam = teams.find((team) => normalizeKey(team.name) === normalizeKey(name)) ?? null;
  if (existingTeam) {
    return existingTeam;
  }

  return createTeam(name);
}

async function ensureMedications(): Promise<MedicationByKey> {
  const catalog = await listMedicationCatalog();
  const catalogByKey = new Map(catalog.map((item) => [normalizeKey(item.name), item] as const));
  const medicationsByKey: MedicationByKey = {};

  for (const medication of TEST_MEDICATIONS) {
    const key = normalizeKey(medication.name);
    const existingMedication = catalogByKey.get(key) ?? null;
    const savedMedication = existingMedication ?? (await createMedication(medication));
    medicationsByKey[key] = savedMedication;
    catalogByKey.set(key, savedMedication);
  }

  return medicationsByKey;
}

function buildExamImport(): { rawText: string; records: PatientExamResultRecord[] } {
  const examDate = buildIsoDate(0);
  return {
    rawText: [
      "Hemograma e bioquimica",
      `Data do exame: ${examDate}`,
      "Hemoglobina: 9.2 g/dL",
      "Leucocitos: 18200 /mm3",
      "Plaquetas: 118000 /mm3",
      "Creatinina: 2.1 mg/dL",
      "Ureia: 88 mg/dL",
      "Potassio: 5.8 mEq/L",
      "PCR: 186 mg/L",
      "Lactato: 3.4 mmol/L",
      "INR: 1.7"
    ].join("\n"),
    records: [
      {
        key: "hb",
        examName: "Hemoglobina",
        result: "9.2",
        unit: "g/dL",
        referenceRange: "12-16",
        pageNumber: 1,
        examDate
      },
      {
        key: "leuco",
        examName: "Leucocitos",
        result: "18200",
        unit: "/mm3",
        referenceRange: "4000-10000",
        pageNumber: 1,
        examDate
      },
      {
        key: "plaquetas",
        examName: "Plaquetas",
        result: "118000",
        unit: "/mm3",
        referenceRange: "150000-450000",
        pageNumber: 1,
        examDate
      },
      {
        key: "creatinina",
        examName: "Creatinina",
        result: "2.1",
        unit: "mg/dL",
        referenceRange: "0.7-1.3",
        pageNumber: 1,
        examDate
      },
      {
        key: "ureia",
        examName: "Ureia",
        result: "88",
        unit: "mg/dL",
        referenceRange: "10-50",
        pageNumber: 1,
        examDate
      },
      {
        key: "potassio",
        examName: "Potassio",
        result: "5.8",
        unit: "mEq/L",
        referenceRange: "3.5-5.1",
        pageNumber: 1,
        examDate
      },
      {
        key: "pcr",
        examName: "PCR",
        result: "186",
        unit: "mg/L",
        referenceRange: "0-5",
        pageNumber: 1,
        examDate
      },
      {
        key: "lactato",
        examName: "Lactato",
        result: "3.4",
        unit: "mmol/L",
        referenceRange: "0.5-2.2",
        pageNumber: 1,
        examDate
      },
      {
        key: "inr",
        examName: "INR",
        result: "1.7",
        unit: "",
        referenceRange: "0.8-1.2",
        pageNumber: 1,
        examDate
      }
    ]
  };
}

export async function POST(): Promise<NextResponse> {
  const session = await getCurrentSession();
  if (!session) {
    return NextResponse.json({ message: "Sessao invalida." }, { status: 401 });
  }

  try {
    await ensureResponsibleProfessional(session.username);
    const team = await ensureTeam(TEST_TEAM_NAME);
    const medications = await ensureMedications();

    const suffix = String(Date.now()).slice(-8);
    const chartNumber = `TESTE-${suffix}`;
    const patient = await createPatient({
      fullName: `Caso clinico de teste ${suffix}`,
      chartNumber,
      birthDate: "1951-08-14",
      sex: "male",
      responsibleLogin: session.username,
      allergies: []
    });

    const admission = await createAdmission({
      patientId: patient.id,
      admissionDate: buildIsoDate(-1),
      bed: "UTI-03",
      admissionReason: "Pneumonia grave comunitaria com sepse e lesao renal aguda",
      deniesContinuousMedicationUse: false,
      admissionSummary:
        "Paciente admitido com desconforto respiratorio progressivo, febre, queda do estado geral e necessidade de suporte ventilatorio invasivo.",
      roundSummary:
        "Paciente segue em melhora hemodinamica parcial, ainda dependente de reavaliacao de profilaxias e ajuste de antimicrobiano conforme cultura.",
      roundSummaryDate: buildIsoDate(0),
      admissionImportExcerpt:
        "Uso previo referido pela familia: losartana 50 mg/dia, metformina 850 mg 12/12h, sinvastatina 40 mg/noite, AAS 100 mg/dia e omeprazol 20 mg/dia.",
      interviewInformationQuality: "media",
      interviewInformationSourceType: "informant",
      interviewInformationSourceName: "Maria da Silva",
      interviewInformationSourceRelationship: "esposa",
      interviewAmbulates: false,
      interviewIsIntubated: true,
      paduaActiveCancer: false,
      paduaPreviousVte: true,
      paduaKnownThrombophilia: false,
      paduaRecentTraumaOrSurgery: false,
      paduaHeartOrRespiratoryFailure: true,
      paduaAcuteMiOrIschemicStroke: false,
      paduaAcuteInfectionOrRheumatologicDisorder: true,
      paduaHormonalTreatment: false,
      paduaContraindicationToPharmacologicProphylaxis: false,
      paduaNotes:
        "Padua de teste com infeccao aguda, insuficiencia respiratoria, idade avancada e imobilidade.",
      lamgCriticallyIll: true,
      lamgShock: true,
      lamgCoagulopathy: true,
      lamgChronicLiverDisease: false,
      lamgNeurocritical: false,
      lamgEnteralNutrition: false,
      lamgAgent: "ppi",
      lamgNotes:
        "Caso de teste mantem profilaxia por paciente critico com choque e coagulopatia; revisar diariamente.",
      interviewInterventionMotive: "Conciliacao medicamentosa e avaliacao de profilaxias",
      interviewSubjective:
        "Esposa refere que o paciente usava medicamentos de uso continuo de forma regular e apresentava piora da dispneia ha 5 dias.",
      interviewRelevantSymptoms:
        "Dispneia, febre, tosse produtiva, oliguria nas ultimas 24 horas.",
      interviewPendingIssues:
        "Reavaliar necessidade de profilaxia gastrica diaria apos retirada da ventilacao invasiva; revisar funcao renal para doses.",
      interviewPlan:
        "Conciliar MUC, acompanhar funcao renal, revisar profilaxia de TEV e profilaxia gastrica, monitorar seguranca da prescricao.",
      teamId: team.id,
      weightKg: 88,
      heightCm: 172,
      responsibleLogin: session.username
    });

    await addPatientMeasurement(patient.id, 86, 172, "quetelet", "mosteller", admission.id);

    await addPatientAllergy({
      patientId: patient.id,
      allergyName: medications[normalizeKey("Dipirona")].name,
      reactionDescription: "Broncoespasmo e urticaria segundo familiar."
    });

    const priorLosartana = await addPriorMedication({
      patientId: patient.id,
      medicationId: medications[normalizeKey("Losartana")].id,
      medicationName: medications[normalizeKey("Losartana")].name,
      dose: 50,
      doseUnit: "mg",
      frequency: "1x ao dia",
      shifts: "08:00"
    });
    const priorMetformina = await addPriorMedication({
      patientId: patient.id,
      medicationId: medications[normalizeKey("Metformina")].id,
      medicationName: medications[normalizeKey("Metformina")].name,
      dose: 850,
      doseUnit: "mg",
      frequency: "2x ao dia",
      shifts: "08:00 / 20:00"
    });
    const priorSinvastatina = await addPriorMedication({
      patientId: patient.id,
      medicationId: medications[normalizeKey("Sinvastatina")].id,
      medicationName: medications[normalizeKey("Sinvastatina")].name,
      dose: 40,
      doseUnit: "mg",
      frequency: "1x ao dia",
      shifts: "22:00"
    });
    await addPriorMedication({
      patientId: patient.id,
      medicationId: medications[normalizeKey("AAS")].id,
      medicationName: medications[normalizeKey("AAS")].name,
      dose: 100,
      doseUnit: "mg",
      frequency: "1x ao dia",
      shifts: "08:00"
    });
    const priorOmeprazol = await addPriorMedication({
      patientId: patient.id,
      medicationId: medications[normalizeKey("Omeprazol")].id,
      medicationName: medications[normalizeKey("Omeprazol")].name,
      dose: 20,
      doseUnit: "mg",
      frequency: "1x ao dia",
      shifts: "06:00"
    });

    const prescriptionStartAt = new Date().toISOString();
    const losartanaRx = await addMedicalPrescription({
      patientId: patient.id,
      admissionId: admission.id,
      medicationId: medications[normalizeKey("Losartana")].id,
      medicationName: medications[normalizeKey("Losartana")].name,
      dose: 50,
      doseUnit: "mg",
      administrationRoute: "VO",
      frequency: "1x ao dia",
      shifts: "08:00",
      notes: "Uso habitual mantido.",
      validationStartAt: prescriptionStartAt,
      validationStatus: "Validado",
      externalValidationCandidate: true
    });
    const omeprazolRx = await addMedicalPrescription({
      patientId: patient.id,
      admissionId: admission.id,
      medicationId: medications[normalizeKey("Omeprazol")].id,
      medicationName: medications[normalizeKey("Omeprazol")].name,
      dose: 40,
      doseUnit: "mg",
      administrationRoute: "EV",
      frequency: "1x ao dia",
      shifts: "06:00",
      notes: "Profilaxia gastrica em paciente critico.",
      validationStartAt: prescriptionStartAt,
      validationStatus: "Validado",
      externalValidationCandidate: true
    });
    await addMedicalPrescription({
      patientId: patient.id,
      admissionId: admission.id,
      medicationId: medications[normalizeKey("Piperacilina + Tazobactam")].id,
      medicationName: medications[normalizeKey("Piperacilina + Tazobactam")].name,
      dose: 4.5,
      doseUnit: "g",
      administrationRoute: "EV",
      frequency: "6/6h",
      shifts: "00:00 / 06:00 / 12:00 / 18:00",
      notes: "Antibioticoterapia empirica.",
      validationStartAt: prescriptionStartAt,
      validationStatus: "Validado"
    });
    await addMedicalPrescription({
      patientId: patient.id,
      admissionId: admission.id,
      medicationId: medications[normalizeKey("Enoxaparina")].id,
      medicationName: medications[normalizeKey("Enoxaparina")].name,
      dose: 40,
      doseUnit: "mg",
      administrationRoute: "SC",
      frequency: "1x ao dia",
      shifts: "20:00",
      notes: "Profilaxia de TEV.",
      validationStartAt: prescriptionStartAt,
      validationStatus: "Validado"
    });
    await addMedicalPrescription({
      patientId: patient.id,
      admissionId: admission.id,
      medicationId: medications[normalizeKey("Furosemida")].id,
      medicationName: medications[normalizeKey("Furosemida")].name,
      dose: 20,
      doseUnit: "mg",
      administrationRoute: "EV",
      frequency: "12/12h",
      shifts: "08:00 / 20:00",
      notes: "Controle de congestao.",
      validationStartAt: prescriptionStartAt,
      validationStatus: "Validado"
    });

    await updatePriorMedication({
      patientId: patient.id,
      priorMedicationId: priorLosartana.id,
      medicationId: priorLosartana.medicationId ?? medications[normalizeKey("Losartana")].id,
      medicationName: priorLosartana.medicationName,
      dose: priorLosartana.dose,
      doseUnit: priorLosartana.doseUnit,
      frequency: priorLosartana.frequency,
      shifts: priorLosartana.shifts,
      reconciliationManualStatus: true,
      reconciliationIntentionalStatus: "sim",
      reconciliationPrescriptionId: losartanaRx.id
    });
    await updatePriorMedication({
      patientId: patient.id,
      priorMedicationId: priorMetformina.id,
      medicationId: priorMetformina.medicationId ?? medications[normalizeKey("Metformina")].id,
      medicationName: priorMetformina.medicationName,
      dose: priorMetformina.dose,
      doseUnit: priorMetformina.doseUnit,
      frequency: priorMetformina.frequency,
      shifts: priorMetformina.shifts,
      reconciliationManualStatus: false,
      reconciliationIntentionalStatus: "nao",
      reconciliationPrescriptionId: null
    });
    await updatePriorMedication({
      patientId: patient.id,
      priorMedicationId: priorSinvastatina.id,
      medicationId: priorSinvastatina.medicationId ?? medications[normalizeKey("Sinvastatina")].id,
      medicationName: priorSinvastatina.medicationName,
      dose: priorSinvastatina.dose,
      doseUnit: priorSinvastatina.doseUnit,
      frequency: priorSinvastatina.frequency,
      shifts: priorSinvastatina.shifts,
      reconciliationManualStatus: false,
      reconciliationIntentionalStatus: "nao-se-aplica",
      reconciliationPrescriptionId: null
    });
    await updatePriorMedication({
      patientId: patient.id,
      priorMedicationId: priorOmeprazol.id,
      medicationId: priorOmeprazol.medicationId ?? medications[normalizeKey("Omeprazol")].id,
      medicationName: priorOmeprazol.medicationName,
      dose: priorOmeprazol.dose,
      doseUnit: priorOmeprazol.doseUnit,
      frequency: priorOmeprazol.frequency,
      shifts: priorOmeprazol.shifts,
      reconciliationManualStatus: true,
      reconciliationIntentionalStatus: "sim",
      reconciliationPrescriptionId: omeprazolRx.id
    });

    await updateMedicalPrescriptionValidation({
      patientId: patient.id,
      prescriptionId: losartanaRx.id,
      quantityTablets: 28,
      lotNumber: "LT-TESTE-01",
      expirationDate: "2026-12-31",
      manufacturer: "EMS",
      patientDidNotBring: false,
      stockValidationNote: "Trouxe cartela parcialmente utilizada.",
      responsibleLogin: session.username
    });
    await updateMedicalPrescriptionValidation({
      patientId: patient.id,
      prescriptionId: omeprazolRx.id,
      patientDidNotBring: true,
      stockValidationNote: "Nao trouxe o omeprazol de uso domiciliar.",
      interventionNotes:
        "Reavaliar necessidade de profilaxia gastrica diariamente e suspender quando nao houver mais criterio clinico.",
      interventionErrorType: "Outros",
      interventionContactStatus: "Realizado",
      interventionRequestedToPrescriber: true,
      interventionResponse: "Aceita",
      responsibleLogin: session.username
    });

    const examImport = buildExamImport();
    await addPatientExamImport({
      patientId: patient.id,
      importedByLogin: session.username,
      fileName: `caso-clinico-${chartNumber}.pdf`,
      pageCount: 3,
      rawText: examImport.rawText,
      records: examImport.records
    });

    await addAdmissionRoundNote({
      admissionId: admission.id,
      roundDate: buildIsoDate(-1),
      note: "Paciente admitido em ventilacao mecanica invasiva, iniciado antibiotico empirico e coletadas culturas.",
      responsibleLogin: session.username
    });
    await addAdmissionRoundNote({
      admissionId: admission.id,
      roundDate: buildIsoDate(0),
      note: "Mantida profilaxia de TEV, conciliacao medicamentosa em andamento e reavaliacao de profilaxia gastrica programada.",
      responsibleLogin: session.username
    });

    await recordAuditLogSafely({
      actorLogin: session.username,
      action: "test_patient_case_created",
      resourceType: "patient_test_case",
      resourceId: patient.id,
      patientId: patient.id,
      patientNameSnapshot: patient.fullName,
      metadata: {
        chartNumber,
        admissionId: admission.id,
        caseType: "large_clinical_case"
      }
    });

    return NextResponse.json({
      ok: true,
      message: "Caso clinico de teste criado com sucesso.",
      patient,
      admission
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Falha ao criar o caso clinico de teste.";
    return NextResponse.json({ message }, { status: 400 });
  }
}
