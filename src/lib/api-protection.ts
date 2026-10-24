export class RequestBodyError extends Error {
  readonly status: 400 | 413;

  constructor(message: string, status: 400 | 413 = 400) {
    super(message);
    this.name = "RequestBodyError";
    this.status = status;
  }
}

export interface APIProtectionOptions {
  key: string;
  limit: number;
  windowMs?: number;
  maxBodyBytes: number;
  now?: number;
}

export interface APIProtectionFailure {
  status: 403 | 413 | 429;
  message: string;
  retryAfterSeconds?: number;
}

type WindowEntry = { count: number; expiresAt: number };
const requestWindows = new Map<string, WindowEntry>();
const MAX_WINDOW_ENTRIES = 2_000;

/** Best-effort same-origin check; it is not an authentication mechanism. */
export function protectAPIRequest(
  request: Request,
  options: APIProtectionOptions,
): APIProtectionFailure | null {
  const declaredLength = Number(request.headers.get("content-length"));
  if (Number.isFinite(declaredLength) && declaredLength > options.maxBodyBytes) {
    return { status: 413, message: "Request is too large." };
  }

  const origin = request.headers.get("origin");
  if (origin) {
    try {
      if (new URL(origin).origin !== new URL(request.url).origin) {
        return { status: 403, message: "This request is not allowed." };
      }
    } catch {
      return { status: 403, message: "This request is not allowed." };
    }
  }

  const forwardedFor = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  const client = forwardedFor || "local";
  const now = options.now ?? Date.now();
  const windowMs = options.windowMs ?? 60_000;
  const bucketKey = `${options.key}:${client}`;
  let entry = requestWindows.get(bucketKey);
  if (!entry || entry.expiresAt <= now) {
    entry = { count: 0, expiresAt: now + windowMs };
    requestWindows.set(bucketKey, entry);
  }
  entry.count += 1;

  if (requestWindows.size > MAX_WINDOW_ENTRIES) {
    for (const [key, value] of requestWindows) {
      if (value.expiresAt <= now || requestWindows.size > MAX_WINDOW_ENTRIES) requestWindows.delete(key);
    }
  }

  if (entry.count > options.limit) {
    return {
      status: 429,
      message: "Too many requests. Please wait a moment and try again.",
      retryAfterSeconds: Math.max(1, Math.ceil((entry.expiresAt - now) / 1_000)),
    };
  }
  return null;
}

/**
 * Reads a JSON request with both Content-Length and streamed byte limits.
 * The stream limit applies when Content-Length is absent or untrusted.
 */
export async function readLimitedJSON(request: Request, maxBytes: number): Promise<unknown> {
  const contentType = request.headers.get("content-type") || "";
  if (!contentType.toLowerCase().includes("application/json")) {
    throw new RequestBodyError("Expected a JSON request.");
  }
  const declaredLength = Number(request.headers.get("content-length"));
  if (Number.isFinite(declaredLength) && declaredLength > maxBytes) {
    throw new RequestBodyError("Request is too large.", 413);
  }

  const body = await readLimitedBody(request, maxBytes);
  try {
    return JSON.parse(new TextDecoder().decode(body)) as unknown;
  } catch {
    throw new RequestBodyError("Request body is invalid.");
  }
}

export async function readLimitedFormData(request: Request, maxBytes: number): Promise<FormData> {
  const contentType = request.headers.get("content-type") || "";
  if (!contentType.toLowerCase().includes("multipart/form-data")) {
    throw new RequestBodyError("Expected a multipart form request.");
  }
  const body = await readLimitedBody(request, maxBytes);
  try {
    const headers = new Headers(request.headers);
    headers.delete("content-length");
    headers.delete("transfer-encoding");
    const rebuilt = new Request(request.url, {
      method: "POST",
      headers,
      body: body.buffer.slice(body.byteOffset, body.byteOffset + body.byteLength) as ArrayBuffer,
    });
    return await rebuilt.formData();
  } catch {
    throw new RequestBodyError("Request body is invalid.");
  }
}

async function readLimitedBody(request: Request, maxBytes: number): Promise<Uint8Array> {
  const declaredLength = Number(request.headers.get("content-length"));
  if (Number.isFinite(declaredLength) && declaredLength > maxBytes) {
    throw new RequestBodyError("Request is too large.", 413);
  }
  const reader = request.body?.getReader();
  if (!reader) throw new RequestBodyError("Request body is missing.");
  const chunks: Uint8Array[] = [];
  let totalBytes = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      totalBytes += value.byteLength;
      if (totalBytes > maxBytes) {
        await reader.cancel().catch(() => {});
        throw new RequestBodyError("Request is too large.", 413);
      }
      chunks.push(value);
    }
  } finally {
    reader.releaseLock();
  }

  const body = new Uint8Array(totalBytes);
  let offset = 0;
  for (const chunk of chunks) {
    body.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return body;
}

export function resetRateLimitWindowsForTests(): void {
  requestWindows.clear();
}
