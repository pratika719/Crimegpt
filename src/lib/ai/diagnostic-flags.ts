function readBooleanFlag(name: string, defaultValue: boolean): boolean {
  const value = process.env[name];
  if (value === undefined) return defaultValue;
  return value.trim().toLowerCase() !== "false";
}

export const diagnosticFlags = {
  useLegalRetrieval: () => readBooleanFlag("AI_USE_LEGAL_RETRIEVAL", true),
  useEmbeddings: () => readBooleanFlag("AI_USE_EMBEDDINGS", true),
  useFallback: () => readBooleanFlag("AI_USE_FALLBACK", true),
  useCache: () => readBooleanFlag("AI_USE_CACHE", true),
};
