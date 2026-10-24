import { MAX_DOCUMENTS, normalizeSourceDocuments } from "./document-intelligence.ts";
import type { SourceDocument } from "@/types/document";

export const DOCUMENT_STORAGE_KEY = "learnos_document_library_v1";
const MAX_SERIALIZED_CHARS = 2_200_000;

export interface DocumentLibraryState {
  version: 1;
  selectedDocumentId: string;
  documents: SourceDocument[];
}

export interface DocumentStorageLike {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

export function normalizeDocumentLibrary(value: unknown): DocumentLibraryState {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return { version: 1, selectedDocumentId: "all", documents: [] };
  }
  const raw = value as Record<string, unknown>;
  const documents = normalizeSourceDocuments(raw.documents).slice(-MAX_DOCUMENTS);
  const requestedId = typeof raw.selectedDocumentId === "string" ? raw.selectedDocumentId.slice(0, 80) : "all";
  const selectedDocumentId = requestedId === "all" || documents.some((document) => document.id === requestedId)
    ? requestedId
    : "all";
  return { version: 1, selectedDocumentId, documents };
}

export function getScopedDocumentStorageKey(studentName: string): string {
  let hash = 2166136261;
  for (const char of studentName.trim().toLocaleLowerCase()) {
    hash ^= char.charCodeAt(0);
    hash = Math.imul(hash, 16777619);
  }
  return `${DOCUMENT_STORAGE_KEY}:${(hash >>> 0).toString(36)}`;
}

export function loadDocumentLibrary(storage: DocumentStorageLike, key = DOCUMENT_STORAGE_KEY): DocumentLibraryState {
  const raw = storage.getItem(key);
  if (!raw) return { version: 1, selectedDocumentId: "all", documents: [] };
  if (raw.length > MAX_SERIALIZED_CHARS) {
    return { version: 1, selectedDocumentId: "all", documents: [] };
  }
  try {
    return normalizeDocumentLibrary(JSON.parse(raw));
  } catch {
    return { version: 1, selectedDocumentId: "all", documents: [] };
  }
}

export function saveDocumentLibrary(storage: DocumentStorageLike, value: DocumentLibraryState, key = DOCUMENT_STORAGE_KEY): boolean {
  const normalized = normalizeDocumentLibrary(value);
  const serialized = JSON.stringify(normalized);
  if (serialized.length > MAX_SERIALIZED_CHARS) return false;
  try {
    storage.setItem(key, serialized);
    return true;
  } catch {
    return false;
  }
}

export function clearDocumentLibrary(storage: DocumentStorageLike, key = DOCUMENT_STORAGE_KEY): boolean {
  try {
    storage.removeItem(key);
    return true;
  } catch {
    return false;
  }
}
