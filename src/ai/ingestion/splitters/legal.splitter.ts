import { RecursiveCharacterTextSplitter } from "@langchain/textsplitters";
import { Document } from "@langchain/core/documents";

// Initialize the reusable splitter instance with requested chunk parameters
export const legalSplitter = new RecursiveCharacterTextSplitter({
  chunkSize: 1000,
  chunkOverlap: 200,
});

/**
 * Splits an array of LangChain Documents using the configured legalSplitter.
 * 
 * @param documents The list of documents to be split.
 * @returns A promise resolving to an array of chunked Documents.
 */
export async function splitLegalDocuments(documents: Document[]): Promise<Document[]> {
  try {
    if (!documents || documents.length === 0) {
      return [];
    }
    return await legalSplitter.splitDocuments(documents);
  } catch (error) {
    console.error("Error splitting legal documents:", error);
    throw error;
  }
}
