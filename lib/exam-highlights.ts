import { type PatientExamResultRecord } from "./coreclin-types";

export type ImportantExamId =
  | "creatinina"
  | "ureia"
  | "hemoglobina"
  | "eritrocitos"
  | "leucocitos"
  | "bilirrubina-direta"
  | "bilirrubina-indireta"
  | "bilirrubina-total"
  | "glicemia"
  | "albumina"
  | "calcio"
  | "tgo"
  | "tgp"
  | "plaquetas"
  | "tempo-protrombina"
  | "pcr"
  | "ttpa";

export type ImportantExamStatus = "high" | "low" | "normal" | "unknown";

export type ImportantExamCard = {
  id: ImportantExamId;
  label: string;
  examName: string;
  result: string;
  unit: string;
  referenceText: string;
  pageNumber: number | null;
  examDate: string | null;
  status: ImportantExamStatus;
  resultRecordKey: string | null;
};

type ImportantExamDefinition = {
  id: ImportantExamId;
  label: string;
  examName: string;
  aliases: string[];
  fallbackUnit: string;
  fallbackReferenceText: string;
  fallbackReferenceLow: number | null;
  fallbackReferenceHigh: number | null;
};

type RawTextLine = {
  index: number;
  pageNumber: number;
  content: string;
  normalized: string;
};

type ExamSection = {
  header: RawTextLine;
  lines: RawTextLine[];
};

type ReferenceInfo = {
  text: string;
  low: number | null;
  high: number | null;
};

type RawResultMatch = {
  pageNumber: number;
  result: string;
  unit: string;
  reference: ReferenceInfo | null;
};

const IMPORTANT_EXAM_DEFINITIONS: ImportantExamDefinition[] = [
  {
    id: "creatinina",
    label: "Creatinina",
    examName: "CREATININA",
    aliases: ["creatinina"],
    fallbackUnit: "mg/dL",
    fallbackReferenceText: "0,5 a 1,2 mg/dL",
    fallbackReferenceLow: 0.5,
    fallbackReferenceHigh: 1.2
  },
  {
    id: "ureia",
    label: "Ureia",
    examName: "URÉIA",
    aliases: ["ureia", "urea"],
    fallbackUnit: "mg/dL",
    fallbackReferenceText: "17 a 48 mg/dL",
    fallbackReferenceLow: 17,
    fallbackReferenceHigh: 48
  },
  {
    id: "hemoglobina",
    label: "Hemoglobina",
    examName: "HEMOGLOBINA",
    aliases: ["hemoglobina"],
    fallbackUnit: "g/dL",
    fallbackReferenceText: "12,0 a 17,0 g/dL",
    fallbackReferenceLow: 12,
    fallbackReferenceHigh: 17
  },
  {
    id: "eritrocitos",
    label: "Eritrócitos",
    examName: "ERITRÓCITOS",
    aliases: ["eritrocitos", "eritrocitos totais"],
    fallbackUnit: "milhões/uL",
    fallbackReferenceText: "3,8 a 5,5 milhões/uL",
    fallbackReferenceLow: 3.8,
    fallbackReferenceHigh: 5.5
  },
  {
    id: "leucocitos",
    label: "Leucócitos",
    examName: "LEUCÓCITOS TOTAIS",
    aliases: ["leucocitos totais", "leucocitos"],
    fallbackUnit: "/mm³",
    fallbackReferenceText: "4.000 a 10.000 /mm³",
    fallbackReferenceLow: 4000,
    fallbackReferenceHigh: 10000
  },
  {
    id: "bilirrubina-direta",
    label: "Bilirrubina Direta",
    examName: "BILIRRUBINA DIRETA",
    aliases: ["bilirrubina direta"],
    fallbackUnit: "mg/dL",
    fallbackReferenceText: "Até 0,3 mg/dL",
    fallbackReferenceLow: null,
    fallbackReferenceHigh: 0.3
  },
  {
    id: "bilirrubina-indireta",
    label: "Bilirrubina Indireta",
    examName: "BILIRRUBINA INDIRETA",
    aliases: ["bilirrubina indireta"],
    fallbackUnit: "mg/dL",
    fallbackReferenceText: "Até 1,0 mg/dL",
    fallbackReferenceLow: null,
    fallbackReferenceHigh: 1
  },
  {
    id: "bilirrubina-total",
    label: "Bilirrubina Total",
    examName: "BILIRRUBINA TOTAL",
    aliases: ["bilirrubina total"],
    fallbackUnit: "mg/dL",
    fallbackReferenceText: "Até 1,2 mg/dL",
    fallbackReferenceLow: null,
    fallbackReferenceHigh: 1.2
  },
  {
    id: "glicemia",
    label: "Glicemia",
    examName: "GLICEMIA",
    aliases: ["glicemia", "glicose", "glicose em jejum"],
    fallbackUnit: "mg/dL",
    fallbackReferenceText: "70 a 99 mg/dL",
    fallbackReferenceLow: 70,
    fallbackReferenceHigh: 99
  },
  {
    id: "albumina",
    label: "Albumina",
    examName: "ALBUMINA",
    aliases: ["albumina"],
    fallbackUnit: "g/dL",
    fallbackReferenceText: "3,5 a 5,2 g/dL",
    fallbackReferenceLow: 3.5,
    fallbackReferenceHigh: 5.2
  },
  {
    id: "calcio",
    label: "Cálcio",
    examName: "CÁLCIO",
    aliases: ["calcio", "calcio total", "calcio ionizado"],
    fallbackUnit: "mg/dL",
    fallbackReferenceText: "8,6 a 10,2 mg/dL",
    fallbackReferenceLow: 8.6,
    fallbackReferenceHigh: 10.2
  },
  {
    id: "tgo",
    label: "TGO",
    examName: "ASPARTATO AMINOTRANSFERASE-TGO",
    aliases: ["aspartato aminotransferase-tgo", "aspartato aminotransferase tgo", "tgo", "ast"],
    fallbackUnit: "U/L",
    fallbackReferenceText: "Até 40 U/L",
    fallbackReferenceLow: null,
    fallbackReferenceHigh: 40
  },
  {
    id: "tgp",
    label: "TGP",
    examName: "ALANINA AMINOTRANSFERASE-TGP",
    aliases: ["alanina aminotransferase-tgp", "alanina aminotransferase tgp", "tgp", "alt"],
    fallbackUnit: "U/L",
    fallbackReferenceText: "Até 41 U/L",
    fallbackReferenceLow: null,
    fallbackReferenceHigh: 41
  },
  {
    id: "plaquetas",
    label: "Plaquetas",
    examName: "PLAQUETAS",
    aliases: ["plaquetas"],
    fallbackUnit: "/mm³",
    fallbackReferenceText: "150.000 a 450.000 /mm³",
    fallbackReferenceLow: 150000,
    fallbackReferenceHigh: 450000
  },
  {
    id: "tempo-protrombina",
    label: "Tempo de protrombina",
    examName: "TEMPO DE PROTROMBINA",
    aliases: ["tempo de protrombina"],
    fallbackUnit: "segundos",
    fallbackReferenceText: "11 a 14 segundos",
    fallbackReferenceLow: 11,
    fallbackReferenceHigh: 14
  },
  {
    id: "pcr",
    label: "PCR",
    examName: "PROTEÍNA C REATIVA",
    aliases: ["proteina c reativa", "pcr"],
    fallbackUnit: "mg/L",
    fallbackReferenceText: "Até 5 mg/L",
    fallbackReferenceLow: null,
    fallbackReferenceHigh: 5
  },
  {
    id: "ttpa",
    label: "TTPA",
    examName: "TEMPO DE TROMBOPLASTINA PARCIAL ATIVADA - TTPA",
    aliases: [
      "tempo de tromboplastina parcial ativada - ttpa",
      "tempo de tromboplastina parcial ativada",
      "ttpa"
    ],
    fallbackUnit: "segundos",
    fallbackReferenceText: "20 a 45 segundos",
    fallbackReferenceLow: 20,
    fallbackReferenceHigh: 45
  }
];

const IMPORTANT_EXAM_DEFINITION_MAP = new Map(
  IMPORTANT_EXAM_DEFINITIONS.map((definition) => [definition.id, definition])
);

function normalizeExamSearchValue(input: string): string {
  return input
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .toLocaleLowerCase();
}

function escapeRegExp(input: string): string {
  return input.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function normalizedTextHasAlias(normalizedText: string, alias: string): boolean {
  const normalizedAlias = normalizeExamSearchValue(alias);
  if (!normalizedAlias) {
    return false;
  }

  const pattern = new RegExp(`(^|[^a-z0-9])${escapeRegExp(normalizedAlias)}([^a-z0-9]|$)`, "u");
  return pattern.test(normalizedText);
}

function normalizeNumericText(input: string): string {
  return input
    .trim()
    .replace(/\s+/g, "")
    .replace(/\.(?=\d{3}(?:\D|$))/g, "")
    .replace(",", ".");
}

function parseNumericValue(input: string): number | null {
  const normalized = normalizeNumericText(input);
  if (!normalized) {
    return null;
  }

  const parsed = Number(normalized.replace(/^[<>]=?/, ""));
  return Number.isFinite(parsed) ? parsed : null;
}

function formatReferenceNumber(value: number): string {
  return new Intl.NumberFormat("pt-BR", {
    minimumFractionDigits: Number.isInteger(value) ? 0 : 1,
    maximumFractionDigits: 3
  }).format(value);
}

function formatReferenceText(
  low: number | null,
  high: number | null,
  unit: string,
  fallbackText: string
): string {
  const suffix = unit ? ` ${unit}` : "";
  if (low !== null && high !== null) {
    return `${formatReferenceNumber(low)} a ${formatReferenceNumber(high)}${suffix}`;
  }

  if (high !== null) {
    return `Até ${formatReferenceNumber(high)}${suffix}`;
  }

  if (low !== null) {
    return `Maior ou igual a ${formatReferenceNumber(low)}${suffix}`;
  }

  return fallbackText;
}

function normalizeUnitForDisplay(unit: string, fallbackUnit: string): string {
  const trimmed = unit.trim();
  if (!trimmed) {
    return fallbackUnit;
  }

  const normalizedTrimmed = normalizeExamSearchValue(trimmed).replace(/\s+/g, "");
  const normalizedFallback = normalizeExamSearchValue(fallbackUnit).replace(/\s+/g, "");

  if (normalizedTrimmed === normalizedFallback) {
    return fallbackUnit;
  }

  if (normalizedTrimmed === "md/dl" && normalizedFallback === "mg/dl") {
    return fallbackUnit;
  }

  return trimmed;
}

function parseReferenceFromText(input: string, fallbackUnit: string): ReferenceInfo | null {
  const normalized = normalizeExamSearchValue(input);
  if (!normalized) {
    return null;
  }

  const rangeMatches = Array.from(
    input.matchAll(/(\d+(?:\.\d{3})*(?:,\d+)?)\s*(?:-|a)\s*(\d+(?:\.\d{3})*(?:,\d+)?)/giu)
  );
  if (rangeMatches.length > 0) {
    const match = rangeMatches[rangeMatches.length - 1];
    const low = parseNumericValue(match[1] ?? "");
    const high = parseNumericValue(match[2] ?? "");
    if (low !== null || high !== null) {
      return {
        text: formatReferenceText(low, high, fallbackUnit, input.trim()),
        low,
        high
      };
    }
  }

  const upperMatches = Array.from(
    input.matchAll(
      /(?:ate|até|inferior a|menor que|<|<=)\s*(\d+(?:\.\d{3})*(?:,\d+)?)/giu
    )
  );
  if (upperMatches.length > 0) {
    const match = upperMatches[upperMatches.length - 1];
    const high = parseNumericValue(match[1] ?? "");
    if (high !== null) {
      return {
        text: formatReferenceText(null, high, fallbackUnit, input.trim()),
        low: null,
        high
      };
    }
  }

  const lowerMatches = Array.from(
    input.matchAll(
      /(?:maior ou igual a|superior ou igual a|>=|>)\s*(\d+(?:\.\d{3})*(?:,\d+)?)/giu
    )
  );
  if (lowerMatches.length > 0) {
    const match = lowerMatches[lowerMatches.length - 1];
    const low = parseNumericValue(match[1] ?? "");
    if (low !== null) {
      return {
        text: formatReferenceText(low, null, fallbackUnit, input.trim()),
        low,
        high: null
      };
    }
  }

  return null;
}

function parseRawTextLines(rawText: string): RawTextLine[] {
  return rawText
    .split(/\r?\n/)
    .map((line) => line.trim())
    .flatMap((line, index) => {
      const match = line.match(/^\[P(?:á|a)g\.\s*(\d+)\]\s*(.+)$/i);
      if (!match) {
        return [];
      }

      const pageNumber = Number(match[1]);
      const content = match[2]?.trim() ?? "";
      if (!Number.isInteger(pageNumber) || pageNumber <= 0 || !content) {
        return [];
      }

      return [
        {
          index,
          pageNumber,
          content,
          normalized: normalizeExamSearchValue(content)
        }
      ];
    });
}

function isExamSectionHeader(line: RawTextLine): boolean {
  return line.normalized.includes("solicitacao:") && /\([^)]+\)/u.test(line.content);
}

function buildExamSections(rawText: string): ExamSection[] {
  const lines = parseRawTextLines(rawText);
  const sections: ExamSection[] = [];

  for (const line of lines) {
    if (isExamSectionHeader(line)) {
      sections.push({ header: line, lines: [line] });
      continue;
    }

    const currentSection = sections[sections.length - 1];
    if (currentSection) {
      currentSection.lines.push(line);
    }
  }

  return sections;
}

function lineMatchesDefinition(line: RawTextLine, definition: ImportantExamDefinition): boolean {
  return definition.aliases.some((alias) => {
    const normalizedAlias = normalizeExamSearchValue(alias);
    return new RegExp(`(^|[^a-z0-9])${escapeRegExp(normalizedAlias)}\\s*:`, "u").test(
      line.normalized
    );
  });
}

function findImportantExamDefinition(examName: string): ImportantExamDefinition | null {
  const normalizedName = normalizeExamSearchValue(examName);
  for (const definition of IMPORTANT_EXAM_DEFINITIONS) {
    if (
      definition.aliases.some((alias) => {
        const normalizedAlias = normalizeExamSearchValue(alias);
        return (
          normalizedName === normalizedAlias ||
          normalizedName.startsWith(`${normalizedAlias}:`) ||
          normalizedTextHasAlias(normalizedName, alias)
        );
      })
    ) {
      return definition;
    }
  }

  return null;
}

export function isImportantExamRecord(examName: string): boolean {
  return findImportantExamDefinition(examName) !== null;
}

function extractMeasurementFromLine(line: RawTextLine): { result: string; unit: string } | null {
  const colonIndex = line.content.indexOf(":");
  if (colonIndex < 0) {
    return null;
  }

  const afterColon = line.content.slice(colonIndex + 1).trim();
  if (!afterColon) {
    return null;
  }

  const valueMatch = afterColon.match(/[<>]?\s*\d+(?:\.\d{3})*(?:,\d+)?/u);
  if (!valueMatch) {
    return null;
  }

  const result = valueMatch[0].trim();
  let unit = afterColon.slice(valueMatch.index! + valueMatch[0].length).trim();
  if (unit.includes("\t")) {
    unit = unit.split("\t")[0]?.trim() ?? "";
  }
  if (unit.match(/\s+[A-ZÁÀÂÃÉÊÍÓÔÕÚÇ][A-ZÁÀÂÃÉÊÍÓÔÕÚÇ0-9/ .-]*:/u)) {
    unit = unit.split(/\s+[A-ZÁÀÂÃÉÊÍÓÔÕÚÇ][A-ZÁÀÂÃÉÊÍÓÔÕÚÇ0-9/ .-]*:/u)[0]?.trim() ?? "";
  }
  if (normalizeExamSearchValue(unit).startsWith("valores de referencia")) {
    unit = "";
  }

  return { result, unit };
}

function combineReferences(
  references: ReferenceInfo[],
  fallbackText: string,
  unit: string
): ReferenceInfo | null {
  if (references.length === 0) {
    return null;
  }

  const lowValues = references
    .map((reference) => reference.low)
    .filter((value): value is number => value !== null);
  const highValues = references
    .map((reference) => reference.high)
    .filter((value): value is number => value !== null);

  const low = lowValues.length > 0 ? Math.min(...lowValues) : null;
  const high = highValues.length > 0 ? Math.max(...highValues) : null;
  return {
    text: formatReferenceText(low, high, unit, fallbackText),
    low,
    high
  };
}

function extractReferenceBlock(section: ExamSection): RawTextLine[] {
  const referenceStartIndex = section.lines.findIndex((line) => line.normalized.includes("referencia"));
  if (referenceStartIndex < 0) {
    return [];
  }

  const block: RawTextLine[] = [];
  for (let index = referenceStartIndex; index < section.lines.length; index += 1) {
    const line = section.lines[index];
    if (!line) {
      continue;
    }

    if (index > referenceStartIndex) {
      const normalized = line.normalized;
      if (
        normalized.startsWith("obs") ||
        normalized.includes("recebimento material") ||
        normalized.includes("exames conferidos") ||
        normalized.includes("todo teste laboratorial")
      ) {
        break;
      }
    }

    block.push(line);
  }

  return block;
}

function extractBilirrubinReference(
  definition: ImportantExamDefinition,
  section: ExamSection
): ReferenceInfo | null {
  const adultLine =
    section.lines.find((line) => line.normalized.startsWith("adultos")) ??
    section.lines.find((line) => line.normalized.startsWith("a partir de 1 mes"));
  if (!adultLine) {
    return null;
  }

  const segments = adultLine.content
    .split("\t")
    .map((segment) => segment.trim())
    .filter((segment) => segment.length > 0);
  const offset =
    definition.id === "bilirrubina-total"
      ? 1
      : definition.id === "bilirrubina-direta"
        ? 2
        : 3;
  const segment = segments[offset] ?? "";
  if (!segment) {
    return null;
  }

  return parseReferenceFromText(segment, definition.fallbackUnit);
}

function extractHemogramAdultReference(
  definition: ImportantExamDefinition,
  section: ExamSection
): ReferenceInfo | null {
  const referenceBlock = extractReferenceBlock(section);
  const lineIndex = referenceBlock.findIndex((line) => lineMatchesDefinition(line, definition));
  if (lineIndex < 0) {
    return null;
  }

  const currentLine = referenceBlock[lineIndex];
  const nextLine = referenceBlock[lineIndex + 1];
  const combinedText =
    nextLine && !nextLine.content.includes(":") && /\d/u.test(nextLine.content)
      ? `${currentLine.content} ${nextLine.content}`
      : currentLine.content;
  const rangeMatches = Array.from(
    combinedText.matchAll(/(\d+(?:\.\d{3})*(?:,\d+)?)\s*(?:-|a)\s*(\d+(?:\.\d{3})*(?:,\d+)?)/giu)
  );
  if (rangeMatches.length === 0) {
    return null;
  }

  const adultRanges = rangeMatches.slice(-2).map((match) => ({
    low: parseNumericValue(match[1] ?? ""),
    high: parseNumericValue(match[2] ?? "")
  }));

  return combineReferences(
    adultRanges.map((range) => ({
      text: "",
      low: range.low,
      high: range.high
    })),
    definition.fallbackReferenceText,
    definition.fallbackUnit
  );
}

function extractReferenceFromSection(
  definition: ImportantExamDefinition,
  section: ExamSection
): ReferenceInfo | null {
  if (definition.id.startsWith("bilirrubina-")) {
    return extractBilirrubinReference(definition, section);
  }

  if (definition.id === "eritrocitos" || definition.id === "hemoglobina") {
    const hemogramReference = extractHemogramAdultReference(definition, section);
    if (hemogramReference) {
      return hemogramReference;
    }
  }

  const referenceBlock = extractReferenceBlock(section);
  if (referenceBlock.length === 0) {
    return null;
  }

  if (definition.id === "leucocitos") {
    const line = referenceBlock.find((item) => item.normalized.startsWith("leucocitos totais:"));
    return line ? parseReferenceFromText(line.content, definition.fallbackUnit) : null;
  }

  if (definition.id === "tempo-protrombina") {
    return null;
  }

  if (definition.id === "plaquetas") {
    const line =
      referenceBlock.find((item) => item.normalized.startsWith("valor de referencia:")) ?? null;
    return line ? parseReferenceFromText(line.content, definition.fallbackUnit) : null;
  }

  const adultLines = referenceBlock.filter(
    (line) =>
      !line.normalized.includes(">90") &&
      (line.normalized.includes("adult") ||
        line.normalized.includes("homens:") ||
        line.normalized.includes("homem:") ||
        line.normalized.includes("mulheres:") ||
        line.normalized.includes("mulher:"))
  );

  const candidateLines = adultLines.length > 0 ? adultLines : referenceBlock;
  const candidateReferences = candidateLines
    .map((line) => parseReferenceFromText(line.content, definition.fallbackUnit))
    .filter((reference): reference is ReferenceInfo => reference !== null);

  return combineReferences(
    candidateReferences,
    definition.fallbackReferenceText,
    definition.fallbackUnit
  );
}

function findBestRawResultMatch(
  definition: ImportantExamDefinition,
  sections: ExamSection[]
): RawResultMatch | null {
  const candidates = sections
    .map((section) => {
      const line = section.lines.find((item) => lineMatchesDefinition(item, definition));
      if (!line) {
        return null;
      }

      const measurement = extractMeasurementFromLine(line);
      if (!measurement) {
        return null;
      }

      return {
        pageNumber: line.pageNumber,
        result: measurement.result,
        unit: measurement.unit,
        reference: extractReferenceFromSection(definition, section)
      };
    })
    .filter((candidate): candidate is RawResultMatch => candidate !== null);

  if (candidates.length === 0) {
    return null;
  }

  return candidates.sort((first, second) => second.pageNumber - first.pageNumber)[0] ?? null;
}

function shouldIgnoreCurrentReference(id: ImportantExamId, referenceText: string): boolean {
  const normalizedReference = normalizeExamSearchValue(referenceText);
  return id === "tempo-protrombina" && normalizedReference.includes("atividade enzimatica");
}

function compareRecordCandidates(
  current: { record: PatientExamResultRecord; order: number } | null,
  next: { record: PatientExamResultRecord; order: number }
): { record: PatientExamResultRecord; order: number } {
  if (!current) {
    return next;
  }

  const currentDate = current.record.examDate ? Date.parse(current.record.examDate) : Number.NEGATIVE_INFINITY;
  const nextDate = next.record.examDate ? Date.parse(next.record.examDate) : Number.NEGATIVE_INFINITY;
  if (nextDate !== currentDate) {
    return nextDate > currentDate ? next : current;
  }

  if (next.record.pageNumber !== current.record.pageNumber) {
    return next.record.pageNumber > current.record.pageNumber ? next : current;
  }

  return next.order > current.order ? next : current;
}

function buildRecordMatchMap(
  records: PatientExamResultRecord[]
): Map<ImportantExamId, { record: PatientExamResultRecord; order: number }> {
  const matches = new Map<ImportantExamId, { record: PatientExamResultRecord; order: number }>();

  records.forEach((record, order) => {
    const definition = findImportantExamDefinition(record.examName);
    if (!definition) {
      return;
    }

    matches.set(
      definition.id,
      compareRecordCandidates(matches.get(definition.id) ?? null, { record, order })
    );
  });

  return matches;
}

function resolveReference(
  definition: ImportantExamDefinition,
  recordReferenceRange: string,
  rawReference: ReferenceInfo | null
): ReferenceInfo {
  const recordReference = recordReferenceRange.trim()
    ? shouldIgnoreCurrentReference(definition.id, recordReferenceRange)
      ? null
      : parseReferenceFromText(recordReferenceRange, definition.fallbackUnit)
    : null;
  if (recordReference) {
    return recordReference;
  }

  if (rawReference) {
    return rawReference;
  }

  return {
    text: definition.fallbackReferenceText,
    low: definition.fallbackReferenceLow,
    high: definition.fallbackReferenceHigh
  };
}

function getImportantExamDefinitionOrThrow(id: ImportantExamId): ImportantExamDefinition {
  const definition = IMPORTANT_EXAM_DEFINITION_MAP.get(id);
  if (!definition) {
    throw new Error(`Important exam definition not found for ${id}`);
  }

  return definition;
}

function getResultStatus(
  result: string,
  referenceLow: number | null,
  referenceHigh: number | null
): ImportantExamStatus {
  const numericResult = parseNumericValue(result);
  if (numericResult === null || (referenceLow === null && referenceHigh === null)) {
    return "unknown";
  }

  if (referenceLow !== null && numericResult < referenceLow) {
    return "low";
  }

  if (referenceHigh !== null && numericResult > referenceHigh) {
    return "high";
  }

  return "normal";
}

export function mergeImportantExamRecords(
  records: PatientExamResultRecord[],
  rawText: string
): PatientExamResultRecord[] {
  if (!rawText.trim()) {
    return records;
  }

  const sections = buildExamSections(rawText);
  if (sections.length === 0) {
    return records;
  }

  const nextRecords = [...records];
  const recordMatches = buildRecordMatchMap(records);

  for (const definition of IMPORTANT_EXAM_DEFINITIONS) {
    const currentMatch = recordMatches.get(definition.id)?.record ?? null;
    const rawMatch = findBestRawResultMatch(definition, sections);
    if (!rawMatch) {
      continue;
    }

    const reference = resolveReference(
      definition,
      currentMatch?.referenceRange ?? "",
      rawMatch.reference
    );

    if (currentMatch) {
      const currentReference = currentMatch.referenceRange.trim();
      const currentReferenceInfo = shouldIgnoreCurrentReference(definition.id, currentReference)
        ? null
        : parseReferenceFromText(currentReference, definition.fallbackUnit);
      const nextUnit = normalizeUnitForDisplay(
        currentMatch.unit || rawMatch.unit,
        definition.fallbackUnit
      );
      const nextReferenceRange =
        currentReferenceInfo && currentReference
          ? currentReference
          : reference.text;
      const updatedRecord: PatientExamResultRecord = {
        ...currentMatch,
        unit: nextUnit,
        referenceRange: nextReferenceRange
      };
      const recordIndex = nextRecords.findIndex((record) => record.key === currentMatch.key);
      if (recordIndex >= 0) {
        nextRecords[recordIndex] = updatedRecord;
      }
      continue;
    }

    nextRecords.push({
      key: `${definition.id}-${rawMatch.pageNumber}-${normalizeExamSearchValue(rawMatch.result)}`,
      examName: definition.examName,
      result: rawMatch.result,
      unit: normalizeUnitForDisplay(rawMatch.unit, definition.fallbackUnit),
      referenceRange: reference.text,
      pageNumber: rawMatch.pageNumber,
      examDate: null
    });
  }

  return nextRecords;
}

export function buildImportantExamCards(input: {
  records: PatientExamResultRecord[];
  rawText?: string;
}): ImportantExamCard[] {
  const recordMatches = buildRecordMatchMap(input.records);
  const sections = input.rawText?.trim() ? buildExamSections(input.rawText) : [];

  return IMPORTANT_EXAM_DEFINITIONS.map((definition) => {
    const record = recordMatches.get(definition.id)?.record ?? null;
    const rawReference =
      record && sections.length > 0 ? findBestRawResultMatch(definition, sections)?.reference ?? null : null;
    const reference = resolveReference(definition, record?.referenceRange ?? "", rawReference);
    const unit = normalizeUnitForDisplay(record?.unit ?? "", definition.fallbackUnit);
    const result = record?.result ?? "";

    return {
      id: definition.id,
      label: definition.label,
      examName: definition.examName,
      result,
      unit,
      referenceText: reference.text,
      pageNumber: record?.pageNumber ?? null,
      examDate: record?.examDate ?? null,
      status: getResultStatus(result, reference.low, reference.high),
      resultRecordKey: record?.key ?? null
    };
  });
}

export function findImportantExamCardByRecord(
  examName: string
): { id: ImportantExamId; label: string } | null {
  const definition = findImportantExamDefinition(examName);
  if (!definition) {
    return null;
  }

  const strongDefinition = getImportantExamDefinitionOrThrow(definition.id);
  return {
    id: strongDefinition.id,
    label: strongDefinition.label
  };
}
