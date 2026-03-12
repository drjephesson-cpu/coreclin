import { NextResponse } from "next/server";

import { getCurrentSession } from "@/lib/auth";
import { saveInpatientWorkflowSnapshot } from "@/lib/db";
import {
  type InpatientEntry,
  type InpatientWorkflowState,
  type InpatientWorkflowStoragePayload
} from "@/lib/coreclin-types";

export const runtime = "nodejs";

function normalizeWorkflowByKey(value: unknown): Record<string, InpatientWorkflowState> {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return {};
  }

  return Object.fromEntries(
    Object.entries(value).flatMap(([entryKey, entryValue]) => {
      if (!entryValue || typeof entryValue !== "object" || Array.isArray(entryValue)) {
        return [];
      }

      const workflow = entryValue as Record<string, unknown>;
      const status =
        workflow.status === "Visitado" ||
        workflow.status === "Ausente" ||
        workflow.status === "Concluído" ||
        workflow.status === "Alta"
          ? workflow.status
          : "Pendente";

      return [
        [
          entryKey,
          {
            status,
            assignedTeamId:
              typeof workflow.assignedTeamId === "number" && Number.isInteger(workflow.assignedTeamId)
                ? workflow.assignedTeamId
                : null,
            mandatory: Boolean(workflow.mandatory),
            firstVisitCompletedAt:
              typeof workflow.firstVisitCompletedAt === "string" ? workflow.firstVisitCompletedAt : null,
            evolutionGeneratedAt:
              typeof workflow.evolutionGeneratedAt === "string" ? workflow.evolutionGeneratedAt : null,
            updatedByProfessionalName:
              typeof workflow.updatedByProfessionalName === "string"
                ? workflow.updatedByProfessionalName
                : null,
            updatedByProfessionalLogin:
              typeof workflow.updatedByProfessionalLogin === "string"
                ? workflow.updatedByProfessionalLogin
                : null,
            updatedAt: typeof workflow.updatedAt === "string" ? workflow.updatedAt : new Date().toISOString()
          } satisfies InpatientWorkflowState
        ]
      ];
    })
  );
}

function normalizeTrackedEntries(value: unknown): InpatientEntry[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .filter((item): item is Record<string, unknown> => item !== null && typeof item === "object")
    .map(
      (item) =>
        ({
          key: typeof item.key === "string" ? item.key : "",
          patientId:
            typeof item.patientId === "number" && Number.isInteger(item.patientId)
              ? item.patientId
              : null,
          patientName: typeof item.patientName === "string" ? item.patientName : "",
          chartNumber: typeof item.chartNumber === "string" ? item.chartNumber : "",
          reportedAgeYears:
            typeof item.reportedAgeYears === "number" && Number.isInteger(item.reportedAgeYears)
              ? item.reportedAgeYears
              : null,
          admissionDate: typeof item.admissionDate === "string" ? item.admissionDate : "",
          bed: typeof item.bed === "string" ? item.bed : "",
          teamName: typeof item.teamName === "string" ? item.teamName : null,
          teamId: typeof item.teamId === "number" && Number.isInteger(item.teamId) ? item.teamId : null,
          source: item.source === "manual" ? "manual" : "active",
          createdAt: typeof item.createdAt === "string" ? item.createdAt : new Date().toISOString()
        }) satisfies InpatientEntry
    )
    .filter((item) => item.key.length > 0 && item.patientName.length > 0);
}

function normalizePriorityTeamIds(value: unknown): number[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.filter((item): item is number => typeof item === "number" && Number.isInteger(item));
}

export async function PUT(request: Request): Promise<NextResponse> {
  const session = await getCurrentSession();
  if (!session) {
    return NextResponse.json({ message: "Sessão inválida." }, { status: 401 });
  }

  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ message: "Corpo inválido." }, { status: 400 });
  }

  const body = payload as Partial<InpatientWorkflowStoragePayload>;

  try {
    const inpatientWorkflowSnapshot = await saveInpatientWorkflowSnapshot({
      login: session.username,
      workflowByKey: normalizeWorkflowByKey(body.workflowByKey),
      trackedEntries: normalizeTrackedEntries(body.trackedEntries),
      priorityTeamIds: normalizePriorityTeamIds(body.priorityTeamIds)
    });

    return NextResponse.json({ ok: true, inpatientWorkflowSnapshot });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Falha ao salvar a lista diária do profissional.";
    return NextResponse.json({ message }, { status: 400 });
  }
}
