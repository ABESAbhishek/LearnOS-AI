const MAX_AI_RESPONSE_BYTES = 512 * 1024;

export async function readLimitedResponseText(response: Response, maxBytes = MAX_AI_RESPONSE_BYTES): Promise<string> {
  const declaredLength = Number(response.headers.get("content-length"));
  if (Number.isFinite(declaredLength) && declaredLength > maxBytes) {
    throw new Error("AI provider response exceeded the size limit.");
  }
  const reader = response.body?.getReader();
  if (!reader) throw new Error("AI provider response was empty.");

  const chunks: Uint8Array[] = [];
  let totalBytes = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      totalBytes += value.byteLength;
      if (totalBytes > maxBytes) {
        await reader.cancel().catch(() => {});
        throw new Error("AI provider response exceeded the size limit.");
      }
      chunks.push(value);
    }
  } finally {
    reader.releaseLock();
  }

  const bytes = new Uint8Array(totalBytes);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return new TextDecoder().decode(bytes);
}

export async function readLimitedResponseJSON(response: Response): Promise<unknown> {
  const text = await readLimitedResponseText(response);
  try {
    return JSON.parse(text) as unknown;
  } catch {
    throw new Error("AI provider returned invalid JSON.");
  }
}
