"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { useAuth } from "@/context/auth-context";
import { normalizeSourceDocuments } from "@/lib/document-intelligence";
import { getScopedDocumentStorageKey, loadDocumentLibrary, saveDocumentLibrary } from "@/lib/document-persistence";
import type { SourceDocument } from "@/types/document";

interface DocumentContextValue {
  documents: SourceDocument[];
  selectedDocumentId: string;
  focusedSource: { documentId: string; pageNumber: number | null } | null;
  documentsReady: boolean;
  documentsError: boolean;
  setSelectedDocumentId: (id: string) => void;
  setFocusedSource: (source: { documentId: string; pageNumber: number | null } | null) => void;
  addDocuments: (items: SourceDocument[]) => boolean;
  removeDocument: (id: string) => void;
  clearDocuments: () => void;
}

const DocumentContext = createContext<DocumentContextValue | null>(null);

export function DocumentProvider({ children }: { children: ReactNode }) {
  const { studentName } = useAuth();
  const storageKey = useMemo(() => getScopedDocumentStorageKey(studentName), [studentName]);
  const [documents, setDocuments] = useState<SourceDocument[]>([]);
  const [selectedDocumentId, setSelectedDocumentIdValue] = useState("all");
  const [focusedSource, setFocusedSource] = useState<{ documentId: string; pageNumber: number | null } | null>(null);
  const [hydratedStorageKey, setHydratedStorageKey] = useState<string | null>(null);
  const documentsReady = hydratedStorageKey === storageKey;
  const [documentsError, setDocumentsError] = useState(false);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      try {
        const loaded = loadDocumentLibrary(window.localStorage, storageKey);
        setDocuments(loaded.documents);
        setSelectedDocumentIdValue(loaded.selectedDocumentId);
        setDocumentsError(false);
      } catch {
        setDocuments([]);
        setSelectedDocumentIdValue("all");
        setDocumentsError(true);
      }
      setHydratedStorageKey(storageKey);
    }, 0);
    return () => window.clearTimeout(timer);
  }, [storageKey]);

  const persist = useCallback((nextDocuments: SourceDocument[], selectedId: string) => {
    let saved = false;
    try {
      saved = saveDocumentLibrary(window.localStorage, {
        version: 1,
        documents: nextDocuments,
        selectedDocumentId: selectedId,
      }, storageKey);
    } catch {
      saved = false;
    }
    setDocumentsError(!saved);
    return saved;
  }, [storageKey]);

  const setSelectedDocumentId = useCallback((id: string) => {
    const safeId = id === "all" || documents.some((document) => document.id === id) ? id : "all";
    setSelectedDocumentIdValue(safeId);
    if (documentsReady) persist(documents, safeId);
  }, [documents, documentsReady, persist]);

  const addDocuments = useCallback((incoming: SourceDocument[]) => {
    const current = documents.filter((document) => !incoming.some((next) => next.id === document.id));
    const merged = normalizeSourceDocuments([...current, ...incoming]).slice(-12);
    const selectedId = "all";
    const saved = persist(merged, selectedId);
    setDocuments(merged);
    setSelectedDocumentIdValue(selectedId);
    return saved;
  }, [documents, persist]);

  const removeDocument = useCallback((id: string) => {
    const next = documents.filter((document) => document.id !== id);
    const selectedId = selectedDocumentId === id ? "all" : selectedDocumentId;
    persist(next, selectedId);
    setDocuments(next);
    setSelectedDocumentIdValue(selectedId);
  }, [documents, persist, selectedDocumentId]);

  const clearDocuments = useCallback(() => {
    persist([], "all");
    setDocuments([]);
    setSelectedDocumentIdValue("all");
  }, [persist]);

  const value = useMemo<DocumentContextValue>(() => ({
    documents: documentsReady ? documents : [],
    selectedDocumentId: documentsReady ? selectedDocumentId : "all",
    focusedSource: documentsReady ? focusedSource : null,
    documentsReady,
    documentsError: documentsReady && documentsError,
    setSelectedDocumentId,
    setFocusedSource,
    addDocuments,
    removeDocument,
    clearDocuments,
  }), [documents, selectedDocumentId, focusedSource, documentsReady, documentsError, setSelectedDocumentId, setFocusedSource, addDocuments, removeDocument, clearDocuments]);

  return <DocumentContext.Provider value={value}>{children}</DocumentContext.Provider>;
}

export function useDocuments() {
  const context = useContext(DocumentContext);
  if (!context) throw new Error("useDocuments must be used inside DocumentProvider.");
  return context;
}
