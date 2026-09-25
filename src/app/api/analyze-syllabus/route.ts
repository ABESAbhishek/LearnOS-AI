import { NextRequest, NextResponse } from "next/server";
import { generateStructuredWithFallback, sanitizeErrorMessage } from "@/lib/gemini";
import {
  SYLLABUS_ANALYSIS_SYSTEM_INSTRUCTION,
  COURSE_MODEL_SCHEMA,
} from "@/lib/prompts";
import {
  BASELINE_DSA_COURSE,
  validateCourseModel,
  normalizeCourseModel,
  type CourseAnalysisResponse,
} from "@/types/course";

export const dynamic = "force-dynamic";

// Maximum upload size: 10MB
const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024;
const ALLOWED_EXTENSIONS = [".pdf", ".txt"];

export async function POST(req: NextRequest) {
  try {
    const contentType = req.headers.get("content-type") || "";

    // 1. Handle JSON payloads (e.g. sample selection or pasted text)
    if (contentType.includes("application/json")) {
      const body = await req.json().catch(() => ({}));

      if (body.useSample) {
        return NextResponse.json<CourseAnalysisResponse>({
          courseModel: BASELINE_DSA_COURSE,
          source: "baseline",
          message: "Demo DSA sample syllabus loaded successfully.",
        });
      }

      const text = typeof body.text === "string" ? body.text.trim() : "";
      if (!text) {
        return NextResponse.json(
          {
            error: "No syllabus text provided. Please provide syllabus content or upload a file.",
            source: "baseline",
          },
          { status: 400 }
        );
      }

      const prompt = `Analyze this course syllabus material and construct the structured CourseModel:\n\n${text.slice(0, 100000)}`;

      const aiResult = await generateStructuredWithFallback({
        prompt,
        systemInstruction: SYLLABUS_ANALYSIS_SYSTEM_INSTRUCTION,
        responseSchema: COURSE_MODEL_SCHEMA,
        baselineFallback: BASELINE_DSA_COURSE,
        validator: validateCourseModel,
      });

      const normalized = normalizeCourseModel(aiResult.data);
      return NextResponse.json<CourseAnalysisResponse>({
        courseModel: normalized,
        source: aiResult.source,
        message:
          aiResult.source === "gemini"
            ? `Successfully analyzed "${normalized.courseName}" using Gemini 3.8 Flash.`
            : "Fallback baseline DSA curriculum active.",
        model: aiResult.model,
        latencyMs: aiResult.latencyMs,
        error: aiResult.error,
      });
    }

    // 2. Handle multipart/form-data file uploads
    if (contentType.includes("multipart/form-data")) {
      const formData = await req.formData();
      const useSample = formData.get("useSample") === "true";

      if (useSample) {
        return NextResponse.json<CourseAnalysisResponse>({
          courseModel: BASELINE_DSA_COURSE,
          source: "baseline",
          message: "Demo DSA sample syllabus loaded successfully.",
        });
      }

      const file = formData.get("file") as File | null;
      if (!file) {
        return NextResponse.json(
          {
            error: "No file was uploaded. Please select a PDF or TXT syllabus document.",
            source: "baseline",
          },
          { status: 400 }
        );
      }

      // Check empty file
      if (file.size === 0) {
        return NextResponse.json(
          {
            error: "Uploaded file is empty (0 bytes). Please upload a valid document.",
            source: "baseline",
          },
          { status: 400 }
        );
      }

      // Check file size limit
      if (file.size > MAX_FILE_SIZE_BYTES) {
        return NextResponse.json(
          {
            error: `File size exceeds the 10MB limit (uploaded: ${(file.size / (1024 * 1024)).toFixed(1)}MB). Please upload a smaller excerpt.`,
            source: "baseline",
          },
          { status: 413 }
        );
      }

      // Check file extension
      const fileNameLower = file.name.toLowerCase();
      const hasValidExt = ALLOWED_EXTENSIONS.some((ext) => fileNameLower.endsWith(ext));

      if (!hasValidExt) {
        return NextResponse.json(
          {
            error: `Unsupported file type "${file.name}". LearnOS currently supports .pdf and .txt files.`,
            source: "baseline",
          },
          { status: 415 }
        );
      }

      const isPdf = fileNameLower.endsWith(".pdf");

      if (isPdf) {
        const buffer = Buffer.from(await file.arrayBuffer());

        // Verify PDF magic header '%PDF-'
        if (buffer.length < 5 || buffer.subarray(0, 4).toString("utf-8") !== "%PDF") {
          return NextResponse.json(
            {
              error: "The uploaded file does not appear to be a valid or readable PDF document.",
              source: "baseline",
            },
            { status: 400 }
          );
        }

        const base64Data = buffer.toString("base64");
        const contents = [
          {
            inlineData: {
              mimeType: "application/pdf",
              data: base64Data,
            },
          },
          {
            text: "Analyze the uploaded course syllabus document above and generate the comprehensive, structured CourseModel according to the schema.",
          },
        ];

        const aiResult = await generateStructuredWithFallback({
          contents,
          systemInstruction: SYLLABUS_ANALYSIS_SYSTEM_INSTRUCTION,
          responseSchema: COURSE_MODEL_SCHEMA,
          baselineFallback: BASELINE_DSA_COURSE,
          validator: validateCourseModel,
        });

        const normalized = normalizeCourseModel(aiResult.data);
        return NextResponse.json<CourseAnalysisResponse>({
          courseModel: normalized,
          source: aiResult.source,
          message:
            aiResult.source === "gemini"
              ? `Successfully analyzed "${normalized.courseName}" using Gemini 3.8 Flash.`
              : "Fallback baseline DSA curriculum active.",
          model: aiResult.model,
          latencyMs: aiResult.latencyMs,
          error: aiResult.error,
        });
      } else {
        // Plain TXT file
        const text = (await file.text()).trim();
        if (!text) {
          return NextResponse.json(
            {
              error: "The uploaded text file contains no readable text.",
              source: "baseline",
            },
            { status: 400 }
          );
        }

        const prompt = `Analyze this course syllabus material and construct the structured CourseModel:\n\n${text.slice(0, 100000)}`;

        const aiResult = await generateStructuredWithFallback({
          prompt,
          systemInstruction: SYLLABUS_ANALYSIS_SYSTEM_INSTRUCTION,
          responseSchema: COURSE_MODEL_SCHEMA,
          baselineFallback: BASELINE_DSA_COURSE,
          validator: validateCourseModel,
        });

        const normalized = normalizeCourseModel(aiResult.data);
        return NextResponse.json<CourseAnalysisResponse>({
          courseModel: normalized,
          source: aiResult.source,
          message:
            aiResult.source === "gemini"
              ? `Successfully analyzed "${normalized.courseName}" using Gemini 3.8 Flash.`
              : "Fallback baseline DSA curriculum active.",
          model: aiResult.model,
          latencyMs: aiResult.latencyMs,
          error: aiResult.error,
        });
      }
    }

    return NextResponse.json(
      {
        error: "Invalid request content-type. Expected multipart/form-data or application/json.",
        source: "baseline",
      },
      { status: 400 }
    );
  } catch (err) {
    const sanitized = sanitizeErrorMessage(err);
    return NextResponse.json<CourseAnalysisResponse>({
      courseModel: BASELINE_DSA_COURSE,
      source: "baseline",
      message: "An unexpected error occurred during syllabus processing. Active baseline loaded.",
      error: sanitized,
    });
  }
}
