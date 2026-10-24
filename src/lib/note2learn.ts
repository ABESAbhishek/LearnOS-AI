import type { NoteQuizQuestion } from "@/types/learning";

export interface GeneratedFlashcard {
  front: string;
  back: string;
}

export interface GeneratedNoteContent {
  topic: string;
  summary: string;
  flashcards: GeneratedFlashcard[];
  quiz: Array<Omit<NoteQuizQuestion, "id">>;
}

export function validateGeneratedNoteContent(value: unknown): value is GeneratedNoteContent {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const data = value as Record<string, unknown>;
  if (typeof data.topic !== "string" || data.topic.trim().length === 0 || data.topic.length > 160) return false;
  if (typeof data.summary !== "string" || data.summary.trim().length < 20 || data.summary.length > 8_000) return false;
  if (!Array.isArray(data.flashcards) || data.flashcards.length < 3 || data.flashcards.length > 10) return false;
  if (!data.flashcards.every((item) => {
    if (!item || typeof item !== "object") return false;
    const card = item as Record<string, unknown>;
    return typeof card.front === "string" && card.front.trim().length > 0 && card.front.length <= 500 &&
      typeof card.back === "string" && card.back.trim().length > 0 && card.back.length <= 1_000;
  })) return false;
  if (!Array.isArray(data.quiz) || data.quiz.length !== 3) return false;
  return data.quiz.every((item) => {
    if (!item || typeof item !== "object") return false;
    const question = item as Record<string, unknown>;
    return typeof question.prompt === "string" && question.prompt.trim().length > 0 && question.prompt.length <= 800 &&
      Array.isArray(question.options) && question.options.length === 4 &&
      question.options.every((option) => typeof option === "string" && option.trim().length > 0 && option.length <= 400) &&
      typeof question.correctOption === "number" && Number.isInteger(question.correctOption) &&
      question.correctOption >= 0 && question.correctOption <= 3 &&
      typeof question.explanation === "string" && question.explanation.trim().length > 0 && question.explanation.length <= 1_000;
  });
}

export function buildBaselineNoteContent(text: string, sourceName: string): GeneratedNoteContent {
  const sentences = text
    .replace(/\s+/g, " ")
    .split(/(?<=[.!?])\s+/)
    .map((sentence) => sentence.trim())
    .filter((sentence) => sentence.length >= 20)
    .slice(0, 16);
  const usefulSentences = [...sentences];
  const baselinePrompts = [
    `Use the key terms and relationships in ${sourceName} to create a concise explanation and practice questions.`,
    `Check definitions, examples, and exceptions in ${sourceName} before applying the concepts to a new problem.`,
    `Compare each key idea from ${sourceName} with an example before moving to a new topic.`,
  ];
  for (const sentence of baselinePrompts) {
    if (usefulSentences.length >= 5) break;
    usefulSentences.push(sentence);
  }
  const title = sourceName.replace(/\.[^.]+$/, "").replace(/[_-]+/g, " ").trim();
  const topic = title.slice(0, 160) || "Study Notes";
  const summary = usefulSentences.slice(0, 4).join(" ").slice(0, 8_000);
  const selected = usefulSentences.slice(0, 5);
  const flashcards = selected.map((sentence, index) => ({
    front: `Key idea ${index + 1}: What should you remember from this note?`,
    back: sentence.slice(0, 1_000),
  }));
  const quizSentences = [...usefulSentences, ...usefulSentences].slice(0, 3);
  const quiz = quizSentences.map((sentence, index) => {
    const distractors = usefulSentences.filter((candidate) => candidate !== sentence).slice(0, 3);
    while (distractors.length < 3) distractors.push(`This detail is not stated in ${sourceName}.`);
    return {
      prompt: `Which statement is supported by ${sourceName}? (Question ${index + 1})`,
      options: [sentence.slice(0, 400), ...distractors.slice(0, 3).map((item) => item.slice(0, 400))],
      correctOption: 0,
      explanation: `The first option is taken from the extracted text. Check the source note for context.`,
    };
  });

  return { topic, summary, flashcards, quiz };
}
