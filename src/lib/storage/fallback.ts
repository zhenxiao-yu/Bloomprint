/**
 * Runs a cloud operation, and on any failure surfaces a non-blocking warning and falls back to the
 * local equivalent. This is the heart of the hybrid behavior: the cloud never blocks the app
 * (docs/DECISIONS.md D11/D12).
 */
export type FallbackHandler = (error: unknown) => void;

export async function withFallback<T>(
  cloud: () => Promise<T>,
  local: () => Promise<T>,
  onFallback?: FallbackHandler,
): Promise<T> {
  try {
    return await cloud();
  } catch (error) {
    onFallback?.(error);
    return local();
  }
}
