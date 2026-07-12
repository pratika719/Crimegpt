import { GeminiTextProvider } from "./gemini-text-provider";

// Compatibility export for older non-production scripts. Application code
// obtains providers through provider-factory.ts.
export { GeminiTextProvider as GeminiProvider };

export const geminiProvider = new GeminiTextProvider();
export default geminiProvider;
