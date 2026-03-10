import { NextResponse } from "next/server";

import { getCurrentSession } from "@/lib/auth";
import { addPatientExamImport } from "@/lib/db";
import { extractExamImportFromPdf } from "@/lib/exam-pdf";
import { type PatientExamResultRecord } from "@/lib/coreclin-types";

export const runtime = "nodejs";

function getUnknownErrorMessage(error: unknown): string {
  if (error instanceof Error && error.message.trim()) {
    return error.message.trim();
  }

  if (typeof error === "string" && error.trim()) {
    return error.trim();
  }

  if (error && typeof error === "object" && "message" in error) {
    const message = (error as { message?: unknown }).message;
    if (typeof message === "string" && message.trim()) {
      return message.trim();
    }
  }

  return "";
}

function isUploadedPdfFile(value: FormDataEntryValue | null): value is File {
  if (!value || typeof value !== "object") {
    return false;
  }

  const candidate = value as Partial<File>;
  return typeof candidate.name === "string" && typeof candidate.arrayBuffer === "function";
}

function normalizeExamRecords(value: unknown): PatientExamResultRecord[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .filter((item): item is Record<string, unknown> => item !== null && typeof item === "object")
    .map((item, index) => ({
      key:
        typeof item.key === "string" && item.key.trim().length > 0
          ? item.key.trim()
          : `exam-${index + 1}`,
      examName: typeof item.examName === "string" ? item.examName.trim() : "",
      result: typeof item.result === "string" ? item.result.trim() : "",
      unit: typeof item.unit === "string" ? item.unit.trim() : "",
      referenceRange:
        typeof item.referenceRange === "string" ? item.referenceRange.trim() : "",
      examDate:
        typeof item.examDate === "string" && item.examDate.trim().length > 0
          ? item.examDate.trim()
          : null,
      pageNumber:
        typeof item.pageNumber === "number"
          ? item.pageNumber
          : typeof item.pageNumber === "string"
            ? Number(item.pageNumber)
            : 0
    }))
    .filter(
      (item) =>
        item.examName.length > 0 &&
        item.result.length > 0 &&
        Number.isInteger(item.pageNumber) &&
        item.pageNumber > 0
    );
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  const session = await getCurrentSession();
  if (!session) {
    return NextResponse.json({ message: "Sessão inválida." }, { status: 401 });
  }

  const routeParams = await params;
  const patientId = Number(routeParams.id);
  if (!Number.isInteger(patientId) || patientId <= 0) {
    return NextResponse.json({ message: "Paciente inválido." }, { status: 400 });
  }

  let fileName = "";
  let pageCount = 0;
  let rawText = "";
  let records: PatientExamResultRecord[] = [];

  const contentType = request.headers.get("content-type") ?? "";
  if (contentType.includes("multipart/form-data")) {
    let formData: FormData;
    try {
      formData = await request.formData();
    } catch {
      return NextResponse.json({ message: "Arquivo inválido." }, { status: 400 });
    }

    const fileEntry = formData.get("file");
    if (!isUploadedPdfFile(fileEntry)) {
      return NextResponse.json({ message: "Selecione um PDF válido." }, { status: 400 });
    }

    if (!fileEntry.name.toLowerCase().endsWith(".pdf")) {
      return NextResponse.json({ message: "Selecione um arquivo PDF válido." }, { status: 400 });
    }

    try {
      const extracted = await extractExamImportFromPdf(
        fileEntry.name,
        new Uint8Array(await fileEntry.arrayBuffer())
      );
      fileName = extracted.fileName;
      pageCount = extracted.pageCount;
      rawText = extracted.rawText.trim();
      records = extracted.records;
    } catch (error) {
      const details = getUnknownErrorMessage(error);
      const message = details
        ? `Não foi possível extrair os dados do PDF informado. ${details}`
        : "Não foi possível extrair os dados do PDF informado.";
      return NextResponse.json({ message }, { status: 400 });
    }
  } else {
    let payload: unknown;
    try {
      payload = await request.json();
    } catch {
      return NextResponse.json({ message: "Corpo inválido." }, { status: 400 });
    }

    const body = payload as Record<string, unknown>;
    fileName = typeof body.fileName === "string" ? body.fileName.trim() : "";
    const pageCountRaw = body.pageCount;
    pageCount = typeof pageCountRaw === "number" ? pageCountRaw : Number(pageCountRaw);
    rawText = typeof body.rawText === "string" ? body.rawText.trim() : "";
    records = normalizeExamRecords(body.records);
  }

  if (!fileName) {
    return NextResponse.json({ message: "Nome do arquivo inválido." }, { status: 400 });
  }

  if (!Number.isInteger(pageCount) || pageCount <= 0) {
    return NextResponse.json({ message: "Quantidade de páginas inválida." }, { status: 400 });
  }

  if (!rawText) {
    return NextResponse.json({ message: "Nenhum texto foi extraído do PDF." }, { status: 400 });
  }

  try {
    const examImport = await addPatientExamImport({
      patientId,
      fileName,
      pageCount,
      rawText,
      records,
      importedByLogin: session.username
    });

    return NextResponse.json({ ok: true, examImport });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Falha ao salvar importação de exames.";
    return NextResponse.json({ message }, { status: 400 });
  }
}
