export class AITimeoutError extends Error {
  constructor(message = "AI operations timed out.") {
    super(message);
    this.name = "AITimeoutError";
  }
}

export async function withAITimeout<T>(
  promiseFn: (signal: AbortSignal) => Promise<T>,
  timeoutMs = 45000
): Promise<T> {
  const controller = new AbortController();
  
  const timeoutId = setTimeout(() => {
    controller.abort();
  }, timeoutMs);

  try {
    const response = await promiseFn(controller.signal);
    return response;
  } catch (error: any) {
    if (controller.signal.aborted || error?.name === "AbortError" || error?.message?.includes("aborted")) {
      throw new AITimeoutError();
    }
    throw error;
  } finally {
    clearTimeout(timeoutId);
  }
}
