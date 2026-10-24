export const MAX_ANALYSIS_FILES = 3;
export const MAX_ANALYSIS_UPLOAD_BYTES = 10 * 1024 * 1024;
export const MAX_ANALYSIS_REQUEST_BYTES = MAX_ANALYSIS_UPLOAD_BYTES + 64 * 1024;

export interface UploadFileMetadata {
  name: string;
  size: number;
  type?: string;
}

export interface UploadValidationFailure {
  status: 400 | 413 | 415;
  message: string;
}

/** Validates cheap file metadata before buffering or parsing user uploads. */
export function validateDocumentUploadBatch(files: readonly UploadFileMetadata[]): UploadValidationFailure | null {
  if (!files.length) return { status: 400, message: "Select one or more PDF or TXT documents." };
  if (files.length > MAX_ANALYSIS_FILES) return { status: 413, message: `Upload no more than ${MAX_ANALYSIS_FILES} files per analysis.` };
  if (files.some((file) => !Number.isFinite(file.size) || file.size <= 0)) return { status: 400, message: "One of the selected files is empty." };
  if (files.reduce((total, file) => total + file.size, 0) > MAX_ANALYSIS_UPLOAD_BYTES) {
    return { status: 413, message: "The combined file size exceeds the 10 MB limit." };
  }

  for (const file of files) {
    const lowerName = file.name.toLocaleLowerCase();
    if (lowerName.endsWith(".pdf")) {
      if (file.type && !["application/pdf", "application/octet-stream"].includes(file.type)) {
        return { status: 415, message: "The PDF file MIME type does not match its extension." };
      }
    } else if (lowerName.endsWith(".txt")) {
      if (file.type && !["text/plain", "application/octet-stream"].includes(file.type)) {
        return { status: 415, message: "The TXT file MIME type does not match its extension." };
      }
    } else {
      return { status: 415, message: "LearnOS supports PDF and UTF-8 TXT files." };
    }
  }
  return null;
}
