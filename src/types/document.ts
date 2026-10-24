import type { AISource } from "@/lib/ai/types";

export interface SourceDocumentPage {
  /** Physical PDF page number. Text files do not have a reliable page number. */
  pageNumber: number | null;
  text: string;
}

export interface SourceDocument {
  id: string;
  name: string;
  title?: string;
  metadata?: { author?: string; subject?: string; createdAt?: string };
  mimeType: "application/pdf" | "text/plain";
  byteSize: number;
  pageCount: number | null;
  pages: SourceDocumentPage[];
  extractedAt: string;
  truncated: boolean;
  warnings: string[];
}

export interface DocumentTopicInsight {
  name: string;
  subtopics: string[];
  keyConcepts: string[];
  prerequisites: string[];
  sources: DocumentSourceReference[];
}

export interface DocumentSourceReference {
  documentId: string;
  pageStart?: number;
  pageEnd?: number;
  evidence: string;
}

export interface DocumentDefinition {
  term: string;
  definition: string;
  source: DocumentSourceReference;
}

export interface DocumentKeyConcept {
  name: string;
  source: DocumentSourceReference;
}

export interface DocumentFormula {
  name: string;
  formula: string;
  explanation: string;
  source: DocumentSourceReference;
}

export interface DocumentExample {
  title: string;
  description: string;
  source: DocumentSourceReference;
}

export interface DocumentPracticeQuestion {
  prompt: string;
  answer: string;
  explanation: string;
  source: DocumentSourceReference;
}

export interface DocumentKnowledgeRepresentation {
  title: string;
  summary: string;
  topics: DocumentTopicInsight[];
  keyConcepts: DocumentKeyConcept[];
  definitions: DocumentDefinition[];
  formulas: DocumentFormula[];
  examples: DocumentExample[];
  learningSequence: string[];
  practiceQuestions: DocumentPracticeQuestion[];
  warnings: string[];
  analysisMode: "provider" | "local-outline";
}

export interface DocumentAnalysisResult {
  documents: SourceDocument[];
  knowledge: DocumentKnowledgeRepresentation;
}

export interface TutorSourceChunk {
  id: string;
  documentId: string;
  documentName: string;
  pageNumber: number | null;
  sectionTitle: string;
  text: string;
}

export interface TutorCitation {
  documentId: string;
  documentName: string;
  pageNumber: number | null;
  sectionTitle: string;
  excerpt: string;
}

export interface TutorChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  createdAt: string;
  answerType?: "source" | "general" | "unsupported";
  citations?: TutorCitation[];
  suggestedPrompt?: string;
}

export interface TutorConversationState {
  version: 1;
  messages: TutorChatMessage[];
}

export interface TutorPracticeOutcome {
  topic: string;
  activityType: "tutor-practice" | "note2learn-quiz";
  outcome: "correct" | "review";
}

export interface TutorChatRequest {
  question: string;
  history: Array<{ role: "user" | "assistant"; content: string }>;
  topic?: string;
  route?: string;
  objective?: string;
  weakestTopic?: string;
  weakestMastery?: number;
  recentPractice?: TutorPracticeOutcome[];
  sourceMode: "general" | "documents";
  sources: TutorSourceChunk[];
}

export interface TutorChatResponse {
  answer: string;
  answerType: "source" | "general" | "unsupported";
  citations: TutorCitation[];
  suggestedPrompt?: string;
  source: AISource;
  model?: string;
  latencyMs?: number;
  message: string;
}
