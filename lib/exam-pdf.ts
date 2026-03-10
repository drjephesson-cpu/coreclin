import { type PatientExamResultRecord } from "./coreclin-types";

export type ExtractedExamImportPayload = {
  fileName: string;
  pageCount: number;
  rawText: string;
  records: PatientExamResultRecord[];
};

type PdfJsDocument = {
  numPages: number;
  getPage: (pageNumber: number) => Promise<{
    getTextContent: () => Promise<{
      items: unknown[];
    }>;
  }>;
};

type PdfJsModule = {
  getDocument: (source: unknown) => {
    promise: Promise<PdfJsDocument>;
  };
};

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

  return "Falha desconhecida ao processar o PDF.";
}

function normalizeExamSearchValue(input: string): string {
  return input
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLocaleLowerCase();
}

function isLikelyExamResultValue(input: string): boolean {
  const trimmed = input.trim();
  if (!trimmed) {
    return false;
  }

  if (/^[<>]?\d+(?:[.,]\d+)?$/.test(trimmed)) {
    return true;
  }

  return [
    "positivo",
    "negativo",
    "reagente",
    "nao reagente",
    "detectado",
    "nao detectado",
    "presente",
    "ausente"
  ].includes(normalizeExamSearchValue(trimmed));
}

function isLikelyExamUnitValue(input: string): boolean {
  const trimmed = input.trim();
  if (!trimmed) {
    return false;
  }

  return /^(%|[a-zA-Zµ/0-9.^:-]+)$/.test(trimmed) && /[a-zA-Zµ%]/.test(trimmed);
}

function isLikelyExamReferenceValue(input: string): boolean {
  const normalized = normalizeExamSearchValue(input);
  if (!normalized) {
    return false;
  }

  return (
    normalized.includes("referencia") ||
    normalized.includes("ate") ||
    normalized.includes("adultos") ||
    normalized.includes("criancas") ||
    /[<>]?\d+(?:[.,]\d+)?\s*(?:-|a)\s*[<>]?\d+(?:[.,]\d+)?/.test(normalized)
  );
}

function isLikelyExamName(input: string): boolean {
  const normalized = normalizeExamSearchValue(input.replace(/:$/, ""));
  if (!normalized || normalized.length < 3) {
    return false;
  }

  const blockedTokens = [
    "paciente",
    "prontuario",
    "convenio",
    "cartao sus",
    "pagina",
    "origem",
    "data de nascimento",
    "emissao do laudo",
    "solicitacao",
    "metodo",
    "valor de referencia",
    "valores de referencia",
    "recebimento material",
    "liberado em",
    "responsavel tecnico",
    "dr a",
    "dr",
    "bioquimica",
    "hematologia",
    "uroanalise",
    "parasitologia",
    "microbiologia",
    "observacao",
    "obs"
  ];

  return !blockedTokens.some((token) => normalized.includes(token));
}

function buildExamPdfLines(
  items: Array<{ str?: string; transform?: number[]; width?: number }>
): string[] {
  const positionedItems = items
    .map((item) => ({
      text: item.str?.trim() ?? "",
      x: Array.isArray(item.transform) ? Number(item.transform[4] ?? 0) : 0,
      y: Array.isArray(item.transform) ? Number(item.transform[5] ?? 0) : 0,
      width: typeof item.width === "number" ? item.width : 0
    }))
    .filter((item) => item.text.length > 0)
    .sort((first, second) => {
      if (Math.abs(second.y - first.y) > 2) {
        return second.y - first.y;
      }

      return first.x - second.x;
    });

  const lines: Array<{ y: number; items: typeof positionedItems }> = [];

  for (const item of positionedItems) {
    const existingLine = lines.find((line) => Math.abs(line.y - item.y) <= 2);
    if (existingLine) {
      existingLine.items.push(item);
      continue;
    }

    lines.push({ y: item.y, items: [item] });
  }

  return lines
    .sort((first, second) => second.y - first.y)
    .map((line) => {
      const orderedItems = [...line.items].sort((first, second) => first.x - second.x);
      let content = "";

      for (let index = 0; index < orderedItems.length; index += 1) {
        const currentItem = orderedItems[index];
        const previousItem = orderedItems[index - 1];

        if (!previousItem) {
          content = currentItem.text;
          continue;
        }

        const previousEndX = previousItem.x + previousItem.width;
        const gap = currentItem.x - previousEndX;
        content += gap > 14 ? "\t" : " ";
        content += currentItem.text;
      }

      return content.replace(/\s+\t/g, "\t").replace(/\t\s+/g, "\t").trim();
    })
    .filter((line) => line.length > 0);
}

function parseExtractedExamRecords(
  pageLines: Array<{ pageNumber: number; line: string }>
): PatientExamResultRecord[] {
  const records: PatientExamResultRecord[] = [];

  for (const { pageNumber, line } of pageLines) {
    const segments = line
      .split("\t")
      .map((segment) => segment.trim())
      .filter((segment) => segment.length > 0);

    if (segments.length < 2) {
      continue;
    }

    const resultIndex = segments.findIndex(
      (segment, index) => index > 0 && isLikelyExamResultValue(segment)
    );
    if (resultIndex <= 0) {
      continue;
    }

    const examName = segments.slice(0, resultIndex).join(" ").replace(/:\s*$/, "").trim();
    if (!isLikelyExamName(examName)) {
      continue;
    }

    const result = segments[resultIndex] ?? "";
    const afterResultSegments = segments.slice(resultIndex + 1);
    const unit = afterResultSegments.find((segment) => isLikelyExamUnitValue(segment)) ?? "";
    const referenceRange =
      afterResultSegments.find((segment) => isLikelyExamReferenceValue(segment)) ??
      afterResultSegments.filter((segment) => !isLikelyExamUnitValue(segment)).join(" | ");

    const key = normalizeExamSearchValue(`${pageNumber}-${examName}-${result}-${unit}`);
    if (records.some((record) => record.key === key)) {
      continue;
    }

    records.push({
      key,
      examName,
      result,
      unit,
      referenceRange,
      pageNumber
    });
  }

  return records;
}

async function loadPdfDocument(
  pdfjs: PdfJsModule,
  pdfBytes: Uint8Array
): Promise<PdfJsDocument> {
  const attempts = [
    {
      data: pdfBytes,
      disableWorker: true,
      useSystemFonts: true
    },
    {
      data: pdfBytes,
      disableWorker: true
    }
  ];

  let lastError: unknown = null;
  for (const source of attempts) {
    try {
      return await pdfjs.getDocument(source as unknown).promise;
    } catch (error) {
      lastError = error;
    }
  }

  throw new Error(getUnknownErrorMessage(lastError));
}

export async function extractExamImportFromPdf(
  fileName: string,
  pdfBytes: Uint8Array
): Promise<ExtractedExamImportPayload> {
  const pdfjs = (await import("pdfjs-dist/legacy/build/pdf.mjs")) as PdfJsModule;
  const pdfDocument = await loadPdfDocument(pdfjs, pdfBytes);
  const pageLines: Array<{ pageNumber: number; line: string }> = [];

  for (let pageNumber = 1; pageNumber <= pdfDocument.numPages; pageNumber += 1) {
    try {
      const page = await pdfDocument.getPage(pageNumber);
      const textContent = await page.getTextContent();
      const lines = buildExamPdfLines(
        textContent.items as Array<{ str?: string; transform?: number[]; width?: number }>
      );

      for (const line of lines) {
        pageLines.push({ pageNumber, line });
      }
    } catch {
      continue;
    }
  }

  if (pageLines.length === 0) {
    throw new Error(
      "O PDF nao contem texto pesquisavel para extracao automatica. Se for um PDF escaneado, sera necessario OCR."
    );
  }

  return {
    fileName,
    pageCount: pdfDocument.numPages,
    records: parseExtractedExamRecords(pageLines),
    rawText: pageLines.map((item) => `[Pág. ${item.pageNumber}] ${item.line}`).join("\n")
  };
}
