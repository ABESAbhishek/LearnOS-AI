import { PDFParse } from "pdf-parse";
import type { SourceDocumentPage } from "@/types/document";

export interface PDFExtractionResult {
  text: string;
  charCount: number;
  pageCount: number;
  pages: SourceDocumentPage[];
  success: boolean;
  truncated: boolean;
  title?: string;
  metadata?: { author?: string; subject?: string; createdAt?: string };
  warnings: string[];
  error?: string;
}

const MAX_PDF_PAGES = 240;
const MAX_EXTRACTED_CHARS = 240_000;

function cleanPageText(value: string): string {
  return value
    .replace(/\r\n?/g, "\n")
    .replace(/[\t ]+/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

/** Extracts bounded, page-preserving text; malformed, encrypted, and scanned PDFs remain explicit failures. */
export async function extractTextFromPDF(buffer: Buffer): Promise<PDFExtractionResult> {
  if (buffer.length < 8) {
    return { text: "", charCount: 0, pageCount: 0, pages: [], success: false, truncated: false, warnings: [], error: "The selected file is too small to be a valid PDF." };
  }

  // ISO 32000-1 §7.5.2: Header %PDF- must appear within the first 1024 bytes.
  // Strip any leading UTF-8 BOM (\xEF\xBB\xBF), whitespace, or export headers.
  let pdfBuffer = buffer;
  const headerOffset = pdfBuffer.indexOf("%PDF");
  if (headerOffset === -1 || headerOffset > 1024) {
    return { text: "", charCount: 0, pageCount: 0, pages: [], success: false, truncated: false, warnings: [], error: "The selected file does not have a valid PDF signature." };
  }
  if (headerOffset > 0) {
    pdfBuffer = pdfBuffer.subarray(headerOffset);
  }

  let parser: PDFParse | null = null;
  try {
    parser = new PDFParse({ data: pdfBuffer });
    const result = await parser.getText({ first: MAX_PDF_PAGES });
    const info = await parser.getInfo().catch(() => null);
    const pageCount = typeof result.total === "number" && result.total > 0 ? result.total : result.pages.length;
    let remaining = MAX_EXTRACTED_CHARS;
    const pages: SourceDocumentPage[] = [];

    for (const page of result.pages) {
      if (remaining <= 0) break;
      const pageText = cleanPageText(typeof page.text === "string" ? page.text : "");
      if (!pageText) continue;
      const bounded = pageText.slice(0, remaining);
      pages.push({ pageNumber: Number.isInteger(page.num) && page.num > 0 ? page.num : pages.length + 1, text: bounded });
      remaining -= bounded.length;
    }

    const text = pages.map((page) => `${page.pageNumber ? `[[PAGE ${page.pageNumber}]]\n` : ""}${page.text}`).join("\n\n");
    const charCount = pages.reduce((sum, page) => sum + page.text.length, 0);
    const truncated = pageCount > result.pages.length || charCount >= MAX_EXTRACTED_CHARS;
    const warnings = truncated
      ? [`Only the first ${Math.min(MAX_PDF_PAGES, result.pages.length)} pages or ${MAX_EXTRACTED_CHARS.toLocaleString()} extracted characters were retained.`]
      : [];
    const infoFields = info?.info && typeof info.info === "object" ? info.info as Record<string, unknown> : {};
    const metadataTitle = typeof infoFields.Title === "string" ? infoFields.Title.trim().slice(0, 180) : "";
    const metadata = {
      author: typeof infoFields.Author === "string" ? infoFields.Author.trim().slice(0, 120) : undefined,
      subject: typeof infoFields.Subject === "string" ? infoFields.Subject.trim().slice(0, 180) : undefined,
      createdAt: typeof infoFields.CreationDate === "string" ? infoFields.CreationDate.trim().slice(0, 40) : undefined,
    };

    if (charCount < 20) {
      return {
        text,
        charCount,
        pageCount,
        pages,
        success: false,
        truncated,
        warnings,
        error: "No selectable text was found. Scanned or image-only PDFs require OCR, which is not configured in this project.",
      };
    }
    return { text, charCount, pageCount, pages, success: true, truncated, title: metadataTitle || undefined, metadata, warnings };
  } catch (error) {
    const rawMessage = error instanceof Error ? error.message : String(error || "");
    const lowerMessage = rawMessage.toLowerCase();
    let detail = "The PDF is malformed, encrypted, or could not be parsed.";
    if (lowerMessage.includes("password") || lowerMessage.includes("encrypt") || lowerMessage.includes("decrypt")) {
      detail = "The PDF is encrypted or password-protected. Please remove password protection before uploading.";
    } else if (lowerMessage.includes("bad xref") || lowerMessage.includes("xref") || lowerMessage.includes("corrupt")) {
      detail = "The PDF file structure or cross-reference table is corrupted.";
    } else if (rawMessage) {
      detail = `PDF could not be parsed. ${rawMessage.slice(0, 160)}`;
    }
    return { text: "", charCount: 0, pageCount: 0, pages: [], success: false, truncated: false, warnings: [], error: detail };
  } finally {
    if (parser) await parser.destroy().catch(() => {});
  }
}
