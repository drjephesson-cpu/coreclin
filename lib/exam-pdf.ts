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

type MatrixLike =
  | {
      a?: number;
      b?: number;
      c?: number;
      d?: number;
      e?: number;
      f?: number;
    }
  | ArrayLike<number>;

class MinimalDOMMatrix {
  a: number;
  b: number;
  c: number;
  d: number;
  e: number;
  f: number;
  readonly is2D = true;

  constructor(init?: MatrixLike) {
    const values = MinimalDOMMatrix.readValues(init);
    this.a = values.a;
    this.b = values.b;
    this.c = values.c;
    this.d = values.d;
    this.e = values.e;
    this.f = values.f;
  }

  get m11(): number {
    return this.a;
  }

  set m11(value: number) {
    this.a = value;
  }

  get m12(): number {
    return this.b;
  }

  set m12(value: number) {
    this.b = value;
  }

  get m21(): number {
    return this.c;
  }

  set m21(value: number) {
    this.c = value;
  }

  get m22(): number {
    return this.d;
  }

  set m22(value: number) {
    this.d = value;
  }

  get m41(): number {
    return this.e;
  }

  set m41(value: number) {
    this.e = value;
  }

  get m42(): number {
    return this.f;
  }

  set m42(value: number) {
    this.f = value;
  }

  multiplySelf(other: MatrixLike): MinimalDOMMatrix {
    const matrix = MinimalDOMMatrix.readValues(other);
    const nextA = this.a * matrix.a + this.c * matrix.b;
    const nextB = this.b * matrix.a + this.d * matrix.b;
    const nextC = this.a * matrix.c + this.c * matrix.d;
    const nextD = this.b * matrix.c + this.d * matrix.d;
    const nextE = this.a * matrix.e + this.c * matrix.f + this.e;
    const nextF = this.b * matrix.e + this.d * matrix.f + this.f;

    this.a = nextA;
    this.b = nextB;
    this.c = nextC;
    this.d = nextD;
    this.e = nextE;
    this.f = nextF;
    return this;
  }

  preMultiplySelf(other: MatrixLike): MinimalDOMMatrix {
    const matrix = MinimalDOMMatrix.readValues(other);
    const nextA = matrix.a * this.a + matrix.c * this.b;
    const nextB = matrix.b * this.a + matrix.d * this.b;
    const nextC = matrix.a * this.c + matrix.c * this.d;
    const nextD = matrix.b * this.c + matrix.d * this.d;
    const nextE = matrix.a * this.e + matrix.c * this.f + matrix.e;
    const nextF = matrix.b * this.e + matrix.d * this.f + matrix.f;

    this.a = nextA;
    this.b = nextB;
    this.c = nextC;
    this.d = nextD;
    this.e = nextE;
    this.f = nextF;
    return this;
  }

  translate(tx = 0, ty = 0, _tz = 0): MinimalDOMMatrix {
    return this.clone().translateSelf(tx, ty);
  }

  translateSelf(tx = 0, ty = 0, _tz = 0): MinimalDOMMatrix {
    return this.multiplySelf([1, 0, 0, 1, tx, ty]);
  }

  scale(
    scaleX = 1,
    scaleY = scaleX,
    _scaleZ = 1,
    originX = 0,
    originY = 0,
    _originZ = 0
  ): MinimalDOMMatrix {
    return this.clone().scaleSelf(scaleX, scaleY, 1, originX, originY);
  }

  scaleSelf(
    scaleX = 1,
    scaleY = scaleX,
    _scaleZ = 1,
    originX = 0,
    originY = 0,
    _originZ = 0
  ): MinimalDOMMatrix {
    if (originX !== 0 || originY !== 0) {
      this.translateSelf(originX, originY);
    }
    this.multiplySelf([scaleX, 0, 0, scaleY, 0, 0]);
    if (originX !== 0 || originY !== 0) {
      this.translateSelf(-originX, -originY);
    }
    return this;
  }

  invertSelf(): MinimalDOMMatrix {
    const determinant = this.a * this.d - this.b * this.c;
    if (!Number.isFinite(determinant) || determinant === 0) {
      this.a = Number.NaN;
      this.b = Number.NaN;
      this.c = Number.NaN;
      this.d = Number.NaN;
      this.e = Number.NaN;
      this.f = Number.NaN;
      return this;
    }

    const nextA = this.d / determinant;
    const nextB = -this.b / determinant;
    const nextC = -this.c / determinant;
    const nextD = this.a / determinant;
    const nextE = (this.c * this.f - this.d * this.e) / determinant;
    const nextF = (this.b * this.e - this.a * this.f) / determinant;

    this.a = nextA;
    this.b = nextB;
    this.c = nextC;
    this.d = nextD;
    this.e = nextE;
    this.f = nextF;
    return this;
  }

  clone(): MinimalDOMMatrix {
    return new MinimalDOMMatrix([this.a, this.b, this.c, this.d, this.e, this.f]);
  }

  toFloat64Array(): Float64Array {
    return new Float64Array([this.a, this.b, this.c, this.d, this.e, this.f]);
  }

  static fromFloat32Array(array32: Float32Array): MinimalDOMMatrix {
    return new MinimalDOMMatrix(array32);
  }

  static fromFloat64Array(array64: Float64Array): MinimalDOMMatrix {
    return new MinimalDOMMatrix(array64);
  }

  static fromMatrix(other?: MatrixLike): MinimalDOMMatrix {
    return new MinimalDOMMatrix(other);
  }

  private static readValues(init?: MatrixLike): {
    a: number;
    b: number;
    c: number;
    d: number;
    e: number;
    f: number;
  } {
    if (!init) {
      return { a: 1, b: 0, c: 0, d: 1, e: 0, f: 0 };
    }

    if (typeof (init as ArrayLike<number>).length === "number") {
      const values = Array.from(init as ArrayLike<number>);
      if (values.length >= 6) {
        return {
          a: Number(values[0] ?? 1),
          b: Number(values[1] ?? 0),
          c: Number(values[2] ?? 0),
          d: Number(values[3] ?? 1),
          e: Number(values[4] ?? 0),
          f: Number(values[5] ?? 0)
        };
      }
    }

    const matrix = init as {
      a?: number;
      b?: number;
      c?: number;
      d?: number;
      e?: number;
      f?: number;
    };
    return {
      a: Number(matrix.a ?? 1),
      b: Number(matrix.b ?? 0),
      c: Number(matrix.c ?? 0),
      d: Number(matrix.d ?? 1),
      e: Number(matrix.e ?? 0),
      f: Number(matrix.f ?? 0)
    };
  }
}

class MinimalPath2D {
  addPath(_path?: unknown, _transform?: unknown): void {}

  closePath(): void {}

  moveTo(_x: number, _y: number): void {}

  lineTo(_x: number, _y: number): void {}

  bezierCurveTo(
    _cp1x: number,
    _cp1y: number,
    _cp2x: number,
    _cp2y: number,
    _x: number,
    _y: number
  ): void {}

  rect(_x: number, _y: number, _width: number, _height: number): void {}
}

class MinimalImageData {
  data: Uint8ClampedArray;
  width: number;
  height: number;

  constructor(data: Uint8ClampedArray | number, width: number, height?: number) {
    if (typeof data === "number") {
      this.width = data;
      this.height = width;
      this.data = new Uint8ClampedArray(this.width * this.height * 4);
      return;
    }

    this.data = data;
    this.width = width;
    this.height = typeof height === "number" ? height : Math.max(1, Math.floor(data.length / (width * 4)));
  }
}

function ensurePdfJsNodePolyfills(): void {
  const runtime = globalThis as unknown as {
    DOMMatrix?: typeof MinimalDOMMatrix;
    Path2D?: typeof MinimalPath2D;
    ImageData?: typeof MinimalImageData;
  };

  if (typeof runtime.DOMMatrix === "undefined") {
    runtime.DOMMatrix = MinimalDOMMatrix;
  }

  if (typeof runtime.Path2D === "undefined") {
    runtime.Path2D = MinimalPath2D;
  }

  if (typeof runtime.ImageData === "undefined") {
    runtime.ImageData = MinimalImageData;
  }
}

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
  ensurePdfJsNodePolyfills();
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
