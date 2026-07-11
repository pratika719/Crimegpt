export function createSafeJobId(
  parts: Array<string | number | boolean | undefined | null>,
): string {
  return parts
    .filter((part) => part !== undefined && part !== null)
    .map((part) =>
      String(part)
        .replace(/:/g, "__")
        .replace(/\s+/g, "_")
        .replace(/[^a-zA-Z0-9._-]/g, "_"),
    )
    .join("__");
}