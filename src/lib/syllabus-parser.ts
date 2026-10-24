import {
  type AnalyzedTopic,
  type SyllabusAnalysisData,
  type CourseModel,
  type CourseTopic,
} from "@/types/course";

/**
 * Detects the academic subject name from syllabus text and/or file name.
 */
export function detectSubject(text: string, fileName?: string): string {
  const cleanFileName = fileName
    ? fileName
        .replace(/\.[^/.]+$/, "")
        .replace(/[-_]/g, " ")
        .replace(/syllabus|curriculum|course|notes|draft|final/gi, "")
        .trim()
    : "";

  const lowerText = text.toLowerCase();
  const lowerFileName = (fileName || "").toLowerCase();

  // 1. Explicit syllabus header patterns (e.g. "Course Title: English Literature")
  const headerMatch = text.match(
    /(?:course\s*(?:title|name)?|subject|curriculum)\s*[:\-]\s*([A-Za-z0-9\s&,/'-]{3,50})/i
  );
  if (headerMatch && headerMatch[1]) {
    const rawSubject = headerMatch[1].trim();
    if (rawSubject.length > 2 && rawSubject.length < 50 && !rawSubject.includes("\n")) {
      return capitalizeWords(rawSubject);
    }
  }

  // 2. Keyword-based subject detection
  if (
    lowerFileName.includes("english") ||
    lowerFileName.includes("literature") ||
    lowerText.includes("shakespeare") ||
    lowerText.includes("romantic poetry") ||
    lowerText.includes("victorian literature") ||
    lowerText.includes("literary devices") ||
    lowerText.includes("poetic forms")
  ) {
    return "English Literature";
  }

  if (
    lowerFileName.includes("constitution") ||
    lowerFileName.includes("polity") ||
    lowerText.includes("preamble") ||
    lowerText.includes("fundamental rights") ||
    lowerText.includes("directive principles") ||
    lowerText.includes("judiciary") ||
    lowerText.includes("lok sabha") ||
    lowerText.includes("supreme court")
  ) {
    return "Indian Constitution";
  }

  if (
    lowerFileName.includes("operating") ||
    lowerFileName.includes("os") ||
    lowerText.includes("cpu scheduling") ||
    lowerText.includes("process synchronization") ||
    lowerText.includes("virtual memory") ||
    lowerText.includes("deadlocks") ||
    lowerText.includes("system calls")
  ) {
    return "Operating Systems";
  }

  if (
    lowerFileName.includes("dbms") ||
    lowerFileName.includes("database") ||
    lowerText.includes("relational model") ||
    lowerText.includes("sql queries") ||
    lowerText.includes("acid properties") ||
    lowerText.includes("normalization")
  ) {
    return "Database Management Systems";
  }

  if (
    lowerFileName.includes("network") ||
    lowerText.includes("tcp/ip") ||
    lowerText.includes("osi model") ||
    lowerText.includes("routing algorithms") ||
    lowerText.includes("packet switching")
  ) {
    return "Computer Networks";
  }

  if (
    lowerFileName.includes("dsa") ||
    lowerFileName.includes("algorithm") ||
    lowerText.includes("data structures") ||
    lowerText.includes("binary search") ||
    lowerText.includes("breadth-first search") ||
    lowerText.includes("linked list")
  ) {
    return "Data Structures & Algorithms";
  }

  // 3. Clean file name fallback
  if (cleanFileName.length >= 3) {
    return capitalizeWords(cleanFileName);
  }

  // 4. Document first line fallback
  const firstLines = text
    .split("\n")
    .map((l) => l.trim())
    .filter((l) => l.length > 3 && l.length < 60);

  if (firstLines.length > 0 && !firstLines[0].toLowerCase().includes("syllabus")) {
    return capitalizeWords(firstLines[0]);
  }

  return "Custom Curriculum";
}

function capitalizeWords(str: string): string {
  return str
    .split(/\s+/)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(" ");
}

/**
 * Extracts topics from document text using heading patterns.
 */
function extractTopicsFromText(text: string): AnalyzedTopic[] {
  const topics: AnalyzedTopic[] = [];
  const seen = new Set<string>();

  // Look for Unit / Module / Chapter / Part lines
  const headingRegex = /(?:unit|module|chapter|part|section|topic)\s*(?:[0-9ivxlcdm]+)?\s*[:\-\.]\s*([A-Za-z0-9\s&,/'-]{3,50})/gi;
  let match: RegExpExecArray | null;
  while ((match = headingRegex.exec(text)) !== null && topics.length < 8) {
    const raw = match[1].trim();
    const clean = capitalizeWords(raw.replace(/[;\.,]+$/, ""));
    const key = clean.toLowerCase();
    if (clean.length >= 4 && !seen.has(key)) {
      seen.add(key);
      topics.push({
        name: clean,
        difficulty: "Intermediate",
        priority: "Medium",
        frequency: 1,
      });
    }
  }

  // If no unit/module headings found, look for bullet points or numbered lists
  if (topics.length < 3) {
    const listRegex = /^(?:[0-9]{1,2}\.|[IVXLCDM]+\.|\*|\-|\•)\s+([A-Z][A-Za-z0-9\s&,/'-]{4,50})/gm;
    while ((match = listRegex.exec(text)) !== null && topics.length < 8) {
      const raw = match[1].trim();
      const clean = capitalizeWords(raw.replace(/[;\.,]+$/, ""));
      const key = clean.toLowerCase();
      if (clean.length >= 4 && !seen.has(key)) {
        seen.add(key);
        topics.push({
          name: clean,
          difficulty: "Intermediate",
          priority: "Medium",
          frequency: 1,
        });
      }
    }
  }

  return topics;
}

/**
 * Provides a transparent local outline when no provider returns validated analysis.
 * Only explicit headings and list items from the supplied text become topics.
 */
export function parseSyllabusLocally(
  text: string,
  fileName?: string
): {
  data: SyllabusAnalysisData;
  courseModel: CourseModel;
  detectedSubject: string;
} {
  const detectedSubject = detectSubject(text, fileName);

  const extractedTopics = extractTopicsFromText(text);
  const conceptsCount = 0;

  const data: SyllabusAnalysisData = {
    courseName: detectedSubject,
    subject: detectedSubject,
    topics: extractedTopics,
    concepts: conceptsCount,
    priorityAreas: 0,
    pyqCount: 0,
    summary: extractedTopics.length
      ? `A local text scan found ${extractedTopics.length} explicit topic heading${extractedTopics.length === 1 ? "" : "s"} for ${detectedSubject}. Difficulty, prerequisites, and exam weight were not assessed.`
      : `Text was extracted for ${detectedSubject}, but no reliable topic headings were detected locally.`,
  };

  const courseTopics: CourseTopic[] = extractedTopics.map((t, idx) => {
    return {
      name: t.name,
      subtopics: [],
      difficulty: "Intermediate",
      prerequisites: [],
      importance: "Medium",
      studyOrder: idx + 1,
      frequency: 1,
    };
  });

  const courseModel: CourseModel = {
    courseName: detectedSubject,
    description: data.summary,
    topics: courseTopics,
    totalTopics: courseTopics.length,
    totalSubtopics: 0,
    highPriorityCount: 0,
  };

  return {
    data,
    courseModel,
    detectedSubject,
  };
}
