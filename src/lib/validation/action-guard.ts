import { ActionResponse, actionFailure } from "../action-response";
// NOTE: keep `auth` as the only dependency outside this folder — nothing in the
// auth module graph may import this file (would create a runtime circular import).
import { auth } from "@/auth";

/**
 * Thrown by {@link requireUser} when no authenticated session is present.
 * `validateActionInput` maps it to an `UNAUTHORIZED` failure.
 */
export class UnauthorizedError extends Error {
  constructor() {
    super("Unauthorized");
    this.name = "UnauthorizedError";
  }
}

/**
 * Resolve the authenticated user id inside a server action.
 *
 * Usage: `const userId = await requireUser();`
 */
export async function requireUser(): Promise<string> {
  const session = await auth();
  if (!session?.user?.id) {
    throw new UnauthorizedError();
  }
  return session.user.id;
}

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
    if (error instanceof UnauthorizedError) {
      return actionFailure("UNAUTHORIZED", error.message);
    }
    return actionFailure(
      "INTERNAL_ERROR",
      error?.message || "An unexpected error occurred"
    );
  }
}
