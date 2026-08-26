import fs from "fs";
import path from "path";
import csv from "csv-parser";

import { Document } from "@langchain/core/documents";

type IPCRow = {
  Description: string;
  Offense: string;
  Punishment: string;
  Section: string;
};

export async function loadIPCDocuments(): Promise<Document[]> {
  const documents: Document[] = [];

  const filePath = path.join(
    process.cwd(),
    "src",
    "data",
    "ipc_sections.csv"
  );

  return new Promise((resolve, reject) => {
    fs.createReadStream(filePath)
      .pipe(csv())
      .on("data", (row: IPCRow) => {
        try {
          const rawSection = String(row.Section || "").trim();
          const rawOffense = String(row.Offense || "").trim();
          const rawPunishment = String(row.Punishment || "").trim();
          const rawDescription = String(row.Description || "").trim();

          const cleanOffense = !rawOffense || rawOffense.toLowerCase() === "nan" ? rawSection : rawOffense;
          const cleanPunishment = !rawPunishment || rawPunishment.toLowerCase() === "nan" ? "As prescribed under statutory provisions." : rawPunishment;
          const cleanDescription = !rawDescription || rawDescription.toLowerCase() === "nan" ? `IPC Section ${rawSection}: ${cleanOffense}` : rawDescription;

          const document = new Document({
            pageContent: `
IPC Section: ${rawSection}

Offense:
${cleanOffense}

Punishment:
${cleanPunishment}

Description:
${cleanDescription}
            `.trim(),

            metadata: {
              section: rawSection,
              offense: cleanOffense,
              punishment: cleanPunishment,
              source: "IPC",
            },
          });

          documents.push(document);
        } catch (error) {
          console.error(
            `Failed to process section ${row.Section}`,
            error
          );
        }
      })
      .on("end", () => {
        console.log(
          `✅ Loaded ${documents.length} IPC sections`
        );

        resolve(documents);
      })
      .on("error", (error) => {
        reject(error);
      });
  });
}