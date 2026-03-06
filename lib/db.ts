import { Pool, PoolClient } from "pg";

import { calculateClinicalIndexes } from "@/lib/clinical";
import {
  COUNCIL_OPTIONS,
  PROFESSION_OPTIONS,
  type AdmissionRecord,
  type BmiFormulaId,
  type BsaFormulaId,
  type CouncilOption,
  type DashboardData,
  type MedicalPrescriptionRecord,
  type MedicationRecord,
  type MeasurementHistoryRecord,
  type PatientRecord,
  type PatientAllergyRecord,
  type PriorMedicationRecord,
  type ProfessionOption,
  type ProfessionalRecord,
  type TeamRecord
} from "@/lib/coreclin-types";
import { hashPassword, verifyPassword } from "@/lib/password";

export { COUNCIL_OPTIONS, PROFESSION_OPTIONS };

export type CreateProfessionalInput = {
  fullName: string;
  profession: ProfessionOption;
  councilType: CouncilOption;
  councilNumber: string;
  stateUf: string;
  login: string;
  password: string;
  institution: string;
};

export type CreatePatientInput = {
  fullName: string;
  chartNumber: string;
  birthDate: string;
  responsibleLogin: string;
  allergies: string[];
};

export type CreateAdmissionInput = {
  patientId: number;
  admissionDate: string;
  bed: string;
  admissionReason: string;
  teamId: number;
  weightKg: number;
  heightCm: number;
  bmiFormula: BmiFormulaId;
  bsaFormula: BsaFormulaId;
  responsibleLogin: string;
};

export type CreateMedicationInput = {
  name: string;
  defaultUnit: string;
  therapeuticClass: string;
};

export type AddPatientAllergyInput = {
  patientId: number;
  allergyName: string;
};

export type AddPriorMedicationInput = {
  patientId: number;
  medicationId?: number;
  medicationName: string;
  dose: number;
  doseUnit: string;
  frequency: string;
  shifts: string;
};

export type AddMedicalPrescriptionInput = {
  patientId: number;
  admissionId?: number;
  medicationId?: number;
  medicationName: string;
  dose: number;
  doseUnit: string;
  administrationRoute?: string;
  frequency: string;
  shifts?: string;
  notes?: string;
  validationStartAt?: string;
  validationEndAt?: string;
  validationStatus?: string;
};

type GlobalDbState = typeof globalThis & {
  coreclinPool?: Pool;
  coreclinSetupPromise?: Promise<void>;
};

const globalDbState = globalThis as GlobalDbState;

type DbRow = Record<string, unknown>;

function toNumber(value: unknown): number {
  if (typeof value === "number") {
    return value;
  }
  if (typeof value === "string") {
    return Number(value);
  }
  return 0;
}

function toIso(value: unknown): string {
  if (value instanceof Date) {
    return value.toISOString();
  }
  if (typeof value === "string") {
    const parsed = new Date(value);
    if (!Number.isNaN(parsed.getTime())) {
      return parsed.toISOString();
    }
  }
  return "";
}

function normalizeMedicationCatalogName(name: string): string {
  return name.trim().replace(/\s+/g, " ");
}

function mapProfessional(row: DbRow): ProfessionalRecord {
  return {
    id: toNumber(row.id),
    fullName: String(row.full_name ?? ""),
    profession: String(row.profession ?? "Farmacêutico") as ProfessionOption,
    councilType: String(row.council_type ?? "CRF") as CouncilOption,
    councilNumber: String(row.council_number ?? ""),
    stateUf: String(row.state_uf ?? ""),
    login: String(row.login ?? ""),
    institution: String(row.institution ?? ""),
    createdAt: toIso(row.created_at)
  };
}

function mapTeam(row: DbRow): TeamRecord {
  return {
    id: toNumber(row.id),
    name: String(row.name ?? ""),
    createdAt: toIso(row.created_at)
  };
}

function mapAdmission(row: DbRow): AdmissionRecord {
  return {
    id: toNumber(row.id),
    patientId: toNumber(row.patient_id),
    patientName: String(row.patient_name ?? ""),
    chartNumber: String(row.chart_number ?? ""),
    admissionDate: String(row.admission_date ?? ""),
    bed: String(row.bed ?? ""),
    admissionReason: String(row.admission_reason ?? ""),
    teamId: row.team_id === null ? null : toNumber(row.team_id),
    teamName: row.team_name === null ? null : String(row.team_name),
    responsibleProfessionalId: toNumber(row.responsible_professional_id),
    responsibleProfessionalName: String(row.responsible_professional_name ?? ""),
    weightKg: row.weight_kg === null ? null : toNumber(row.weight_kg),
    heightCm: row.height_cm === null ? null : toNumber(row.height_cm),
    bmi: row.bmi === null ? null : toNumber(row.bmi),
    bmiFormula:
      row.bmi_formula === null ? null : (String(row.bmi_formula) as BmiFormulaId),
    bodySurfaceArea: row.body_surface_area === null ? null : toNumber(row.body_surface_area),
    bsaFormula:
      row.bsa_formula === null ? null : (String(row.bsa_formula) as BsaFormulaId),
    createdAt: toIso(row.created_at)
  };
}

function mapMeasurement(row: DbRow): MeasurementHistoryRecord {
  return {
    id: toNumber(row.id),
    patientId: toNumber(row.patient_id),
    patientName: String(row.patient_name ?? ""),
    weightKg: toNumber(row.weight_kg),
    heightCm: toNumber(row.height_cm),
    bmi: toNumber(row.bmi),
    bmiFormula: String(row.bmi_formula ?? "quetelet") as BmiFormulaId,
    bodySurfaceArea: toNumber(row.body_surface_area),
    bsaFormula: String(row.bsa_formula ?? "mosteller") as BsaFormulaId,
    recordedAt: toIso(row.recorded_at)
  };
}

function mapMedication(row: DbRow): MedicationRecord {
  return {
    id: toNumber(row.id),
    name: String(row.name ?? ""),
    defaultUnit: String(row.default_unit ?? ""),
    therapeuticClass:
      row.therapeutic_class === null ? null : String(row.therapeutic_class),
    createdAt: toIso(row.created_at)
  };
}

function mapPatientAllergy(row: DbRow): PatientAllergyRecord {
  return {
    id: toNumber(row.id),
    patientId: toNumber(row.patient_id),
    patientName: String(row.patient_name ?? ""),
    allergyName: String(row.allergy_name ?? ""),
    createdAt: toIso(row.created_at)
  };
}

function mapPriorMedication(row: DbRow): PriorMedicationRecord {
  return {
    id: toNumber(row.id),
    patientId: toNumber(row.patient_id),
    patientName: String(row.patient_name ?? ""),
    medicationId: row.medication_id === null ? null : toNumber(row.medication_id),
    medicationName: String(row.medication_name ?? ""),
    dose: toNumber(row.dose),
    doseUnit: String(row.dose_unit ?? ""),
    frequency: String(row.frequency ?? ""),
    shifts: String(row.shifts ?? ""),
    createdAt: toIso(row.created_at)
  };
}

function mapMedicalPrescription(row: DbRow): MedicalPrescriptionRecord {
  return {
    id: toNumber(row.id),
    patientId: toNumber(row.patient_id),
    patientName: String(row.patient_name ?? ""),
    admissionId: row.admission_id === null ? null : toNumber(row.admission_id),
    admissionDate: row.admission_date === null ? null : String(row.admission_date),
    bed: row.bed === null ? null : String(row.bed),
    medicationId: row.medication_id === null ? null : toNumber(row.medication_id),
    medicationName: String(row.medication_name ?? ""),
    dose: toNumber(row.dose),
    doseUnit: String(row.dose_unit ?? ""),
    administrationRoute:
      row.administration_route === null ? null : String(row.administration_route),
    frequency: String(row.frequency ?? ""),
    shifts: String(row.shifts ?? ""),
    notes: row.notes === null ? null : String(row.notes),
    validationStartAt:
      row.validation_start_at === null ? null : toIso(row.validation_start_at),
    validationEndAt: row.validation_end_at === null ? null : toIso(row.validation_end_at),
    validationStatus: row.validation_status === null ? null : String(row.validation_status),
    createdAt: toIso(row.created_at)
  };
}

function mapPatient(row: DbRow): PatientRecord {
  const hasLatestAdmission = row.latest_admission_id !== null;
  const hasLatestMeasurement = row.weight_kg !== null && row.height_cm !== null;

  return {
    id: toNumber(row.id),
    fullName: String(row.full_name ?? ""),
    chartNumber: String(row.chart_number ?? ""),
    birthDate: String(row.birth_date ?? ""),
    ageYears: toNumber(row.age_years),
    responsibleProfessionalId: toNumber(row.responsible_professional_id),
    responsibleProfessionalName: String(row.responsible_professional_name ?? ""),
    responsibleProfessionalLogin: String(row.responsible_professional_login ?? ""),
    latestAdmission: hasLatestAdmission
      ? {
          id: toNumber(row.latest_admission_id),
          patientId: toNumber(row.id),
          patientName: String(row.full_name ?? ""),
          chartNumber: String(row.chart_number ?? ""),
          admissionDate: String(row.latest_admission_date ?? ""),
          bed: String(row.latest_admission_bed ?? ""),
          admissionReason: String(row.latest_admission_reason ?? ""),
          teamId: row.latest_admission_team_id === null ? null : toNumber(row.latest_admission_team_id),
          teamName: row.latest_admission_team_name === null ? null : String(row.latest_admission_team_name),
          responsibleProfessionalId: toNumber(row.latest_admission_responsible_professional_id),
          responsibleProfessionalName: String(row.latest_admission_responsible_professional_name ?? ""),
          weightKg: null,
          heightCm: null,
          bmi: null,
          bmiFormula: null,
          bodySurfaceArea: null,
          bsaFormula: null,
          createdAt: toIso(row.latest_admission_created_at)
        }
      : null,
    latestMeasurement: hasLatestMeasurement
      ? {
          weightKg: toNumber(row.weight_kg),
          heightCm: toNumber(row.height_cm),
          bmi: toNumber(row.bmi),
          bmiFormula: String(row.bmi_formula ?? "quetelet") as BmiFormulaId,
          bodySurfaceArea: toNumber(row.body_surface_area),
          bsaFormula: String(row.bsa_formula ?? "mosteller") as BsaFormulaId,
          recordedAt: toIso(row.recorded_at)
        }
      : null
  };
}

function getPool(): Pool {
  if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL não configurada.");
  }

  if (!globalDbState.coreclinPool) {
    globalDbState.coreclinPool = new Pool({
      connectionString: process.env.DATABASE_URL
    });
  }

  return globalDbState.coreclinPool;
}

async function getPatientsColumns(pool: Pool): Promise<Set<string>> {
  const result = await pool.query(
    `
      SELECT column_name
      FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = 'patients'
    `
  );

  return new Set(result.rows.map((row) => String((row as DbRow).column_name)));
}

async function makeLegacyPatientColumnsNullable(pool: Pool, columns: Set<string>): Promise<void> {
  const nullableTargets = ["admission_date", "bed", "admission_reason"] as const;

  for (const column of nullableTargets) {
    if (!columns.has(column)) {
      continue;
    }
    await pool.query(`ALTER TABLE patients ALTER COLUMN ${column} DROP NOT NULL`);
  }
}

async function migrateLegacyAdmissions(pool: Pool, columns: Set<string>): Promise<void> {
  const hasAdmissionFields =
    columns.has("admission_date") && columns.has("bed") && columns.has("admission_reason");
  if (!hasAdmissionFields || !columns.has("responsible_professional_id")) {
    return;
  }

  const teamSelect = columns.has("team_id") ? "p.team_id" : "NULL::integer";

  await pool.query(`
    INSERT INTO admissions (
      patient_id,
      admission_date,
      bed,
      admission_reason,
      team_id,
      responsible_professional_id,
      created_at
    )
    SELECT
      p.id,
      p.admission_date,
      p.bed,
      p.admission_reason,
      ${teamSelect},
      p.responsible_professional_id,
      p.created_at
    FROM patients p
    WHERE
      p.admission_date IS NOT NULL
      AND p.bed IS NOT NULL
      AND p.admission_reason IS NOT NULL
      AND NOT EXISTS (
        SELECT 1
        FROM admissions a
        WHERE
          a.patient_id = p.id
          AND a.admission_date = p.admission_date
          AND a.bed = p.bed
          AND a.admission_reason = p.admission_reason
      )
  `);
}

async function seedDefaultProfessional(pool: Pool): Promise<void> {
  const seedLogin = (process.env.AUTH_USERNAME ?? "jephesson").trim().toLowerCase() || "jephesson";
  const seedPassword = process.env.AUTH_PASSWORD ?? "ufpb2010";
  const seedPasswordHash = hashPassword(seedPassword);

  await pool.query(
    `
      INSERT INTO professionals (
        full_name,
        profession,
        council_type,
        council_number,
        state_uf,
        login,
        password_hash,
        institution
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      ON CONFLICT (login) DO NOTHING
    `,
    [
      "Dr. Jephesson Alex Floriano dos Santos",
      "Farmacêutico",
      "CRF",
      "18913",
      "RS",
      seedLogin,
      seedPasswordHash,
      "HE-UFPel"
    ]
  );
}

async function setupDatabase(): Promise<void> {
  const pool = getPool();

  await pool.query(`
    CREATE TABLE IF NOT EXISTS professionals (
      id SERIAL PRIMARY KEY,
      full_name TEXT NOT NULL,
      profession TEXT NOT NULL,
      council_type TEXT NOT NULL,
      council_number TEXT NOT NULL,
      state_uf CHAR(2) NOT NULL,
      login TEXT NOT NULL UNIQUE,
      password_hash TEXT NOT NULL,
      institution TEXT NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS teams (
      id SERIAL PRIMARY KEY,
      name TEXT NOT NULL UNIQUE,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS patients (
      id SERIAL PRIMARY KEY,
      full_name TEXT NOT NULL,
      chart_number TEXT NOT NULL UNIQUE,
      responsible_professional_id INTEGER NOT NULL REFERENCES professionals(id),
      birth_date DATE NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS admissions (
      id SERIAL PRIMARY KEY,
      patient_id INTEGER NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
      admission_date DATE NOT NULL,
      bed TEXT NOT NULL,
      admission_reason TEXT NOT NULL,
      team_id INTEGER REFERENCES teams(id),
      responsible_professional_id INTEGER NOT NULL REFERENCES professionals(id),
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS patient_measurements (
      id SERIAL PRIMARY KEY,
      patient_id INTEGER NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
      admission_id INTEGER REFERENCES admissions(id) ON DELETE SET NULL,
      weight_kg NUMERIC(6, 2) NOT NULL,
      height_cm NUMERIC(6, 2) NOT NULL,
      bmi NUMERIC(6, 2) NOT NULL,
      bmi_formula TEXT NOT NULL DEFAULT 'quetelet',
      body_surface_area NUMERIC(6, 2) NOT NULL,
      bsa_formula TEXT NOT NULL DEFAULT 'mosteller',
      recorded_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS medication_catalog (
      id SERIAL PRIMARY KEY,
      name TEXT NOT NULL UNIQUE,
      default_unit TEXT NOT NULL,
      therapeutic_class TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS patient_allergies (
      id SERIAL PRIMARY KEY,
      patient_id INTEGER NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
      allergy_name TEXT NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      UNIQUE (patient_id, allergy_name)
    );

    CREATE TABLE IF NOT EXISTS patient_prior_medications (
      id SERIAL PRIMARY KEY,
      patient_id INTEGER NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
      medication_id INTEGER REFERENCES medication_catalog(id) ON DELETE SET NULL,
      medication_name TEXT NOT NULL,
      dose NUMERIC(10, 2) NOT NULL,
      dose_unit TEXT NOT NULL,
      frequency TEXT NOT NULL,
      shifts TEXT NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS medical_prescriptions (
      id SERIAL PRIMARY KEY,
      patient_id INTEGER NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
      admission_id INTEGER REFERENCES admissions(id) ON DELETE SET NULL,
      medication_id INTEGER REFERENCES medication_catalog(id) ON DELETE SET NULL,
      medication_name TEXT NOT NULL,
      dose NUMERIC(10, 2) NOT NULL,
      dose_unit TEXT NOT NULL,
      administration_route TEXT,
      frequency TEXT NOT NULL,
      shifts TEXT NOT NULL,
      notes TEXT,
      validation_start_at TIMESTAMPTZ,
      validation_end_at TIMESTAMPTZ,
      validation_status TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE INDEX IF NOT EXISTS idx_admissions_patient_id ON admissions (patient_id);
    CREATE INDEX IF NOT EXISTS idx_admissions_date ON admissions (admission_date DESC, created_at DESC);
    CREATE INDEX IF NOT EXISTS idx_measurements_patient_id ON patient_measurements (patient_id);
    CREATE INDEX IF NOT EXISTS idx_measurements_recorded_at ON patient_measurements (recorded_at DESC);
    CREATE INDEX IF NOT EXISTS idx_allergies_patient_id ON patient_allergies (patient_id);
    CREATE INDEX IF NOT EXISTS idx_prior_medications_patient_id ON patient_prior_medications (patient_id);
    CREATE INDEX IF NOT EXISTS idx_prescriptions_patient_id ON medical_prescriptions (patient_id);
    CREATE INDEX IF NOT EXISTS idx_prescriptions_admission_id ON medical_prescriptions (admission_id);
  `);

  await pool.query(`
    ALTER TABLE patient_measurements
    ADD COLUMN IF NOT EXISTS admission_id INTEGER REFERENCES admissions(id) ON DELETE SET NULL;

    ALTER TABLE patient_measurements
    ADD COLUMN IF NOT EXISTS bmi_formula TEXT NOT NULL DEFAULT 'quetelet';

    ALTER TABLE patient_measurements
    ADD COLUMN IF NOT EXISTS bsa_formula TEXT NOT NULL DEFAULT 'mosteller';
  `);

  await pool.query(`
    ALTER TABLE medication_catalog
    ADD COLUMN IF NOT EXISTS therapeutic_class TEXT;

    ALTER TABLE medical_prescriptions
    ADD COLUMN IF NOT EXISTS administration_route TEXT;

    ALTER TABLE medical_prescriptions
    ADD COLUMN IF NOT EXISTS validation_start_at TIMESTAMPTZ;

    ALTER TABLE medical_prescriptions
    ADD COLUMN IF NOT EXISTS validation_end_at TIMESTAMPTZ;

    ALTER TABLE medical_prescriptions
    ADD COLUMN IF NOT EXISTS validation_status TEXT;
  `);

  await pool.query(`
    CREATE INDEX IF NOT EXISTS idx_measurements_admission_id ON patient_measurements (admission_id);
  `);

  const patientColumns = await getPatientsColumns(pool);
  await makeLegacyPatientColumnsNullable(pool, patientColumns);
  await migrateLegacyAdmissions(pool, patientColumns);
  await seedDefaultProfessional(pool);
}

export function isDatabaseConfigured(): boolean {
  return Boolean(process.env.DATABASE_URL);
}

export async function ensureDatabaseReady(): Promise<void> {
  if (!isDatabaseConfigured()) {
    throw new Error("DATABASE_URL não configurada.");
  }

  if (!globalDbState.coreclinSetupPromise) {
    globalDbState.coreclinSetupPromise = setupDatabase().catch((error) => {
      globalDbState.coreclinSetupPromise = undefined;
      throw error;
    });
  }

  await globalDbState.coreclinSetupPromise;
}

export async function findProfessionalByLogin(login: string): Promise<ProfessionalRecord | null> {
  await ensureDatabaseReady();
  const pool = getPool();
  const normalizedLogin = login.trim().toLowerCase();

  const result = await pool.query(
    `
      SELECT id, full_name, profession, council_type, council_number, state_uf, login, institution, created_at
      FROM professionals
      WHERE login = $1
      LIMIT 1
    `,
    [normalizedLogin]
  );

  if (result.rows.length === 0) {
    return null;
  }

  return mapProfessional(result.rows[0] as DbRow);
}

export async function authenticateProfessional(
  login: string,
  password: string
): Promise<ProfessionalRecord | null> {
  await ensureDatabaseReady();
  const pool = getPool();
  const normalizedLogin = login.trim().toLowerCase();

  const result = await pool.query(
    `
      SELECT
        id,
        full_name,
        profession,
        council_type,
        council_number,
        state_uf,
        login,
        institution,
        created_at,
        password_hash
      FROM professionals
      WHERE login = $1
      LIMIT 1
    `,
    [normalizedLogin]
  );

  if (result.rows.length === 0) {
    return null;
  }

  const row = result.rows[0] as DbRow;
  const passwordHash = String(row.password_hash ?? "");
  const isPasswordValid = verifyPassword(password, passwordHash);
  if (!isPasswordValid) {
    return null;
  }

  return mapProfessional(row);
}

export async function listProfessionals(): Promise<ProfessionalRecord[]> {
  await ensureDatabaseReady();
  const pool = getPool();
  const result = await pool.query(`
    SELECT id, full_name, profession, council_type, council_number, state_uf, login, institution, created_at
    FROM professionals
    ORDER BY full_name ASC
  `);

  return result.rows.map((row) => mapProfessional(row as DbRow));
}

export async function createProfessional(input: CreateProfessionalInput): Promise<ProfessionalRecord> {
  await ensureDatabaseReady();
  const pool = getPool();
  const normalizedLogin = input.login.trim().toLowerCase();
  const passwordHash = hashPassword(input.password);

  try {
    const result = await pool.query(
      `
        INSERT INTO professionals (
          full_name,
          profession,
          council_type,
          council_number,
          state_uf,
          login,
          password_hash,
          institution
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        RETURNING id, full_name, profession, council_type, council_number, state_uf, login, institution, created_at
      `,
      [
        input.fullName.trim(),
        input.profession,
        input.councilType,
        input.councilNumber.trim(),
        input.stateUf.trim().toUpperCase(),
        normalizedLogin,
        passwordHash,
        input.institution.trim()
      ]
    );

    return mapProfessional(result.rows[0] as DbRow);
  } catch (error) {
    const postgresError = error as { code?: string };
    if (postgresError.code === "23505") {
      throw new Error("Já existe um profissional com este login.");
    }
    throw error;
  }
}

export async function listTeams(): Promise<TeamRecord[]> {
  await ensureDatabaseReady();
  const pool = getPool();
  const result = await pool.query(`
    SELECT id, name, created_at
    FROM teams
    ORDER BY name ASC
  `);

  return result.rows.map((row) => mapTeam(row as DbRow));
}

export async function createTeam(name: string): Promise<TeamRecord> {
  await ensureDatabaseReady();
  const pool = getPool();

  try {
    const result = await pool.query(
      `
        INSERT INTO teams (name)
        VALUES ($1)
        RETURNING id, name, created_at
      `,
      [name.trim()]
    );

    return mapTeam(result.rows[0] as DbRow);
  } catch (error) {
    const postgresError = error as { code?: string };
    if (postgresError.code === "23505") {
      throw new Error("Já existe uma equipe com este nome.");
    }
    throw error;
  }
}

export async function listMedicationCatalog(): Promise<MedicationRecord[]> {
  await ensureDatabaseReady();
  const pool = getPool();
  const result = await pool.query(`
    SELECT id, name, default_unit, therapeutic_class, created_at
    FROM medication_catalog
    ORDER BY name ASC
  `);

  return result.rows.map((row) => mapMedication(row as DbRow));
}

export async function createMedication(input: CreateMedicationInput): Promise<MedicationRecord> {
  await ensureDatabaseReady();
  const pool = getPool();
  const normalizedMedicationName = normalizeMedicationCatalogName(input.name);
  const normalizedDefaultUnit = input.defaultUnit.trim();
  const normalizedTherapeuticClass = input.therapeuticClass.trim() || null;

  try {
    const duplicateCheck = await pool.query(
      `
        SELECT id
        FROM medication_catalog
        WHERE LOWER(REGEXP_REPLACE(name, '[[:space:]]+', ' ', 'g')) = LOWER($1)
        LIMIT 1
      `,
      [normalizedMedicationName]
    );

    if (duplicateCheck.rows.length > 0) {
      throw new Error("Medicamento já cadastrado.");
    }

    const result = await pool.query(
      `
        INSERT INTO medication_catalog (name, default_unit, therapeutic_class)
        VALUES ($1, $2, $3)
        RETURNING id, name, default_unit, therapeutic_class, created_at
      `,
      [normalizedMedicationName, normalizedDefaultUnit, normalizedTherapeuticClass]
    );
    return mapMedication(result.rows[0] as DbRow);
  } catch (error) {
    const postgresError = error as { code?: string };
    if (postgresError.code === "23505") {
      throw new Error("Medicamento já cadastrado.");
    }
    throw error;
  }
}

async function ensurePatientExists(client: PoolClient, patientId: number): Promise<void> {
  const result = await client.query(`SELECT id FROM patients WHERE id = $1 LIMIT 1`, [patientId]);
  if (result.rows.length === 0) {
    throw new Error("Paciente não encontrado.");
  }
}

async function resolveMedicationData(
  client: PoolClient,
  medicationId: number | undefined,
  fallbackMedicationName: string
): Promise<{ medicationId: number | null; medicationName: string }> {
  if (medicationId && Number.isInteger(medicationId) && medicationId > 0) {
    const result = await client.query(
      `
        SELECT id, name
        FROM medication_catalog
        WHERE id = $1
        LIMIT 1
      `,
      [medicationId]
    );
    if (result.rows.length === 0) {
      throw new Error("Medicamento selecionado não encontrado.");
    }
    return {
      medicationId: toNumber((result.rows[0] as DbRow).id),
      medicationName: String((result.rows[0] as DbRow).name ?? "")
    };
  }

  const normalizedName = fallbackMedicationName.trim();
  if (!normalizedName) {
    throw new Error("Informe o nome do medicamento.");
  }

  return {
    medicationId: null,
    medicationName: normalizedName
  };
}

async function resolveMedicationNameFromCatalog(
  client: PoolClient,
  medicationName: string
): Promise<string> {
  const normalizedMedicationName = normalizeMedicationCatalogName(medicationName);
  if (!normalizedMedicationName) {
    throw new Error("Selecione um medicamento para registrar alergia.");
  }

  const result = await client.query(
    `
      SELECT name
      FROM medication_catalog
      WHERE LOWER(REGEXP_REPLACE(name, '[[:space:]]+', ' ', 'g')) = LOWER($1)
      LIMIT 1
    `,
    [normalizedMedicationName]
  );

  if (result.rows.length === 0) {
    throw new Error("Alergia deve ser vinculada a um medicamento cadastrado.");
  }

  return String((result.rows[0] as DbRow).name ?? "");
}

async function findProfessionalIdByLogin(client: PoolClient, login: string): Promise<number> {
  const normalizedLogin = login.trim().toLowerCase();
  const result = await client.query(
    `
      SELECT id
      FROM professionals
      WHERE login = $1
      LIMIT 1
    `,
    [normalizedLogin]
  );

  if (result.rows.length === 0) {
    throw new Error("Profissional responsável não encontrado para o login atual.");
  }

  return toNumber((result.rows[0] as DbRow).id);
}

export async function createPatient(input: CreatePatientInput): Promise<PatientRecord> {
  await ensureDatabaseReady();
  const pool = getPool();
  const client = await pool.connect();

  try {
    await client.query("BEGIN");
    const responsibleProfessionalId = await findProfessionalIdByLogin(client, input.responsibleLogin);

    const inserted = await client.query(
      `
        INSERT INTO patients (
          full_name,
          chart_number,
          responsible_professional_id,
          birth_date
        )
        VALUES ($1, $2, $3, $4)
        RETURNING id
      `,
      [input.fullName.trim(), input.chartNumber.trim(), responsibleProfessionalId, input.birthDate]
    );

    const patientId = toNumber((inserted.rows[0] as DbRow).id);

    const normalizedAllergies = input.allergies
      .map((allergy) => allergy.trim())
      .filter((allergy) => allergy.length > 0);

    if (normalizedAllergies.length > 0) {
      const uniqueAllergies = Array.from(
        new Map(normalizedAllergies.map((allergy) => [allergy.toLocaleLowerCase(), allergy])).values()
      );

      for (const allergy of uniqueAllergies) {
        const catalogMedicationName = await resolveMedicationNameFromCatalog(client, allergy);
        await client.query(
          `
            INSERT INTO patient_allergies (patient_id, allergy_name)
            VALUES ($1, $2)
            ON CONFLICT (patient_id, allergy_name) DO NOTHING
          `,
          [patientId, catalogMedicationName]
        );
      }
    }

    await client.query("COMMIT");
    const patientList = await listPatients();
    const createdPatient = patientList.find((patient) => patient.id === patientId);
    if (!createdPatient) {
      throw new Error("Paciente criado, mas não foi possível carregar os dados.");
    }
    return createdPatient;
  } catch (error) {
    await client.query("ROLLBACK");
    const postgresError = error as { code?: string };
    if (postgresError.code === "23505") {
      throw new Error("Já existe paciente com este número de prontuário.");
    }
    throw error;
  } finally {
    client.release();
  }
}

export async function createAdmission(input: CreateAdmissionInput): Promise<AdmissionRecord> {
  await ensureDatabaseReady();
  const pool = getPool();
  const client = await pool.connect();

  try {
    await client.query("BEGIN");
    const responsibleProfessionalId = await findProfessionalIdByLogin(client, input.responsibleLogin);
    const indexes = calculateClinicalIndexes(
      input.weightKg,
      input.heightCm,
      input.bmiFormula,
      input.bsaFormula
    );

    const inserted = await client.query(
      `
        INSERT INTO admissions (
          patient_id,
          admission_date,
          bed,
          admission_reason,
          team_id,
          responsible_professional_id
        )
        VALUES ($1, $2, $3, $4, $5, $6)
        RETURNING id
      `,
      [
        input.patientId,
        input.admissionDate,
        input.bed.trim(),
        input.admissionReason.trim(),
        input.teamId,
        responsibleProfessionalId
      ]
    );

    const admissionId = toNumber((inserted.rows[0] as DbRow).id);

    await client.query(
      `
        INSERT INTO patient_measurements (
          patient_id,
          admission_id,
          weight_kg,
          height_cm,
          bmi,
          bmi_formula,
          body_surface_area,
          bsa_formula
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      `,
      [
        input.patientId,
        admissionId,
        input.weightKg,
        input.heightCm,
        indexes.bmi,
        input.bmiFormula,
        indexes.bodySurfaceArea,
        input.bsaFormula
      ]
    );

    await client.query("COMMIT");
    const admissions = await listRecentAdmissions(200);
    const createdAdmission = admissions.find((admission) => admission.id === admissionId);
    if (!createdAdmission) {
      throw new Error("Internação criada, mas não foi possível carregar os dados.");
    }
    return createdAdmission;
  } catch (error) {
    await client.query("ROLLBACK");
    const postgresError = error as { code?: string };
    if (postgresError.code === "23503") {
      throw new Error("Paciente ou equipe inválidos para a internação.");
    }
    throw error;
  } finally {
    client.release();
  }
}

export async function addPatientAllergy(input: AddPatientAllergyInput): Promise<PatientAllergyRecord> {
  await ensureDatabaseReady();
  const pool = getPool();
  const client = await pool.connect();

  try {
    await client.query("BEGIN");
    await ensurePatientExists(client, input.patientId);

    const normalizedAllergy = await resolveMedicationNameFromCatalog(client, input.allergyName);
    const inserted = await client.query(
      `
        INSERT INTO patient_allergies (patient_id, allergy_name)
        VALUES ($1, $2)
        RETURNING id
      `,
      [input.patientId, normalizedAllergy]
    );

    const allergyId = toNumber((inserted.rows[0] as DbRow).id);
    const result = await client.query(
      `
        SELECT
          pa.id,
          pa.patient_id,
          p.full_name AS patient_name,
          pa.allergy_name,
          pa.created_at
        FROM patient_allergies pa
        INNER JOIN patients p ON p.id = pa.patient_id
        WHERE pa.id = $1
        LIMIT 1
      `,
      [allergyId]
    );

    await client.query("COMMIT");
    return mapPatientAllergy(result.rows[0] as DbRow);
  } catch (error) {
    await client.query("ROLLBACK");
    const postgresError = error as { code?: string };
    if (postgresError.code === "23505") {
      throw new Error("Alergia já cadastrada para este paciente.");
    }
    throw error;
  } finally {
    client.release();
  }
}

export async function addPriorMedication(
  input: AddPriorMedicationInput
): Promise<PriorMedicationRecord> {
  await ensureDatabaseReady();
  const pool = getPool();
  const client = await pool.connect();

  try {
    await client.query("BEGIN");
    await ensurePatientExists(client, input.patientId);
    const medicationData = await resolveMedicationData(client, input.medicationId, input.medicationName);

    const inserted = await client.query(
      `
        INSERT INTO patient_prior_medications (
          patient_id,
          medication_id,
          medication_name,
          dose,
          dose_unit,
          frequency,
          shifts
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7)
        RETURNING id
      `,
      [
        input.patientId,
        medicationData.medicationId,
        medicationData.medicationName,
        input.dose,
        input.doseUnit.trim(),
        input.frequency.trim(),
        input.shifts.trim()
      ]
    );

    const priorMedicationId = toNumber((inserted.rows[0] as DbRow).id);
    const result = await client.query(
      `
        SELECT
          pm.id,
          pm.patient_id,
          p.full_name AS patient_name,
          pm.medication_id,
          pm.medication_name,
          pm.dose::float8 AS dose,
          pm.dose_unit,
          pm.frequency,
          pm.shifts,
          pm.created_at
        FROM patient_prior_medications pm
        INNER JOIN patients p ON p.id = pm.patient_id
        WHERE pm.id = $1
        LIMIT 1
      `,
      [priorMedicationId]
    );

    await client.query("COMMIT");
    return mapPriorMedication(result.rows[0] as DbRow);
  } catch (error) {
    await client.query("ROLLBACK");
    const postgresError = error as { code?: string };
    if (postgresError.code === "23503") {
      throw new Error("Paciente ou medicamento inválido.");
    }
    throw error;
  } finally {
    client.release();
  }
}

export async function addMedicalPrescription(
  input: AddMedicalPrescriptionInput
): Promise<MedicalPrescriptionRecord> {
  await ensureDatabaseReady();
  const pool = getPool();
  const client = await pool.connect();

  try {
    await client.query("BEGIN");
    await ensurePatientExists(client, input.patientId);

    const medicationData = await resolveMedicationData(client, input.medicationId, input.medicationName);
    let safeAdmissionId: number | null = null;
    if (input.admissionId && Number.isInteger(input.admissionId) && input.admissionId > 0) {
      const admissionResult = await client.query(
        `
          SELECT id
          FROM admissions
          WHERE id = $1 AND patient_id = $2
          LIMIT 1
        `,
        [input.admissionId, input.patientId]
      );
      if (admissionResult.rows.length === 0) {
        throw new Error("Internação selecionada não pertence ao paciente.");
      }
      safeAdmissionId = input.admissionId;
    }

    const inserted = await client.query(
      `
        INSERT INTO medical_prescriptions (
          patient_id,
          admission_id,
          medication_id,
          medication_name,
          dose,
          dose_unit,
          administration_route,
          frequency,
          shifts,
          notes,
          validation_start_at,
          validation_end_at,
          validation_status
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
        RETURNING id
      `,
      [
        input.patientId,
        safeAdmissionId,
        medicationData.medicationId,
        medicationData.medicationName,
        input.dose,
        input.doseUnit.trim(),
        input.administrationRoute?.trim() ? input.administrationRoute.trim() : null,
        input.frequency.trim(),
        input.shifts?.trim() ? input.shifts.trim() : "-",
        input.notes?.trim() ? input.notes.trim() : null,
        input.validationStartAt ?? null,
        input.validationEndAt ?? null,
        input.validationStatus?.trim() ? input.validationStatus.trim() : null
      ]
    );

    const prescriptionId = toNumber((inserted.rows[0] as DbRow).id);
    const result = await client.query(
      `
        SELECT
          mp.id,
          mp.patient_id,
          p.full_name AS patient_name,
          mp.admission_id,
          a.admission_date::text AS admission_date,
          a.bed,
          mp.medication_id,
          mp.medication_name,
          mp.dose::float8 AS dose,
          mp.dose_unit,
          mp.administration_route,
          mp.frequency,
          mp.shifts,
          mp.notes,
          mp.validation_start_at,
          mp.validation_end_at,
          mp.validation_status,
          mp.created_at
        FROM medical_prescriptions mp
        INNER JOIN patients p ON p.id = mp.patient_id
        LEFT JOIN admissions a ON a.id = mp.admission_id
        WHERE mp.id = $1
        LIMIT 1
      `,
      [prescriptionId]
    );

    await client.query("COMMIT");
    return mapMedicalPrescription(result.rows[0] as DbRow);
  } catch (error) {
    await client.query("ROLLBACK");
    const postgresError = error as { code?: string };
    if (postgresError.code === "23503") {
      throw new Error("Paciente, internação ou medicamento inválido.");
    }
    throw error;
  } finally {
    client.release();
  }
}

export async function addPatientMeasurement(
  patientId: number,
  weightKg: number,
  heightCm: number,
  bmiFormula: BmiFormulaId = "quetelet",
  bsaFormula: BsaFormulaId = "mosteller",
  admissionId?: number
): Promise<MeasurementHistoryRecord> {
  await ensureDatabaseReady();
  const pool = getPool();
  const indexes = calculateClinicalIndexes(weightKg, heightCm, bmiFormula, bsaFormula);

  const inserted = await pool.query(
    `
      INSERT INTO patient_measurements (
        patient_id,
        admission_id,
        weight_kg,
        height_cm,
        bmi,
        bmi_formula,
        body_surface_area,
        bsa_formula
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING id, patient_id, weight_kg::float8 AS weight_kg, height_cm::float8 AS height_cm, bmi::float8 AS bmi, bmi_formula, body_surface_area::float8 AS body_surface_area, bsa_formula, recorded_at
    `,
    [
      patientId,
      admissionId ?? null,
      weightKg,
      heightCm,
      indexes.bmi,
      bmiFormula,
      indexes.bodySurfaceArea,
      bsaFormula
    ]
  );

  const patientResult = await pool.query(
    `
      SELECT full_name
      FROM patients
      WHERE id = $1
      LIMIT 1
    `,
    [patientId]
  );

  if (patientResult.rows.length === 0) {
    throw new Error("Paciente não encontrado.");
  }

  return mapMeasurement({
    ...(inserted.rows[0] as DbRow),
    patient_name: String((patientResult.rows[0] as DbRow).full_name ?? "")
  });
}

export async function listPatients(): Promise<PatientRecord[]> {
  await ensureDatabaseReady();
  const pool = getPool();

  const result = await pool.query(`
    SELECT
      p.id,
      p.full_name,
      p.chart_number,
      p.birth_date::text AS birth_date,
      DATE_PART('year', AGE(CURRENT_DATE, p.birth_date))::int AS age_years,
      p.responsible_professional_id,
      rp.full_name AS responsible_professional_name,
      rp.login AS responsible_professional_login,
      la.id AS latest_admission_id,
      la.admission_date::text AS latest_admission_date,
      la.bed AS latest_admission_bed,
      la.admission_reason AS latest_admission_reason,
      la.team_id AS latest_admission_team_id,
      t.name AS latest_admission_team_name,
      la.responsible_professional_id AS latest_admission_responsible_professional_id,
      larp.full_name AS latest_admission_responsible_professional_name,
      la.created_at AS latest_admission_created_at,
      latest_m.weight_kg::float8 AS weight_kg,
      latest_m.height_cm::float8 AS height_cm,
      latest_m.bmi::float8 AS bmi,
      latest_m.bmi_formula,
      latest_m.body_surface_area::float8 AS body_surface_area,
      latest_m.bsa_formula,
      latest_m.recorded_at
    FROM patients p
    INNER JOIN professionals rp ON rp.id = p.responsible_professional_id
    LEFT JOIN LATERAL (
      SELECT
        a.id,
        a.admission_date,
        a.bed,
        a.admission_reason,
        a.team_id,
        a.responsible_professional_id,
        a.created_at
      FROM admissions a
      WHERE a.patient_id = p.id
      ORDER BY a.admission_date DESC, a.created_at DESC, a.id DESC
      LIMIT 1
    ) la ON TRUE
    LEFT JOIN teams t ON t.id = la.team_id
    LEFT JOIN professionals larp ON larp.id = la.responsible_professional_id
    LEFT JOIN LATERAL (
      SELECT
        m.weight_kg,
        m.height_cm,
        m.bmi,
        m.bmi_formula,
        m.body_surface_area,
        m.bsa_formula,
        m.recorded_at
      FROM patient_measurements m
      WHERE m.patient_id = p.id
      ORDER BY m.recorded_at DESC, m.id DESC
      LIMIT 1
    ) latest_m ON TRUE
    ORDER BY p.created_at DESC, p.id DESC
  `);

  return result.rows.map((row) => mapPatient(row as DbRow));
}

export async function listRecentAdmissions(limit = 40): Promise<AdmissionRecord[]> {
  await ensureDatabaseReady();
  const pool = getPool();
  const safeLimit = Number.isFinite(limit) ? Math.max(1, Math.min(300, Math.floor(limit))) : 40;

  const result = await pool.query(
    `
      SELECT
        a.id,
        a.patient_id,
        p.full_name AS patient_name,
        p.chart_number,
        a.admission_date::text AS admission_date,
        a.bed,
        a.admission_reason,
        a.team_id,
        t.name AS team_name,
        a.responsible_professional_id,
        rp.full_name AS responsible_professional_name,
        am.weight_kg::float8 AS weight_kg,
        am.height_cm::float8 AS height_cm,
        am.bmi::float8 AS bmi,
        am.bmi_formula,
        am.body_surface_area::float8 AS body_surface_area,
        am.bsa_formula,
        a.created_at
      FROM admissions a
      INNER JOIN patients p ON p.id = a.patient_id
      INNER JOIN professionals rp ON rp.id = a.responsible_professional_id
      LEFT JOIN teams t ON t.id = a.team_id
      LEFT JOIN LATERAL (
        SELECT
          m.weight_kg,
          m.height_cm,
          m.bmi,
          m.bmi_formula,
          m.body_surface_area,
          m.bsa_formula
        FROM patient_measurements m
        WHERE m.admission_id = a.id
        ORDER BY m.recorded_at DESC, m.id DESC
        LIMIT 1
      ) am ON TRUE
      ORDER BY a.admission_date DESC, a.created_at DESC, a.id DESC
      LIMIT $1
    `,
    [safeLimit]
  );

  return result.rows.map((row) => mapAdmission(row as DbRow));
}

export async function listRecentMeasurements(limit = 30): Promise<MeasurementHistoryRecord[]> {
  await ensureDatabaseReady();
  const pool = getPool();
  const safeLimit = Number.isFinite(limit) ? Math.max(1, Math.min(300, Math.floor(limit))) : 30;

  const result = await pool.query(
    `
      SELECT
        m.id,
        m.patient_id,
        p.full_name AS patient_name,
        m.weight_kg::float8 AS weight_kg,
        m.height_cm::float8 AS height_cm,
        m.bmi::float8 AS bmi,
        m.bmi_formula,
        m.body_surface_area::float8 AS body_surface_area,
        m.bsa_formula,
        m.recorded_at
      FROM patient_measurements m
      INNER JOIN patients p ON p.id = m.patient_id
      ORDER BY m.recorded_at DESC, m.id DESC
      LIMIT $1
    `,
    [safeLimit]
  );

  return result.rows.map((row) => mapMeasurement(row as DbRow));
}

export async function listPatientAllergies(): Promise<PatientAllergyRecord[]> {
  await ensureDatabaseReady();
  const pool = getPool();
  const result = await pool.query(`
    SELECT
      pa.id,
      pa.patient_id,
      p.full_name AS patient_name,
      pa.allergy_name,
      pa.created_at
    FROM patient_allergies pa
    INNER JOIN patients p ON p.id = pa.patient_id
    ORDER BY pa.created_at DESC, pa.id DESC
  `);

  return result.rows.map((row) => mapPatientAllergy(row as DbRow));
}

export async function listPriorMedications(): Promise<PriorMedicationRecord[]> {
  await ensureDatabaseReady();
  const pool = getPool();
  const result = await pool.query(`
    SELECT
      pm.id,
      pm.patient_id,
      p.full_name AS patient_name,
      pm.medication_id,
      pm.medication_name,
      pm.dose::float8 AS dose,
      pm.dose_unit,
      pm.frequency,
      pm.shifts,
      pm.created_at
    FROM patient_prior_medications pm
    INNER JOIN patients p ON p.id = pm.patient_id
    ORDER BY pm.created_at DESC, pm.id DESC
  `);

  return result.rows.map((row) => mapPriorMedication(row as DbRow));
}

export async function listMedicalPrescriptions(): Promise<MedicalPrescriptionRecord[]> {
  await ensureDatabaseReady();
  const pool = getPool();
  const result = await pool.query(`
    SELECT
      mp.id,
      mp.patient_id,
      p.full_name AS patient_name,
      mp.admission_id,
      a.admission_date::text AS admission_date,
      a.bed,
      mp.medication_id,
      mp.medication_name,
      mp.dose::float8 AS dose,
      mp.dose_unit,
      mp.administration_route,
      mp.frequency,
      mp.shifts,
      mp.notes,
      mp.validation_start_at,
      mp.validation_end_at,
      mp.validation_status,
      mp.created_at
    FROM medical_prescriptions mp
    INNER JOIN patients p ON p.id = mp.patient_id
    LEFT JOIN admissions a ON a.id = mp.admission_id
    ORDER BY mp.created_at DESC, mp.id DESC
  `);

  return result.rows.map((row) => mapMedicalPrescription(row as DbRow));
}

export async function getDashboardData(currentLogin: string): Promise<DashboardData> {
  await ensureDatabaseReady();

  const [
    currentProfessional,
    professionals,
    teams,
    patients,
    recentAdmissions,
    recentMeasurements,
    medications,
    patientAllergies,
    priorMedications,
    prescriptions
  ] = await Promise.all([
    findProfessionalByLogin(currentLogin),
    listProfessionals(),
    listTeams(),
    listPatients(),
    listRecentAdmissions(80),
    listRecentMeasurements(80),
    listMedicationCatalog(),
    listPatientAllergies(),
    listPriorMedications(),
    listMedicalPrescriptions()
  ]);

  return {
    currentProfessional,
    professionals,
    teams,
    patients,
    recentAdmissions,
    recentMeasurements,
    medications,
    patientAllergies,
    priorMedications,
    prescriptions
  };
}
