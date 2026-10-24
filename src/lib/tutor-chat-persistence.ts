import type { TutorCitation, TutorChatMessage, TutorConversationState } from "@/types/document";

const MAX_MESSAGES = 60;
const MAX_SERIALIZED_CHARS = 240_000;

export interface TutorChatStorageLike {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

export function getTutorChatStorageKey(studentName: string): string {
  let hash = 2166136261;
  for (const char of studentName.trim().toLocaleLowerCase()) {
    hash ^= char.charCodeAt(0);
    hash = Math.imul(hash, 16777619);
  }
  return `learnos_tutor_chat_v1:${(hash >>> 0).toString(36)}`;
}

function string(value: unknown, max: number): string {
  return typeof value === "string" ? value.replace(/\0/g, "").trim().slice(0, max) : "";
}

function normalizeCitation(value: unknown): TutorCitation | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const item = value as Record<string, unknown>;
  const documentId = string(item.documentId, 80);
  const documentName = string(item.documentName, 180);
  const sectionTitle = string(item.sectionTitle, 100);
  const excerpt = string(item.excerpt, 240);
  const pageNumber = item.pageNumber === null ? null : typeof item.pageNumber === "number" && Number.isInteger(item.pageNumber) && item.pageNumber > 0 ? item.pageNumber : null;
  if (!documentId || !documentName || !excerpt) return null;
  return { documentId, documentName, pageNumber, sectionTitle, excerpt };
}

export function normalizeTutorConversation(value: unknown): TutorConversationState {
  if (!value || typeof value !== "object" || Array.isArray(value)) return { version: 1, messages: [] };
  const raw = value as Record<string, unknown>;
  if (!Array.isArray(raw.messages)) return { version: 1, messages: [] };
  const messages: TutorChatMessage[] = raw.messages.slice(-MAX_MESSAGES).flatMap((entry) => {
    if (!entry || typeof entry !== "object" || Array.isArray(entry)) return [];
    const item = entry as Record<string, unknown>;
    const id = string(item.id, 100);
    const content = string(item.content, 2_800);
    const role = item.role === "user" || item.role === "assistant" ? item.role : null;
    if (!id || !content || !role) return [];
    const answerType = item.answerType === "source" || item.answerType === "general" || item.answerType === "unsupported" ? item.answerType : undefined;
    const citations = Array.isArray(item.citations) ? item.citations.slice(0, 6).map(normalizeCitation).filter((citation): citation is TutorCitation => Boolean(citation)) : undefined;
    const createdAt = string(item.createdAt, 40) || new Date(0).toISOString();
    const suggestedPrompt = string(item.suggestedPrompt, 180) || undefined;
    return [{ id, content, role, createdAt, answerType, citations, suggestedPrompt }];
  });
  return { version: 1, messages };
}

export function loadTutorConversation(storage: TutorChatStorageLike, key: string): TutorConversationState {
  try {
    const raw = storage.getItem(key);
    if (!raw || raw.length > MAX_SERIALIZED_CHARS) return { version: 1, messages: [] };
    return normalizeTutorConversation(JSON.parse(raw));
  } catch {
    return { version: 1, messages: [] };
  }
}

export function saveTutorConversation(storage: TutorChatStorageLike, key: string, value: TutorConversationState): boolean {
  try {
    const normalized = normalizeTutorConversation(value);
    const serialized = JSON.stringify(normalized);
    if (serialized.length > MAX_SERIALIZED_CHARS) return false;
    storage.setItem(key, serialized);
    return true;
  } catch {
    return false;
  }
}

export function clearTutorConversation(storage: TutorChatStorageLike, key: string): boolean {
  try {
    storage.removeItem(key);
    return true;
  } catch {
    return false;
  }
}
