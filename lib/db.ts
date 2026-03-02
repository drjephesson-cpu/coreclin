import { Pool, PoolClient } from "pg";

import { calculateClinicalIndexes } from "@/lib/clinical";
import {
  COUNCIL_OPTIONS,
  PROFESSION_OPTIONS,
  type CouncilOption,
  type DashboardData,
  type MeasurementHistoryRecord,
  type PatientRecord,
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
  admissionDate: string;
  bed: string;
  admissionReason: string;
  teamId: number;
  weightKg: number;
  heightCm: number;
  responsibleLogin: string;
};

type GlobalDbState = typeof globalThis & {
  coreclinPool?: Pool;
  coreclinSetupPromise?: Promise<void>;
};

const globalDbState = globalThis as GlobalDbState;

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

function mapProfessional(row: Record<string, unknown>): ProfessionalRecord {
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

function mapTeam(row: Record<string, unknown>): TeamRecord {
  return {
    id: toNumber(row.id),
    name: String(row.name ?? ""),
    createdAt: toIso(row.created_at)
  };
}

function mapMeasurement(row: Record<string, unknown>): MeasurementHistoryRecord {
  return {
    id: toNumber(row.id),
    patientId: toNumber(row.patient_id),
    patientName: String(row.patient_name ?? ""),
    weightKg: toNumber(row.weight_kg),
    heightCm: toNumber(row.height_cm),
    bmi: toNumber(row.bmi),
    bodySurfaceArea: toNumber(row.body_surface_area),
    recordedAt: toIso(row.recorded_at)
  };
}

function mapPatient(row: Record<string, unknown>): PatientRecord {
  const hasMeasurement = row.weight_kg !== null && row.height_cm !== null;

  return {
    id: toNumber(row.id),
    fullName: String(row.full_name ?? ""),
    chartNumber: String(row.chart_number ?? ""),
    birthDate: String(row.birth_date ?? ""),
    ageYears: toNumber(row.age_years),
    admissionDate: String(row.admission_date ?? ""),
    bed: String(row.bed ?? ""),
    admissionReason: String(row.admission_reason ?? ""),
    teamId: row.team_id === null ? null : toNumber(row.team_id),
    teamName: row.team_name === null ? null : String(row.team_name),
    responsibleProfessionalId: toNumber(row.responsible_professional_id),
    responsibleProfessionalName: String(row.responsible_professional_name ?? ""),
    responsibleProfessionalLogin: String(row.responsible_professional_login ?? ""),
    latestMeasurement: hasMeasurement
      ? {
          weightKg: toNumber(row.weight_kg),
          heightCm: toNumber(row.height_cm),
          bmi: toNumber(row.bmi),
          bodySurfaceArea: toNumber(row.body_surface_area),
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
      admission_date DATE NOT NULL,
      bed TEXT NOT NULL,
      admission_reason TEXT NOT NULL,
      team_id INTEGER REFERENCES teams(id),
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS patient_measurements (
      id SERIAL PRIMARY KEY,
      patient_id INTEGER NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
      weight_kg NUMERIC(6, 2) NOT NULL,
      height_cm NUMERIC(6, 2) NOT NULL,
      bmi NUMERIC(6, 2) NOT NULL,
      body_surface_area NUMERIC(6, 2) NOT NULL,
      recorded_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE INDEX IF NOT EXISTS idx_patients_team_id ON patients (team_id);
    CREATE INDEX IF NOT EXISTS idx_measurements_patient_id ON patient_measurements (patient_id);
    CREATE INDEX IF NOT EXISTS idx_measurements_recorded_at ON patient_measurements (recorded_at DESC);
  `);

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

  return mapProfessional(result.rows[0] as Record<string, unknown>);
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

  const row = result.rows[0] as Record<string, unknown>;
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

  return result.rows.map((row) => mapProfessional(row as Record<string, unknown>));
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

    return mapProfessional(result.rows[0] as Record<string, unknown>);
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

  return result.rows.map((row) => mapTeam(row as Record<string, unknown>));
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

    return mapTeam(result.rows[0] as Record<string, unknown>);
  } catch (error) {
    const postgresError = error as { code?: string };
    if (postgresError.code === "23505") {
      throw new Error("Já existe uma equipe com este nome.");
    }
    throw error;
  }
}

async function findResponsibleProfessionalId(
  client: PoolClient,
  login: string
): Promise<number> {
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

  return toNumber((result.rows[0] as Record<string, unknown>).id);
}

export async function createPatientWithInitialMeasurement(
  input: CreatePatientInput
): Promise<PatientRecord> {
  await ensureDatabaseReady();
  const pool = getPool();
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    const responsibleProfessionalId = await findResponsibleProfessionalId(client, input.responsibleLogin);
    const indexes = calculateClinicalIndexes(input.weightKg, input.heightCm);

    const insertedPatient = await client.query(
      `
        INSERT INTO patients (
          full_name,
          chart_number,
          responsible_professional_id,
          birth_date,
          admission_date,
          bed,
          admission_reason,
          team_id
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        RETURNING id
      `,
      [
        input.fullName.trim(),
        input.chartNumber.trim(),
        responsibleProfessionalId,
        input.birthDate,
        input.admissionDate,
        input.bed.trim(),
        input.admissionReason.trim(),
        input.teamId
      ]
    );

    const patientId = toNumber((insertedPatient.rows[0] as Record<string, unknown>).id);

    await client.query(
      `
        INSERT INTO patient_measurements (
          patient_id,
          weight_kg,
          height_cm,
          bmi,
          body_surface_area
        )
        VALUES ($1, $2, $3, $4, $5)
      `,
      [patientId, input.weightKg, input.heightCm, indexes.bmi, indexes.bodySurfaceArea]
    );

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

export async function addPatientMeasurement(
  patientId: number,
  weightKg: number,
  heightCm: number
): Promise<MeasurementHistoryRecord> {
  await ensureDatabaseReady();
  const pool = getPool();
  const indexes = calculateClinicalIndexes(weightKg, heightCm);

  const result = await pool.query(
    `
      INSERT INTO patient_measurements (
        patient_id,
        weight_kg,
        height_cm,
        bmi,
        body_surface_area
      )
      VALUES ($1, $2, $3, $4, $5)
      RETURNING id, patient_id, weight_kg::float8 AS weight_kg, height_cm::float8 AS height_cm, bmi::float8 AS bmi, body_surface_area::float8 AS body_surface_area, recorded_at
    `,
    [patientId, weightKg, heightCm, indexes.bmi, indexes.bodySurfaceArea]
  );

  const measurement = result.rows[0] as Record<string, unknown>;
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

  return {
    ...mapMeasurement({
      ...measurement,
      patient_name: String((patientResult.rows[0] as Record<string, unknown>).full_name ?? "")
    }),
    patientId
  };
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
      p.admission_date::text AS admission_date,
      p.bed,
      p.admission_reason,
      p.team_id,
      t.name AS team_name,
      p.responsible_professional_id,
      rp.full_name AS responsible_professional_name,
      rp.login AS responsible_professional_login,
      latest.weight_kg::float8 AS weight_kg,
      latest.height_cm::float8 AS height_cm,
      latest.bmi::float8 AS bmi,
      latest.body_surface_area::float8 AS body_surface_area,
      latest.recorded_at
    FROM patients p
    INNER JOIN professionals rp ON rp.id = p.responsible_professional_id
    LEFT JOIN teams t ON t.id = p.team_id
    LEFT JOIN LATERAL (
      SELECT
        m.weight_kg,
        m.height_cm,
        m.bmi,
        m.body_surface_area,
        m.recorded_at
      FROM patient_measurements m
      WHERE m.patient_id = p.id
      ORDER BY m.recorded_at DESC, m.id DESC
      LIMIT 1
    ) latest ON TRUE
    ORDER BY p.created_at DESC, p.id DESC
  `);

  return result.rows.map((row) => mapPatient(row as Record<string, unknown>));
}

export async function listRecentMeasurements(limit = 30): Promise<MeasurementHistoryRecord[]> {
  await ensureDatabaseReady();
  const pool = getPool();

  const safeLimit = Number.isFinite(limit) ? Math.max(1, Math.min(100, Math.floor(limit))) : 30;
  const result = await pool.query(
    `
      SELECT
        m.id,
        m.patient_id,
        p.full_name AS patient_name,
        m.weight_kg::float8 AS weight_kg,
        m.height_cm::float8 AS height_cm,
        m.bmi::float8 AS bmi,
        m.body_surface_area::float8 AS body_surface_area,
        m.recorded_at
      FROM patient_measurements m
      INNER JOIN patients p ON p.id = m.patient_id
      ORDER BY m.recorded_at DESC, m.id DESC
      LIMIT $1
    `,
    [safeLimit]
  );

  return result.rows.map((row) => mapMeasurement(row as Record<string, unknown>));
}

export async function getDashboardData(currentLogin: string): Promise<DashboardData> {
  await ensureDatabaseReady();

  const [currentProfessional, professionals, teams, patients, recentMeasurements] = await Promise.all([
    findProfessionalByLogin(currentLogin),
    listProfessionals(),
    listTeams(),
    listPatients(),
    listRecentMeasurements(40)
  ]);

  return {
    currentProfessional,
    professionals,
    teams,
    patients,
    recentMeasurements
  };
}
