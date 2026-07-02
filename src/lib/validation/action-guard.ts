import { ActionResponse, actionFailure } from "../action-response";

export async function validateActionInput<TOutput, TResult>(
  schema: { safeParse: (input: any) => { success: true; data: TOutput } | { success: false; error: any } },
  input: any,
  handler: (data: TOutput) => Promise<ActionResponse<TResult>>
): Promise<ActionResponse<TResult>> {
  const result = schema.safeParse(input);
  if (!result.success) {
    const fieldErrors = result.error.flatten().fieldErrors as Record<string, string[] | undefined>;
    const formattedErrors: Record<string, string[]> = {};
    for (const [key, value] of Object.entries(fieldErrors)) {
      if (value) {
        formattedErrors[key] = value;
      }
    }
    return actionFailure(
      "VALIDATION_ERROR",
      "Validation failed",
      formattedErrors
    );
  }
  try {
    return await handler(result.data);
  } catch (error: any) {
    if (error?.name === "AITimeoutError" || error?.message?.includes("timed out")) {
      return actionFailure("AI_TIMEOUT", error.message || "AI operation timed out");
    }
    if (error?.name === "AIProviderError") {
      return actionFailure("AI_PROVIDER_ERROR", error.message || "AI provider error");
    }
    return actionFailure(
      "INTERNAL_ERROR",
      error?.message || "An unexpected error occurred"
    );
  }
}
