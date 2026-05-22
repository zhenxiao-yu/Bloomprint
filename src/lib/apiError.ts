export async function readApiError(response: Response, fallback: string): Promise<string> {
  try {
    const data = (await response.json()) as { error?: unknown };
    if (typeof data.error === "string" && data.error.trim()) return data.error;
  } catch {
    // Non-JSON failures still get a stable product message.
  }
  if (response.status >= 500) return "Bloomprint is temporarily unavailable. Try again in a moment.";
  return fallback;
}
