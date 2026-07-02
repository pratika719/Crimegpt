export type ErrorCode =
  | "VALIDATION_ERROR"
  | "UNAUTHORIZED"
  | "FORBIDDEN"
  | "NOT_FOUND"
  | "CONFLICT"
  | "INTERNAL_ERROR"
  | "AI_PROVIDER_ERROR"
  | "AI_TIMEOUT";

export type ActionSuccess<T> = {
  success: true;
// eslint-disable-next-line @typescript-eslint/no-empty-object-type
} & (T extends void ? {} : T);

export interface ActionFailure {
  success: false;
  message: string;
  error: {
    code: ErrorCode;
    message: string;
    fields?: Record<string, string[]>;
  };
}

export type ActionResponse<T = void> = ActionSuccess<T> | ActionFailure;

export function actionSuccess(): ActionSuccess<void>;
export function actionSuccess<T>(data: T): ActionSuccess<T>;
export function actionSuccess<T>(data?: T): ActionSuccess<T> {
  return {
    success: true,
    ...(data as any),
  } as ActionSuccess<T>;
}

export function actionFailure(
  code: ErrorCode,
  message: string,
  fields?: Record<string, string[]>
): ActionFailure {
  return {
    success: false,
    message,
    error: {
      code,
      message,
      fields,
    },
  };
}
