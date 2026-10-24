import type {
  DocumentKnowledgeRepresentation,
  DocumentSourceReference,
  SourceDocument,
  SourceDocumentPage,
  TutorSourceChunk,
} from "@/types/document";

export const MAX_DOCUMENTS = 12;
export const MAX_DOCUMENT_PAGES = 240;
export const MAX_DOCUMENT_TEXT_CHARS = 800_000;
export const MAX_CHUNK_CHARS = 1_800;
export const MAX_CHUNK_OVERLAP = 180;

const STOP_WORDS = new Set([
  "about", "after", "again", "also", "and", "are", "because", "been", "before", "being", "between",
  "could", "does", "from", "have", "into", "just", "learn", "learning", "make", "more", "most", "need",
  "should", "some", "such", "than", "that", "their", "them", "then", "there", "these", "they", "this",
  "what", "when", "where", "which", "while", "with", "would", "your",
]);

function boundedText(value: unknown, max: number): string {
  return typeof value === "string" ? value.replace(/\0/g, "").trim().slice(0, max) : "";
}

function normalizePage(value: unknown, index: number): SourceDocumentPage | null {
  if (value === null || typeof value !== "object" || Array.isArray(value)) return null;
  const item = value as Record<string, unknown>;
  const text = boundedText(item.text, MAX_DOCUMENT_TEXT_CHARS);
  if (!text) return null;
  const pageNumber = item.pageNumber === null
    ? null
    : typeof item.pageNumber === "number" && Number.isInteger(item.pageNumber) && item.pageNumber > 0
      ? item.pageNumber
      : index + 1;
  return { pageNumber, text };
}

/** Validates persisted extracted text before it is used for retrieval or sent to an AI provider. */
export function normalizeSourceDocuments(value: unknown): SourceDocument[] {
  if (!Array.isArray(value)) return [];
  const documents: SourceDocument[] = [];
  let remainingChars = MAX_DOCUMENT_TEXT_CHARS;

  for (const raw of value.slice(-MAX_DOCUMENTS)) {
    if (remainingChars <= 0 || raw === null || typeof raw !== "object" || Array.isArray(raw)) continue;
    const item = raw as Record<string, unknown>;
    const id = boundedText(item.id, 80);
    const name = boundedText(item.name, 180);
    if (!id || !name) continue;
    const mimeType = item.mimeType === "application/pdf" ? "application/pdf" : item.mimeType === "text/plain" ? "text/plain" : null;
    if (!mimeType || !Array.isArray(item.pages)) continue;
    const pages: SourceDocumentPage[] = [];
    let consumedChars = 0;
    for (const [index, rawPage] of item.pages.slice(0, MAX_DOCUMENT_PAGES).entries()) {
      const page = normalizePage(rawPage, index);
      if (!page || remainingChars - consumedChars <= 0) continue;
      const trimmed = page.text.slice(0, remainingChars - consumedChars);
      if (trimmed) {
        pages.push({ pageNumber: page.pageNumber, text: trimmed });
        consumedChars += trimmed.length;
      }
    }
    if (!pages.length) continue;
    remainingChars -= consumedChars;
    const warningList = Array.isArray(item.warnings)
      ? item.warnings.slice(0, 8).map((warning) => boundedText(warning, 220)).filter(Boolean)
      : [];
    documents.push({
      id,
      name,
      title: boundedText(item.title, 180) || undefined,
      metadata: item.metadata && typeof item.metadata === "object" && !Array.isArray(item.metadata)
        ? {
            author: boundedText((item.metadata as Record<string, unknown>).author, 120) || undefined,
            subject: boundedText((item.metadata as Record<string, unknown>).subject, 180) || undefined,
            createdAt: boundedText((item.metadata as Record<string, unknown>).createdAt, 40) || undefined,
          }
        : undefined,
      mimeType,
      byteSize: typeof item.byteSize === "number" && Number.isFinite(item.byteSize) ? Math.max(0, Math.min(10 * 1024 * 1024, Math.round(item.byteSize))) : 0,
      pageCount: typeof item.pageCount === "number" && Number.isInteger(item.pageCount) ? Math.max(1, Math.min(10_000, item.pageCount)) : null,
      pages,
      extractedAt: boundedText(item.extractedAt, 40) || new Date(0).toISOString(),
      truncated: Boolean(item.truncated) || pages.length < item.pages.length,
      warnings: warningList,
    });
  }

  return documents;
}

function cleanSectionTitle(text: string): string | null {
  const line = text.trim().split("\n").find((candidate) => candidate.trim().length > 0)?.trim() ?? "";
  const markdown = line.match(/^#{1,4}\s+(.{3,100})$/);
  const numbered = line.match(/^(?:unit|module|chapter|section|topic)\s*(?:[\d.]+|[ivxlcdm]+)?\s*[:.)-]\s*(.{3,100})$/i);
  const shortCaps = line.length >= 4 && line.length <= 88 && line === line.toLocaleUpperCase() && /[A-Z]/.test(line);
  const heading = markdown?.[1] ?? numbered?.[1] ?? (shortCaps ? line : null);
  return heading?.replace(/\s+/g, " ").trim() || null;
}

function splitAtWordBoundary(text: string, maxLength: number): string[] {
  const normalized = text.replace(/\r\n?/g, "\n").replace(/[\t ]+/g, " ").trim();
  const chunks: string[] = [];
  let start = 0;
  while (start < normalized.length) {
    let end = Math.min(start + maxLength, normalized.length);
    if (end < normalized.length) {
      const boundary = normalized.lastIndexOf(" ", end);
      if (boundary > start + maxLength * 0.65) end = boundary;
    }
    const part = normalized.slice(start, end).trim();
    if (part) chunks.push(part);
    if (end >= normalized.length) break;
    start = Math.max(start + 1, end - MAX_CHUNK_OVERLAP);
  }
  return chunks;
}

export function createDocumentChunks(document: SourceDocument, maxChunks = 160): TutorSourceChunk[] {
  const chunks: TutorSourceChunk[] = [];
  let index = 0;
  for (const page of document.pages) {
    const sectionTitle = cleanSectionTitle(page.text) ?? "Document text";
    for (const text of splitAtWordBoundary(page.text, MAX_CHUNK_CHARS)) {
      chunks.push({
        id: `${document.id}:p${page.pageNumber ?? "text"}:c${index + 1}`,
        documentId: document.id,
        documentName: document.name,
        pageNumber: page.pageNumber,
        sectionTitle,
        text,
      });
      index += 1;
      if (chunks.length >= maxChunks) return chunks;
    }
  }
  return chunks;
}

function tokenize(value: string): string[] {
  return Array.from(new Set((value.toLocaleLowerCase().match(/[\p{L}\p{N}]{2,}/gu) ?? [])
    .filter((token) => !STOP_WORDS.has(token))));
}

/** Local lexical retrieval keeps source content in the learner's browser until relevant chunks are needed. */
export function retrieveRelevantChunks(
  question: string,
  documents: readonly SourceDocument[],
  limit = 6,
): TutorSourceChunk[] {
  const terms = tokenize(question);
  const candidates = documents.flatMap((document) => createDocumentChunks(document));
  const scored = candidates.map((chunk, index) => {
    const text = chunk.text.toLocaleLowerCase();
    const title = `${chunk.documentName} ${chunk.sectionTitle}`.toLocaleLowerCase();
    const score = terms.reduce((total, term) => {
      const occurrences = text.split(term).length - 1;
      return total + Math.min(occurrences, 4) + (title.includes(term) ? 2 : 0);
    }, 0);
    return { chunk, score, index };
  });
  const matches = scored.filter((item) => item.score > 0).sort((a, b) => b.score - a.score || a.index - b.index);
  const selected = matches.length > 0 ? matches : scored;
  return selected.slice(0, Math.max(1, Math.min(8, limit))).map((item) => item.chunk);
}

export function normalizeEvidenceText(value: string): string {
  return value.normalize("NFKC").toLocaleLowerCase().replace(/\s+/g, " ").trim();
}

export function evidenceIsPresent(sourceText: string, evidence: string): boolean {
  const source = normalizeEvidenceText(sourceText);
  const quote = normalizeEvidenceText(evidence);
  return quote.length >= 8 && quote.length <= 240 && source.includes(quote);
}

function validSourceReference(value: unknown, documents: readonly SourceDocument[]): value is DocumentSourceReference {
  if (value === null || typeof value !== "object" || Array.isArray(value)) return false;
  const ref = value as Record<string, unknown>;
  if (typeof ref.documentId !== "string" || typeof ref.evidence !== "string") return false;
  const document = documents.find((candidate) => candidate.id === ref.documentId);
  if (!document || !ref.evidence.trim() || ref.evidence.length > 240) return false;
  if (document.mimeType === "application/pdf") {
    if (!Number.isInteger(ref.pageStart) || !Number.isInteger(ref.pageEnd)) return false;
    if ((ref.pageStart as number) < 1 || (ref.pageEnd as number) < (ref.pageStart as number)) return false;
    const pages = document.pages.filter((page) => page.pageNumber !== null && page.pageNumber >= (ref.pageStart as number) && page.pageNumber <= (ref.pageEnd as number));
    if (!pages.length || !pages.some((page) => evidenceIsPresent(page.text, ref.evidence as string))) return false;
  } else if (ref.pageStart !== undefined || ref.pageEnd !== undefined) {
    return false;
  } else if (!document.pages.some((page) => evidenceIsPresent(page.text, ref.evidence as string))) {
    return false;
  }
  return true;
}

function boundedStringList(value: unknown, min: number, max: number, length: number): value is string[] {
  return Array.isArray(value) && value.length >= min && value.length <= max && value.every((item) => typeof item === "string" && item.trim().length > 0 && item.length <= length);
}

/** Checks the complete intelligence object, including every document/page quote. */
export function validateDocumentKnowledge(value: unknown, documents: readonly SourceDocument[]): value is DocumentKnowledgeRepresentation {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const data = value as Record<string, unknown>;
  if (typeof data.title !== "string" || !data.title.trim() || data.title.length > 180) return false;
  if (typeof data.summary !== "string" || !data.summary.trim() || data.summary.length > 1200) return false;
  if (!Array.isArray(data.topics) || data.topics.length > 32) return false;
  for (const raw of data.topics) {
    if (!raw || typeof raw !== "object" || Array.isArray(raw)) return false;
    const topic = raw as Record<string, unknown>;
    if (typeof topic.name !== "string" || !topic.name.trim() || topic.name.length > 120) return false;
    if (!boundedStringList(topic.subtopics, 0, 12, 120) || !boundedStringList(topic.keyConcepts, 0, 12, 160) || !boundedStringList(topic.prerequisites, 0, 12, 120)) return false;
    if (!Array.isArray(topic.sources) || topic.sources.length < 1 || topic.sources.length > 4 || !topic.sources.every((source) => validSourceReference(source, documents))) return false;
  }
  if (!Array.isArray(data.keyConcepts) || data.keyConcepts.length > 30 || !data.keyConcepts.every((raw) => {
    if (!raw || typeof raw !== "object" || Array.isArray(raw)) return false;
    const concept = raw as Record<string, unknown>;
    return typeof concept.name === "string" && concept.name.trim().length > 0 && concept.name.length <= 160 && validSourceReference(concept.source, documents);
  })) return false;
  if (!boundedStringList(data.learningSequence, 0, 32, 120) || !boundedStringList(data.warnings, 0, 8, 220)) return false;

  const definitions = Array.isArray(data.definitions) ? data.definitions : null;
  if (!definitions || definitions.length > 24 || !definitions.every((raw) => {
    if (!raw || typeof raw !== "object" || Array.isArray(raw)) return false;
    const item = raw as Record<string, unknown>;
    return typeof item.term === "string" && item.term.trim().length > 0 && item.term.length <= 120 && typeof item.definition === "string" && item.definition.trim().length > 0 && item.definition.length <= 500 && validSourceReference(item.source, documents);
  })) return false;

  const formulas = Array.isArray(data.formulas) ? data.formulas : null;
  if (!formulas || formulas.length > 16 || !formulas.every((raw) => {
    if (!raw || typeof raw !== "object" || Array.isArray(raw)) return false;
    const item = raw as Record<string, unknown>;
    return typeof item.name === "string" && item.name.trim().length > 0 && item.name.length <= 120 && typeof item.formula === "string" && item.formula.trim().length > 0 && item.formula.length <= 240 && typeof item.explanation === "string" && item.explanation.trim().length > 0 && item.explanation.length <= 500 && validSourceReference(item.source, documents);
  })) return false;

  const examples = Array.isArray(data.examples) ? data.examples : null;
  if (!examples || examples.length > 12 || !examples.every((raw) => {
    if (!raw || typeof raw !== "object" || Array.isArray(raw)) return false;
    const item = raw as Record<string, unknown>;
    return typeof item.title === "string" && item.title.trim().length > 0 && item.title.length <= 120 && typeof item.description === "string" && item.description.trim().length > 0 && item.description.length <= 600 && validSourceReference(item.source, documents);
  })) return false;

  const questions = Array.isArray(data.practiceQuestions) ? data.practiceQuestions : null;
  if (!questions || questions.length > 12 || !questions.every((raw) => {
    if (!raw || typeof raw !== "object" || Array.isArray(raw)) return false;
    const item = raw as Record<string, unknown>;
    return typeof item.prompt === "string" && item.prompt.trim().length > 0 && item.prompt.length <= 500 && typeof item.answer === "string" && item.answer.trim().length > 0 && item.answer.length <= 500 && typeof item.explanation === "string" && item.explanation.trim().length > 0 && item.explanation.length <= 600 && validSourceReference(item.source, documents);
  })) return false;
  return data.analysisMode === "provider" || data.analysisMode === "local-outline";
}

export function buildLocalKnowledgeRepresentation(
  title: string,
  documents: readonly SourceDocument[],
  truncated = false,
  providerUnavailable = false,
): DocumentKnowledgeRepresentation {
  const topics: DocumentKnowledgeRepresentation["topics"] = [];
  const seen = new Set<string>();
  for (const document of documents) {
    for (const page of document.pages) {
      const lines = page.text.split(/\n+/).map((line) => line.trim()).filter(Boolean);
      for (const line of lines) {
        const match = line.match(/^(?:unit|module|chapter|section|topic)\s*(?:[\d.]+|[ivxlcdm]+)?\s*[:.)-]\s*(.{3,100})$/i)
          ?? line.match(/^\d{1,2}(?:\.\d+)*[.)]?\s+([A-Z][^.!?]{3,90})$/);
        const name = (match?.[1] ?? "").replace(/[.;:]$/, "").trim();
        const key = name.toLocaleLowerCase();
        if (!name || seen.has(key) || name.length > 120) continue;
        seen.add(key);
        topics.push({
          name,
          subtopics: [],
          keyConcepts: [],
          prerequisites: [],
          sources: [{
            documentId: document.id,
            ...(page.pageNumber ? { pageStart: page.pageNumber, pageEnd: page.pageNumber } : {}),
            evidence: line.slice(0, 240),
          }],
        });
        if (topics.length >= 32) break;
      }
      if (topics.length >= 32) break;
    }
  }
  const warnings = documents.flatMap((document) => document.warnings);
  if (truncated || documents.some((document) => document.truncated)) warnings.push("Only the extracted portion within the processing limit was analyzed.");
  warnings.push(`${providerUnavailable ? "Configured AI providers did not return validated analysis." : "No AI provider is configured."} This outline contains only headings detected locally; it does not estimate definitions, examples, prerequisites, or exam weight.`);
  return {
    title: boundedText(title, 180) || "Course materials",
    summary: topics.length
      ? `A local outline detected ${topics.length} explicit topic heading${topics.length === 1 ? "" : "s"} in the uploaded material.`
      : "Text was extracted, but no reliable topic headings were detected locally.",
    topics,
    keyConcepts: [],
    definitions: [],
    formulas: [],
    examples: [],
    learningSequence: topics.map((topic) => topic.name),
    practiceQuestions: [],
    warnings: Array.from(new Set(warnings)).slice(0, 8),
    analysisMode: "local-outline",
  };
}
