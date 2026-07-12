import { InvalidAIResponseError } from "@/lib/error/ai-provider-error";

function stripSingleFence(value: string): string {
  const match = value.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/i);
  return match?.[1]?.trim() ?? value;
}

function escapeRawNewlinesInJSONStrings(value: string): string {
  let result = "";
  let inString = false;
  let escaped = false;

  for (let i = 0; i < value.length; i++) {
    const char = value[i];

    if (inString) {
      if (escaped) {
        result += char;
        escaped = false;
      } else if (char === "\\") {
        result += char;
        escaped = true;
      } else if (char === '"') {
        result += char;
        inString = false;
      } else if (char === "\n") {
        result += "\\n";
      } else if (char === "\r") {
        if (value[i + 1] === "\n") {
          result += "\\n";
          i++; // skip \n
        } else {
          result += "\\n";
        }
      } else {
        result += char;
      }
    } else {
      result += char;
      if (char === '"') {
        inString = true;
      }
    }
  }
  return result;
}

function isolateCompleteJSON(value: string): string | null {
  const start = [...value].findIndex((character) => character === "{" || character === "[");
  if (start < 0) return null;

  const opening = value[start];
  const expectedClosing = opening === "{" ? "}" : "]";
  const stack: string[] = [];
  let inString = false;
  let escaped = false;

  for (let index = start; index < value.length; index += 1) {
    const character = value[index];
    if (inString) {
      if (escaped) escaped = false;
      else if (character === "\\") escaped = true;
      else if (character === '"') inString = false;
      continue;
    }

    if (character === '"') {
      inString = true;
    } else if (character === "{" || character === "[") {
      stack.push(character);
    } else if (character === "}" || character === "]") {
      const last = stack.pop();
      if ((last === "{" && character !== "}") || (last === "[" && character !== "]")) return null;
      if (stack.length === 0) {
        return character === expectedClosing ? value.slice(start, index + 1) : null;
      }
    }
  }
  return null;
}

export function extractJSONFromLLMResponse<T>(text: string): T {
  const trimmed = stripSingleFence(text.trim());
  const escapedTrimmed = escapeRawNewlinesInJSONStrings(trimmed);
  try {
    return JSON.parse(escapedTrimmed) as T;
  } catch {
    const isolated = isolateCompleteJSON(trimmed);
    if (isolated) {
      const escapedIsolated = escapeRawNewlinesInJSONStrings(isolated);
      try {
        return JSON.parse(escapedIsolated) as T;
      } catch {
        // Fall through to the safe domain error below.
      }
    }
  }

  throw new InvalidAIResponseError({
    safeDetails: { responseLength: text.length },
  });
}
