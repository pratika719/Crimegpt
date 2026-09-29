import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Serialize server-side data (Prisma rows, Date instances, class instances)
 * into a plain JSON-serializable value safe for Next.js client components
 * and server action responses.
 */
export function toClient<T>(value: T): T {
  if (value === undefined) return undefined as unknown as T;
  if (value === null) return null as unknown as T;
  try {
    return JSON.parse(JSON.stringify(value)) as T;
  } catch (err) {
    console.error("[toClient serialization warning]:", err);
    return value;
  }
}
